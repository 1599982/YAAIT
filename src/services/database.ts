interface LandmarkData {
	x: number;
	y: number;
	z: number;
}

interface TrainingRecord {
	id?: number;
	category: string; // 'Numeros', 'Vocales', 'Abecedario', 'Palabras'
	element: string | number; // The specific element being trained (A, 1, etc.)
	landmarks: LandmarkData[];
	timestamp: number;
	sessionId: string;
}

interface DatabaseStats {
	category: string;
	element: string | number;
	count: number;
}

class HandLandmarksDatabase {
	private dbName = "HandLandmarksDB";
	private version = 1;
	private db: IDBDatabase | null = null;

	constructor() {
		this.initDB().then(() => {
			// Auto-load database from public file after initialization
			this.loadDatabaseFromPublicFile().catch(error => {
				console.warn("⚠️ [DB] Auto-load failed, continuing with empty database:", error);
			});
		});
	}

	private async initDB(): Promise<void> {
		return new Promise((resolve, reject) => {
			const request = indexedDB.open(this.dbName, this.version);

			request.onerror = () => {
				console.error("❌ [DB] Error opening database:", request.error);
				reject(request.error);
			};

			request.onsuccess = () => {
				this.db = request.result;
				console.log("✅ [DB] Database opened successfully");
				console.log(
					"🔍 [DB] Available object stores:",
					Array.from(this.db.objectStoreNames),
				);
				resolve();
			};

			request.onupgradeneeded = (event) => {
				console.log("🔄 [DB] Database upgrade needed");
				const db = (event.target as IDBOpenDBRequest).result;

				// Delete existing object store if it exists (for clean recreation)
				if (db.objectStoreNames.contains("trainingData")) {
					console.log("🗑️ [DB] Removing existing trainingData store");
					db.deleteObjectStore("trainingData");
				}

				// Create object store for training data
				console.log("🏗️ [DB] Creating trainingData object store");
				const store = db.createObjectStore("trainingData", {
					keyPath: "id",
					autoIncrement: true,
				});

				// Create indexes for efficient querying
				console.log("📇 [DB] Creating indexes");
				store.createIndex("category", "category", { unique: false });
				store.createIndex("element", "element", { unique: false });
				store.createIndex("categoryElement", ["category", "element"], {
					unique: false,
				});
				store.createIndex("timestamp", "timestamp", { unique: false });
				store.createIndex("sessionId", "sessionId", { unique: false });

				console.log("✅ [DB] Database schema created/updated successfully");
			};
		});
	}

	async ensureDB(): Promise<void> {
		if (!this.db) {
			console.log("🔌 [DB] Database not initialized, initializing...");
			await this.initDB();
		}

		// Verify object store exists
		if (this.db && !this.db.objectStoreNames.contains("trainingData")) {
			console.error(
				"❌ [DB] trainingData object store not found, reinitializing database",
			);
			this.db.close();
			this.db = null;

			// Delete and recreate database
			await this.deleteDatabase();
			await this.initDB();
		}
	}

	async saveTrainingData(
		category: string,
		element: string | number,
		landmarks: LandmarkData[],
		sessionId: string,
	): Promise<number> {
		console.log(
			`💾 [DB] Iniciando guardado - Category: ${category}, Element: ${element}, Landmarks: ${landmarks.length}, SessionId: ${sessionId}`,
		);

		await this.ensureDB();

		return new Promise((resolve, reject) => {
			if (!this.db) {
				console.error("❌ [DB] Database not initialized");
				reject(new Error("Database not initialized"));
				return;
			}

			console.log(`🔄 [DB] Creating transaction for saving data`);
			const transaction = this.db.transaction(["trainingData"], "readwrite");
			const store = transaction.objectStore("trainingData");

			const normalizedLandmarks = this.normalizeLandmarks(landmarks);
			console.log(
				`🔧 [DB] Normalized ${landmarks.length} landmarks to ${normalizedLandmarks.length} points`,
			);

			const record: TrainingRecord = {
				category,
				element,
				landmarks: normalizedLandmarks,
				timestamp: Date.now(),
				sessionId,
			};

			console.log(`📝 [DB] Creating record:`, {
				category: record.category,
				element: record.element,
				landmarksCount: record.landmarks.length,
				timestamp: record.timestamp,
				sessionId: record.sessionId,
			});

			const request = store.add(record);

			request.onsuccess = () => {
				console.log(
					`✅ [DB] Successfully saved training data for ${category}-${element}. Record ID: ${request.result}`,
				);
				resolve(request.result as number);
			};

			request.onerror = () => {
				console.error("❌ [DB] Error saving training data:", request.error);
				reject(request.error);
			};

			transaction.oncomplete = () => {
				console.log(
					`🎉 [DB] Transaction completed successfully for ${category}-${element}`,
				);
			};

			transaction.onerror = () => {
				console.error("❌ [DB] Transaction failed:", transaction.error);
			};
		});
	}

	private normalizeLandmarks(landmarks: LandmarkData[]): LandmarkData[] {
		console.log(`🔧 [DB] Normalizing ${landmarks.length} landmarks`);

		if (landmarks.length === 0) {
			console.warn("⚠️ [DB] No landmarks to normalize");
			return [];
		}

		// Find bounding box
		let minX = landmarks[0].x,
			maxX = landmarks[0].x;
		let minY = landmarks[0].y,
			maxY = landmarks[0].y;
		let minZ = landmarks[0].z,
			maxZ = landmarks[0].z;

		landmarks.forEach((landmark) => {
			minX = Math.min(minX, landmark.x);
			maxX = Math.max(maxX, landmark.x);
			minY = Math.min(minY, landmark.y);
			maxY = Math.max(maxY, landmark.y);
			minZ = Math.min(minZ, landmark.z);
			maxZ = Math.max(maxZ, landmark.z);
		});

		// Normalize to [0, 1] range
		const rangeX = maxX - minX || 1;
		const rangeY = maxY - minY || 1;
		const rangeZ = maxZ - minZ || 1;

		console.log(
			`📏 [DB] Bounding box - X: [${minX.toFixed(3)}, ${maxX.toFixed(3)}], Y: [${minY.toFixed(3)}, ${maxY.toFixed(3)}], Z: [${minZ.toFixed(3)}, ${maxZ.toFixed(3)}]`,
		);

		const normalized = landmarks.map((landmark) => ({
			x: (landmark.x - minX) / rangeX,
			y: (landmark.y - minY) / rangeY,
			z: (landmark.z - minZ) / rangeZ,
		}));

		console.log(
			`✅ [DB] Normalization completed. First normalized point:`,
			normalized[0],
		);

		return normalized;
	}

	async getTrainingData(
		category?: string,
		element?: string | number,
	): Promise<TrainingRecord[]> {
		await this.ensureDB();

		return new Promise((resolve, reject) => {
			if (!this.db) {
				reject(new Error("Database not initialized"));
				return;
			}

			const transaction = this.db.transaction(["trainingData"], "readonly");
			const store = transaction.objectStore("trainingData");

			let request: IDBRequest;

			if (category && element !== undefined) {
				// Query by both category and element
				const index = store.index("categoryElement");
				request = index.getAll([category, element]);
			} else if (category) {
				// Query by category only
				const index = store.index("category");
				request = index.getAll(category);
			} else {
				// Get all records
				request = store.getAll();
			}

			request.onsuccess = () => {
				resolve(request.result || []);
			};

			request.onerror = () => {
				console.error("Error retrieving training data:", request.error);
				reject(request.error);
			};
		});
	}

	async getTrainingStats(): Promise<DatabaseStats[]> {
		await this.ensureDB();

		return new Promise((resolve, reject) => {
			if (!this.db) {
				reject(new Error("Database not initialized"));
				return;
			}

			const transaction = this.db.transaction(["trainingData"], "readonly");
			const store = transaction.objectStore("trainingData");
			const request = store.getAll();

			request.onsuccess = () => {
				const records: TrainingRecord[] = request.result || [];

				// Group by category and element, count occurrences
				const statsMap = new Map<string, DatabaseStats>();

				records.forEach((record) => {
					const key = `${record.category}-${record.element}`;
					if (statsMap.has(key)) {
						statsMap.get(key)!.count++;
					} else {
						statsMap.set(key, {
							category: record.category,
							element: record.element,
							count: 1,
						});
					}
				});

				resolve(Array.from(statsMap.values()));
			};

			request.onerror = () => {
				console.error("Error retrieving training stats:", request.error);
				reject(request.error);
			};
		});
	}

	async deleteTrainingData(
		category?: string,
		element?: string | number,
	): Promise<void> {
		await this.ensureDB();

		return new Promise((resolve, reject) => {
			if (!this.db) {
				reject(new Error("Database not initialized"));
				return;
			}

			const transaction = this.db.transaction(["trainingData"], "readwrite");
			const store = transaction.objectStore("trainingData");

			if (category && element !== undefined) {
				// Delete specific category-element combination
				const index = store.index("categoryElement");
				const request = index.openCursor([category, element]);

				request.onsuccess = () => {
					const cursor = request.result;
					if (cursor) {
						cursor.delete();
						cursor.continue();
					}
				};
			} else if (category) {
				// Delete all records for a category
				const index = store.index("category");
				const request = index.openCursor(category);

				request.onsuccess = () => {
					const cursor = request.result;
					if (cursor) {
						cursor.delete();
						cursor.continue();
					}
				};
			} else {
				// Clear all data
				store.clear();
			}

			transaction.oncomplete = () => {
				console.log("Training data deleted successfully");
				resolve();
			};

			transaction.onerror = () => {
				console.error("Error deleting training data:", transaction.error);
				reject(transaction.error);
			};
		});
	}

	async getDatabaseSize(): Promise<number> {
		await this.ensureDB();

		return new Promise((resolve, reject) => {
			if (!this.db) {
				reject(new Error("Database not initialized"));
				return;
			}

			const transaction = this.db.transaction(["trainingData"], "readonly");
			const store = transaction.objectStore("trainingData");
			const request = store.count();

			request.onsuccess = () => {
				resolve(request.result);
			};

			request.onerror = () => {
				console.error("Error getting database size:", request.error);
				reject(request.error);
			};
		});
	}

	generateSessionId(): string {
		return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	}

	async deleteDatabase(): Promise<void> {
		return new Promise((resolve, reject) => {
			console.log("🗑️ [DB] Deleting database for recreation");
			const deleteRequest = indexedDB.deleteDatabase(this.dbName);

			deleteRequest.onsuccess = () => {
				console.log("✅ [DB] Database deleted successfully");
				resolve();
			};

			deleteRequest.onerror = () => {
				console.error("❌ [DB] Error deleting database:", deleteRequest.error);
				reject(deleteRequest.error);
			};

			deleteRequest.onblocked = () => {
				console.warn("⚠️ [DB] Database deletion blocked");
			};
		});
	}

	async verifyDatabaseStatus(): Promise<{
		isValid: boolean;
		objectStores: string[];
		error?: string;
	}> {
		try {
			await this.ensureDB();

			if (!this.db) {
				return {
					isValid: false,
					objectStores: [],
					error: "Database not initialized",
				};
			}

			const objectStores = Array.from(this.db.objectStoreNames);
			const hasTrainingData = objectStores.includes("trainingData");

			console.log("🔍 [DB] Database status check:", {
				isValid: hasTrainingData,
				objectStores,
				version: this.db.version,
			});

			return {
				isValid: hasTrainingData,
				objectStores,
				error: hasTrainingData
					? undefined
					: "trainingData object store missing",
			};
		} catch (error) {
			console.error("❌ [DB] Error verifying database status:", error);
			return { isValid: false, objectStores: [], error: String(error) };
		}
	}

	async exportDatabase(): Promise<string> {
		console.log("📤 [DB] Starting database export...");
		await this.ensureDB();

		try {
			// Get all training data
			const allData = await this.getTrainingData();
			
			// Create export object with metadata
			const exportData = {
				version: this.version,
				exportDate: new Date().toISOString(),
				dbName: this.dbName,
				totalRecords: allData.length,
				data: allData
			};

			console.log(`✅ [DB] Export completed: ${allData.length} records`);
			return JSON.stringify(exportData, null, 2);
		} catch (error) {
			console.error("❌ [DB] Error exporting database:", error);
			throw error;
		}
	}

	async downloadDatabase(): Promise<void> {
		try {
			const exportData = await this.exportDatabase();
			
			// Create blob and download
			const blob = new Blob([exportData], { type: 'application/json' });
			const url = URL.createObjectURL(blob);
			
			const a = document.createElement('a');
			a.href = url;
			a.download = `yaait-database-${new Date().toISOString().split('T')[0]}.json`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			
			URL.revokeObjectURL(url);
			console.log("✅ [DB] Database downloaded successfully");
		} catch (error) {
			console.error("❌ [DB] Error downloading database:", error);
			throw error;
		}
	}

	async importDatabase(jsonData: string): Promise<{
		success: boolean;
		imported: number;
		error?: string;
	}> {
		console.log("📥 [DB] Starting database import...");
		
		try {
			const importData = JSON.parse(jsonData);
			
			// Validate import data structure
			if (!importData.data || !Array.isArray(importData.data)) {
				throw new Error("Invalid import data format");
			}

			console.log(`🔍 [DB] Import data validation:`, {
				version: importData.version,
				exportDate: importData.exportDate,
				totalRecords: importData.totalRecords,
				actualRecords: importData.data.length
			});

			await this.ensureDB();

			// Clear existing data (optional - you might want to merge instead)
			await this.deleteTrainingData();
			console.log("🗑️ [DB] Cleared existing data");

			// Import records one by one
			let importedCount = 0;
			for (const record of importData.data) {
				try {
					// Remove the id field to let IndexedDB auto-generate new ones
					const { id, ...recordWithoutId } = record;
					
					await new Promise<void>((resolve, reject) => {
						if (!this.db) {
							reject(new Error("Database not initialized"));
							return;
						}

						const transaction = this.db.transaction(["trainingData"], "readwrite");
						const store = transaction.objectStore("trainingData");
						const request = store.add(recordWithoutId);

						request.onsuccess = () => {
							importedCount++;
							resolve();
						};

						request.onerror = () => {
							console.warn(`⚠️ [DB] Failed to import record:`, record);
							resolve(); // Continue with other records
						};
					});
				} catch (error) {
					console.warn(`⚠️ [DB] Error importing record:`, error);
				}
			}

			console.log(`✅ [DB] Import completed: ${importedCount}/${importData.data.length} records imported`);
			
			return {
				success: true,
				imported: importedCount
			};

		} catch (error) {
			console.error("❌ [DB] Error importing database:", error);
			return {
				success: false,
				imported: 0,
				error: String(error)
			};
		}
	}

	async importFromFile(file: File): Promise<{
		success: boolean;
		imported: number;
		error?: string;
	}> {
		return new Promise((resolve) => {
			const reader = new FileReader();
			
			reader.onload = async (e) => {
				try {
					const jsonData = e.target?.result as string;
					const result = await this.importDatabase(jsonData);
					resolve(result);
				} catch (error) {
					console.error("❌ [DB] Error reading file:", error);
					resolve({
						success: false,
						imported: 0,
						error: String(error)
					});
				}
			};

			reader.onerror = () => {
				resolve({
					success: false,
					imported: 0,
					error: "Error reading file"
				});
			};

			reader.readAsText(file);
		});
	}

	async loadDatabaseFromPublicFile(): Promise<{
		success: boolean;
		imported: number;
		error?: string;
	}> {
		console.log("🔄 [DB] Loading database from public file...");
		
		try {
			// Check if database already has data
			const currentSize = await this.getDatabaseSize();
			if (currentSize > 0) {
				console.log(`📊 [DB] Database already has ${currentSize} records, skipping auto-load`);
				return {
					success: true,
					imported: 0,
					error: "Database already populated"
				};
			}

			// Fetch the JSON file from public folder
			const response = await fetch('/yaait-database-2025-09-29.json');
			
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const jsonData = await response.text();
			console.log("📥 [DB] Successfully fetched database file");

			// Import the data
			const result = await this.importDatabase(jsonData);
			
			if (result.success) {
				console.log(`✅ [DB] Auto-loaded ${result.imported} records from public file`);
			}

			return result;

		} catch (error) {
			console.error("❌ [DB] Error loading database from public file:", error);
			return {
				success: false,
				imported: 0,
				error: String(error)
			};
		}
	}
}

// Create singleton instance
const handLandmarksDB = new HandLandmarksDatabase();

export default handLandmarksDB;
export type { TrainingRecord, DatabaseStats, LandmarkData };

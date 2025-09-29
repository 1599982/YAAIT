import { useState, useEffect, useCallback, useRef } from 'react';
import PageMeta from "../../components/common/PageMeta";
import Button from "../../components/ui/button/Button";
import HandCamera from "../../components/camera/HandCamera";
import handLandmarksDB from "../../services/database";
import { ArrowUpIcon } from "../../icons";
import Badge from "../../components/ui/badge/Badge";

type TrainingProps = {
	type: string;
	arr: (number | string)[];
	op?: boolean;
};

export default function Predict({type, arr=[], op=false}: TrainingProps) {
	const [currentPrediction, setCurrentPrediction] = useState<string | number>('');
	const [confidence, setConfidence] = useState(0);
	const [predictionHistory, setPredictionHistory] = useState<Array<{prediction: string | number, confidence: number, timestamp: number}>>([]);
	const [availableData, setAvailableData] = useState<Array<{element: string | number, count: number}>>([]);
	const [handDetected, setHandDetected] = useState(false);
	const [rightHandDetected, setRightHandDetected] = useState(false);
	const [leftHandOpen, setLeftHandOpen] = useState(false);
	const [formedText, setFormedText] = useState('');
	const [pendingElement, setPendingElement] = useState('');
	const [lastLeftHandState, setLastLeftHandState] = useState<boolean | null>(null);
	const [canInsert, setCanInsert] = useState(true);
	const [hasInsertedInThisCycle, setHasInsertedInThisCycle] = useState(false);
	const hasInsertedRef = useRef(false);
	const [lastValidPrediction, setLastValidPrediction] = useState<{element: string | number, confidence: number} | null>(null);
	const validPredictionRef = useRef<{element: string | number, confidence: number} | null>(null);


	
	const ops = {
		"S": "+",
		"R": "-",
		"M": "x",
		"D": "/",
		"I": "="
	};
	let folder = "";

	if (type === "Numeros") {
		folder = "numbers";
	} else {
		folder = "letters";
	}

	const loadAvailableData = useCallback(async () => {
		try {
			const stats = await handLandmarksDB.getTrainingStats();
			const categoryData = stats
				.filter(stat => stat.category === type)
				.map(stat => ({ element: stat.element, count: stat.count }));
			setAvailableData(categoryData);
		} catch (error) {
			console.error('Error loading available data:', error);
		}
	}, [type]);

	useEffect(() => {
		loadAvailableData();
	}, [loadAvailableData]);

	// Reset prediction state when type changes
	useEffect(() => {
		setCurrentPrediction('');
		setConfidence(0);
		setPredictionHistory([]);
		setRightHandDetected(false);
		setLeftHandOpen(false);
		setFormedText('');
		setPendingElement('');
		setLastValidPrediction(null);
		validPredictionRef.current = null;
		setLastLeftHandState(null);
		setCanInsert(true);
		setHasInsertedInThisCycle(false);
		hasInsertedRef.current = false;
	}, [type]);

	// Reset right hand detection state when no right hand is detected
	useEffect(() => {
		const resetTimer = setTimeout(() => {
			setRightHandDetected(false);
		}, 500); // Increased timeout to avoid clearing too quickly

		return () => clearTimeout(resetTimer);
	}, [currentPrediction]);

	// Keep lastValidPrediction alive longer
	useEffect(() => {
		if (lastValidPrediction) {
			console.log(`🔒 [Predict] Keeping valid prediction alive: ${lastValidPrediction.element} (${lastValidPrediction.confidence.toFixed(1)}%)`);
			
			// Clear after 5 seconds of inactivity instead of immediately
			const clearTimer = setTimeout(() => {
				console.log(`🗑️ [Predict] Clearing old valid prediction after timeout`);
				setLastValidPrediction(null);
				validPredictionRef.current = null;
			}, 5000);

			return () => clearTimeout(clearTimer);
		}
	}, [lastValidPrediction]);

	const handleHandDetectionChange = useCallback((detected: boolean) => {
		setHandDetected(detected);
	}, []);

	const predictFromLandmarks = useCallback(async (currentLandmarks: Array<{ x: number; y: number; z: number }>) => {
		// Get all training data for this category
		const trainingData = await handLandmarksDB.getTrainingData(type);
		console.log(`🔍 [DEBUG] Training data for ${type}:`, trainingData.length, 'entries');
		
		if (trainingData.length === 0) {
			console.log(`❌ [Predict] No training data available for type: ${type}`);
			return null;
		}

		// Normalize current landmarks to vectors
		const currentVectors = landmarksToVectors(currentLandmarks);
		if (!currentVectors) return null;

		// Calculate confidence for each element by comparing with all samples
		const elementScores = new Map<string | number, { scores: number[], avgScore: number }>();
		
		for (const record of trainingData) {
			const recordVectors = landmarksToVectors(record.landmarks);
			if (!recordVectors) continue;

			const similarity = calculateVectorSimilarity(currentVectors, recordVectors);
			
			if (!elementScores.has(record.element)) {
				elementScores.set(record.element, { scores: [], avgScore: 0 });
			}
			
			elementScores.get(record.element)!.scores.push(similarity);
		}

		// Calculate average scores and find best match
		let bestMatch = { element: '', confidence: 0 };
		
		for (const [element, data] of elementScores) {
			// Use average of top 70% scores to reduce noise
			const sortedScores = data.scores.sort((a, b) => b - a);
			const topScores = sortedScores.slice(0, Math.ceil(sortedScores.length * 0.7));
			const avgScore = topScores.reduce((sum, score) => sum + score, 0) / topScores.length;
			
			if (avgScore > bestMatch.confidence) {
				bestMatch = {
					element: String(element),
					confidence: avgScore
				};
			}
		}

		// Only return prediction if confidence is above threshold
		if (bestMatch.confidence > 35) {
			return bestMatch;
		}
		
		return null;
	}, [type]);

	const handleLandmarksDetected = useCallback(async (landmarks: Array<{ x: number; y: number; z: number }>, handedness?: 'Left' | 'Right') => {
		console.log(`🖐️ [Predict] Hand detected - Handedness: ${handedness || 'undefined'}, Landmarks: ${landmarks.length}, hasInsertedInThisCycle: ${hasInsertedInThisCycle}`);
		
		if (landmarks.length > 0) {
			// RIGHT HAND: Element detection (letters/numbers) - PREDICCIÓN
			if (handedness === 'Right') {
				console.log(`👉 [Predict] Processing RIGHT hand for element detection`);
				setRightHandDetected(true);
				try {
					const prediction = await predictFromLandmarks(landmarks);
					console.log(`🔍 [DEBUG] Prediction result:`, prediction);
					
					if (prediction) {
						setCurrentPrediction(prediction.element);
						setConfidence(prediction.confidence);
						console.log(`👉 [Predict] RIGHT hand prediction: ${prediction.element} (${prediction.confidence.toFixed(1)}%)`);
						
						// Store as last valid prediction if confidence is good
						if (prediction.confidence >= 60) {
							const newPrediction = {
								element: prediction.element,
								confidence: prediction.confidence
							};
							
							if (!validPredictionRef.current || prediction.confidence > validPredictionRef.current.confidence) {
								validPredictionRef.current = newPrediction;
								setLastValidPrediction(newPrediction);
								console.log(`💾 [Predict] ✅ STORED valid prediction: ${prediction.element} (${prediction.confidence.toFixed(1)}%)`);
							} else {
								console.log(`📋 [Predict] Keeping existing better prediction: ${validPredictionRef.current.element} (${validPredictionRef.current.confidence.toFixed(1)}%) vs new: ${prediction.element} (${prediction.confidence.toFixed(1)}%)`);
							}
						} else {
							console.log(`📉 [Predict] Prediction confidence too low: ${prediction.confidence.toFixed(1)}% < 60%`);
						}
						
						// Add to history only for non-word-forming modes
						if (type !== 'Numeros' && type !== 'Abecedario') {
							setPredictionHistory(prev => [
								{ prediction: prediction.element, confidence: prediction.confidence, timestamp: Date.now() },
								...prev.slice(0, 9) // Keep last 10 predictions
							]);
						}
					} else {
						console.log(`❌ [Predict] No prediction returned from predictFromLandmarks`);
					}
				} catch (error) {
					console.error('❌ [Predict] Error making prediction:', error);
				}
			} else {
				console.log(`🔍 [DEBUG] Not processing RIGHT hand - handedness: ${handedness}`);
			}
			
			// LEFT HAND: Open/closed control - CONTROL
			if (handedness === 'Left') {
				console.log(`👈 [Predict] Processing LEFT hand for open/closed control`);
				const isOpen = detectHandOpenClosed(landmarks);
				console.log(`👈 [Predict] Left hand is ${isOpen ? 'OPEN' : 'CLOSED'}`);
				setLeftHandOpen(isOpen);
				
				// Detect hand state change (open -> closed)
				const wasOpen = lastLeftHandState;
				const currentValidPrediction = validPredictionRef.current;
				
				// Update hand state tracking
				setLastLeftHandState(isOpen);
				
				// Use ref for current cycle state
				const currentHasInserted = hasInsertedRef.current;
				
				// Log current state with more detail
				const handJustClosed = (wasOpen === true && !isOpen) || (wasOpen === null && !isOpen && currentValidPrediction);
				console.log(`🔍 [DEBUG] Hand state change detection:`, {
					wasOpen: wasOpen,
					isOpen: isOpen,
					explicitTransition: wasOpen === true && !isOpen,
					firstDetectionClosed: wasOpen === null && !isOpen && currentValidPrediction,
					handJustClosed: handJustClosed,
					hasValidPrediction: !!currentValidPrediction,
					canInsert: canInsert,
					hasInsertedInThisCycle: hasInsertedInThisCycle,
					currentHasInserted: currentHasInserted,
					validPredictionRef: currentValidPrediction,
					stateTransition: `${wasOpen} → ${isOpen}`,
					allConditionsMet: handJustClosed && currentValidPrediction && canInsert && !currentHasInserted && (type === 'Numeros' || type === 'Abecedario')
				});
				
				// If hand just closed (open -> closed) AND we have a valid prediction AND can insert AND haven't inserted in this cycle
				// Accept both: explicit transition (true -> false) OR first detection as closed with valid prediction
				if (handJustClosed && currentValidPrediction && canInsert && !currentHasInserted && (type === 'Numeros' || type === 'Abecedario')) {
					console.log(`🎯 [Predict] ✅ HAND CLOSED! Inserting element: ${currentValidPrediction.element}`);
					
					// Insert immediately
					setFormedText(prev => {
						const newText = prev + currentValidPrediction.element;
						console.log(`📝 [Predict] Text updated from "${prev}" to "${newText}"`);
						return newText;
					});
					
					// Mark as inserted in this cycle to prevent multiple insertions
					console.log(`🔄 [BEFORE] hasInsertedInThisCycle: ${currentHasInserted} → setting to true`);
					hasInsertedRef.current = true;
					setHasInsertedInThisCycle(true);
					console.log(`🚫 [Predict] Marked as inserted in this cycle - no more insertions until hand opens`);
					
					// Clear the used prediction
					validPredictionRef.current = null;
					setLastValidPrediction(null);
					console.log(`🏁 [Predict] Element inserted and prediction cleared`);
				}
				
				// Re-enable insertion when hand opens (from any previous state)
				console.log(`🔍 [RESET CHECK] isOpen: ${isOpen}, hasInsertedInThisCycle: ${hasInsertedInThisCycle}, currentHasInserted: ${currentHasInserted}, shouldReset: ${isOpen && currentHasInserted}`);
				if (isOpen && currentHasInserted) {
					console.log(`✅ [Predict] Hand opened - resetting insertion cycle`);
					console.log(`🔄 [BEFORE RESET] hasInsertedInThisCycle: ${currentHasInserted} → setting to false`);
					hasInsertedRef.current = false;
					setHasInsertedInThisCycle(false);
				}
				
				// Debug log for conditions
				if (!isOpen) {
					console.log(`🔍 [Predict] Left hand CLOSED - Checking conditions: Prediction: ${currentPrediction}, Confidence: ${confidence}%, Type: ${type}, CanInsert: ${canInsert}`);
				}
			}
			
			// SINGLE HAND MODE: Process as right hand for element detection
			if (!handedness) {
				console.log(`❓ [Predict] Single hand mode - treating as RIGHT hand`);
				try {
					const prediction = await predictFromLandmarks(landmarks);
					if (prediction) {
						setCurrentPrediction(prediction.element);
						setConfidence(prediction.confidence);
						
						// Add to history only for non-word-forming modes
						if (type !== 'Numeros' && type !== 'Abecedario') {
							setPredictionHistory(prev => [
								{ prediction: prediction.element, confidence: prediction.confidence, timestamp: Date.now() },
								...prev.slice(0, 9) // Keep last 10 predictions
							]);
						}
					}
				} catch (error) {
					console.error('Error making prediction:', error);
				}
			}
		}
	}, [predictFromLandmarks, type, leftHandOpen, currentPrediction, confidence, lastValidPrediction, lastLeftHandState, canInsert]);

	// Monitor state changes for debugging
	useEffect(() => {
		console.log(`🔄 [STATE] canInsert changed to:`, canInsert);
	}, [canInsert]);

	useEffect(() => {
		console.log(`🔄 [STATE] lastLeftHandState changed to:`, lastLeftHandState);
	}, [lastLeftHandState]);

	useEffect(() => {
		console.log(`🔄 [STATE] hasInsertedInThisCycle changed to:`, hasInsertedInThisCycle, `(timestamp: ${Date.now()})`);
	}, [hasInsertedInThisCycle]);

	useEffect(() => {
		console.log(`🔄 [STATE] formedText changed to:`, formedText);
	}, [formedText]);

	useEffect(() => {
		console.log(`🔄 [STATE] lastValidPrediction changed to:`, lastValidPrediction);
	}, [lastValidPrediction]);


	const landmarksToVectors = (landmarks: Array<{ x: number; y: number; z: number }>) => {
		if (landmarks.length !== 21) return null;
		
		// Key finger vectors for hand shape recognition
		const vectors = [];
		
		// Finger tip to base vectors
		const fingerTips = [4, 8, 12, 16, 20]; // thumb, index, middle, ring, pinky
		const fingerBases = [2, 5, 9, 13, 17];
		
		for (let i = 0; i < fingerTips.length; i++) {
			const tip = landmarks[fingerTips[i]];
			const base = landmarks[fingerBases[i]];
			vectors.push({
				x: tip.x - base.x,
				y: tip.y - base.y,
				z: tip.z - base.z
			});
		}
		
		// Palm vectors (between finger bases)
		for (let i = 0; i < fingerBases.length - 1; i++) {
			const p1 = landmarks[fingerBases[i]];
			const p2 = landmarks[fingerBases[i + 1]];
			vectors.push({
				x: p2.x - p1.x,
				y: p2.y - p1.y,
				z: p2.z - p1.z
			});
		}
		
		// Normalize vectors
		return vectors.map(v => {
			const magnitude = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
			return magnitude > 0 ? {
				x: v.x / magnitude,
				y: v.y / magnitude,
				z: v.z / magnitude
			} : { x: 0, y: 0, z: 0 };
		});
	};

	const calculateVectorSimilarity = (vectors1: Array<{ x: number; y: number; z: number }>, vectors2: Array<{ x: number; y: number; z: number }>) => {
		if (vectors1.length !== vectors2.length) return 0;
		
		let totalSimilarity = 0;
		for (let i = 0; i < vectors1.length; i++) {
			// Calculate dot product (cosine similarity)
			const dotProduct = vectors1[i].x * vectors2[i].x + 
							  vectors1[i].y * vectors2[i].y + 
							  vectors1[i].z * vectors2[i].z;
			
			// Convert to percentage (dot product ranges from -1 to 1)
			const similarity = (dotProduct + 1) * 50;
			totalSimilarity += similarity;
		}
		
		return totalSimilarity / vectors1.length;
	};

	const detectHandOpenClosed = (landmarks: Array<{ x: number; y: number; z: number }>) => {
		if (landmarks.length !== 21) return false;
		
		// Check if fingers are extended by comparing tip to base positions
		const fingerTips = [4, 8, 12, 16, 20]; // thumb, index, middle, ring, pinky
		const fingerBases = [3, 6, 10, 14, 18];
		
		let openFingers = 0;
		
		for (let i = 0; i < fingerTips.length; i++) {
			const tip = landmarks[fingerTips[i]];
			const base = landmarks[fingerBases[i]];
			
			// For thumb, check x-axis difference; for others, check y-axis
			if (i === 0) {
				if (Math.abs(tip.x - base.x) > 0.04) openFingers++;
			} else {
				if (tip.y < base.y - 0.02) openFingers++;
			}
		}
		
		// Hand is open if 3 or more fingers are extended
		return openFingers >= 3;
	};

  return (
    <>
      <PageMeta
        title="Entrenamiento"
        description="..."
      />
      <div className="grid grid-cols-12 gap-4 md:gap-6">
        <div className="col-span-12 space-y-6 xl:col-span-7">
          <div className={`grid ${type === "Vocales" ? "" : "grid-cols-2"} md:gap-6`}>
	          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
	            <div className="flex justify-between h-12 rounded-xl dark:bg-gray-800">
	            	<p className="flex flex-col text-xl dark:text-white">Predicción en tiempo real<span className="text-sm font-light text-gray-500">Muestra tu mano para obtener predicciones</span></p>
	            </div>

	            <div className="mt-5">
	              <Badge color={confidence > 60 ? "success" : confidence > 35 ? "warning" : "error"}>
	                <ArrowUpIcon />
	                {confidence.toFixed(1)}% {currentPrediction && `- ${currentPrediction}`}
	              </Badge>
	              <div className="w-full h-3 bg-gray-100 rounded-xl mt-1.5 overflow-hidden">
	                <div
	                  className={`h-full rounded-xl transition-all duration-300 ease-out ${
	                    confidence > 60 ? 'bg-green-500' : confidence > 35 ? 'bg-yellow-500' : 'bg-red-500'
	                  }`}
	                  style={{ width: `${confidence}%` }}
	                ></div>
	              </div>
	            </div>

	            {/* Current Prediction Display */}
	            {currentPrediction && rightHandDetected && confidence > 35 && (
	              <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-center">
	                <div className="text-4xl font-bold text-blue-600 dark:text-blue-400 mb-2">
	                  {currentPrediction}
	                </div>
	                <div className="text-sm text-gray-600 dark:text-gray-400">
	                  Confianza: {confidence.toFixed(1)}%
	                </div>
	                <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
	                  Mano Der: {rightHandDetected ? '✅' : '❌'} | Mano Izq: {leftHandOpen ? 'Abierta' : 'Cerrada'}
	                </div>
	                <div className="text-xs text-blue-500 dark:text-blue-400 mt-1">
	                  Condiciones: Conf≥60% {confidence >= 60 ? '✅' : '❌'} | Izq Cerrada {!leftHandOpen ? '✅' : '❌'} | Tipo OK {(type === 'Numeros' || type === 'Abecedario') ? '✅' : '❌'}
	                </div>
	                {lastValidPrediction && (
	                  <div className="text-xs text-green-500 dark:text-green-400 mt-1 font-bold">
	                    💾 Predicción Válida Guardada: {lastValidPrediction.element} ({lastValidPrediction.confidence.toFixed(1)}%)
	                  </div>
	                )}
	              </div>
	            )}

	            {!handDetected && (
	              <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-xl text-center">
	                <div className="text-gray-500 dark:text-gray-400">
	                  Muestra tu mano frente a la cámara
	                </div>
	              </div>
	            )}
	          </div>
						{type !== "Vocales" && (
							<>
			          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
			            <div className="flex justify-between h-12 rounded-xl dark:bg-gray-800">
			            	<p className="flex flex-col text-xl dark:text-white">Estado Mano Izquierda<span className="text-sm font-light text-gray-500">Control - Detección de mano abierta/cerrada</span></p>
			            </div>

			            <div className="mt-5 flex items-center justify-center py-8">
			              <div className="text-center">
			                <div className={`text-6xl mb-4 ${leftHandOpen ? 'text-green-500' : 'text-red-500'}`}>
			                  {leftHandOpen ? '✋' : '✊'}
			                </div>
			                <div className={`text-2xl font-bold mb-2 ${leftHandOpen ? 'text-green-600' : 'text-red-600'}`}>
			                  {leftHandOpen ? 'ABIERTA' : 'CERRADA'}
			                </div>
			                <div className="text-sm text-gray-500 dark:text-gray-400">
			                  Mano Izquierda
                </div>
                <div className="text-xs mt-2 p-2 bg-gray-100 dark:bg-gray-700 rounded">
                  <div>Estado anterior: {lastLeftHandState === null ? 'null' : (lastLeftHandState ? 'ABIERTA' : 'CERRADA')}</div>
                  <div>Puede insertar: {canInsert ? 'SÍ' : 'NO'}</div>
                  <div>Ciclo completado: {hasInsertedInThisCycle ? 'SÍ' : 'NO'}</div>
                </div>
			              </div>
			            </div>
			          </div>
			         		<div className="flex justify-between items-center col-span-full rounded-2xl border-2 border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6 md:gap-5 min-h-[80px]" style={{display: 'flex', visibility: 'visible'}}>
									<div className="flex items-center gap-3 flex-1">
										<div className="flex items-center gap-2 min-h-[40px]">
											<p className="text-lg font-medium text-gray-800 dark:text-white min-w-0 break-words" style={{display: 'block', visibility: 'visible'}}>
												{formedText || (
													<span className="text-gray-400 dark:text-gray-500 italic">
														Texto formado aparecerá aquí... (Inserción: {canInsert ? 'Habilitada' : 'Deshabilitada'})
													</span>
												)}
											</p>
											{!canInsert && (
												<div className="flex items-center gap-2 px-3 py-1 bg-orange-100 dark:bg-orange-900/20 rounded-full border border-orange-300">
													<div className="w-3 h-3 bg-orange-500 rounded-full"></div>
													<span className="text-sm font-medium text-orange-600 dark:text-orange-400">🚫 Abrir mano</span>
												</div>
											)}
										</div>
									</div>
									<div className="flex md:gap-3">
										{type !== "Numeros" && (
						      		<Button size="sm" variant="primary" onClick={() => setFormedText(prev => prev + ' ')}>Espacio</Button>
										)}
										<Button size="sm" variant="primary" onClick={() => setFormedText('')}>Borrar</Button>
										{lastValidPrediction && (
											<Button 
												size="sm" 
												variant="outline" 
												onClick={() => {
													console.log(`🧪 [TEST] Manual insertion with prediction: ${lastValidPrediction.element}`);
													if (canInsert && lastValidPrediction) {
														// Insert immediately
														setFormedText(prev => prev + lastValidPrediction.element);
														// Clear prediction but DON'T disable insertion for manual test
														validPredictionRef.current = null;
														setLastValidPrediction(null);
														// Keep canInsert = true for manual testing
														console.log(`🧪 [TEST] Manual insertion completed, keeping insertion enabled for testing`);
													}
												}}
											>
												Insertar: {lastValidPrediction.element}
											</Button>
										)}
									</div>
								</div>
							</>
						)}
	        </div>

          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-5 p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 sm:pt-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">{type}</h3>
            <div className="flex flex-wrap justify-between gap-3 mt-5 max-w-full overflow-x-auto custom-scrollbar">
							{arr.length > 0 && (
					      arr.map(val => (
					      	<Button className="flex flex-col" size="sm" variant="outline">
										<img className="w-14 h-18 dark:[filter:invert(100%)_sepia(0%)_saturate(7466%)_hue-rotate(83deg)_brightness(99%)_contrast(102%)]" src={`/images/${folder}/${val}.png`} alt={`${val}`} />
					         	<p className="text-xl font-medium text-gray-800 dark:text-white/90">{val}</p>
					        </Button>
					      ))
            	)}
							{arr.length > 0 && op && Object.entries(ops).map(([key, value]) => (
								<Button className="flex flex-col" size="sm" variant="outline">
									<img className="w-14 h-18 dark:[filter:invert(100%)_sepia(0%)_saturate(7466%)_hue-rotate(83deg)_brightness(99%)_contrast(102%)]" src={`/images/letters/${key}.png`} alt="op" />
									<p className="text-xl font-medium text-gray-800 dark:text-white/90">{value}</p>
				        </Button>
							))}
							{arr.length === 0 && (
								<p className="text-sm font-light text-gray-500">Tabla vacia :)</p>
							)}
            </div>
          </div>
        </div>

        <div className="col-span-12 xl:col-span-5">
        	<div className="h-200 rounded-2xl border border-gray-200 bg-gray-100 dark:border-gray-800 dark:bg-white/[0.03]">
        		<HandCamera 
        			mode="prediction" 
        			onHandDetected={handleHandDetectionChange}
        			onLandmarksDetected={handleLandmarksDetected}
        		/>
        	</div>

        	{/* Available Data Info */}
        	{availableData.length > 0 && (
        		<div className="mt-4 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        			<h4 className="text-sm font-semibold text-gray-800 dark:text-white mb-2">Datos disponibles:</h4>
        			<div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
        				{availableData.map(item => (
        					<div key={item.element} className="flex justify-between">
        						<span>{item.element}:</span>
        						<span>{item.count} muestras</span>
        					</div>
        				))}
        			</div>
        		</div>
        	)}

        	{availableData.length === 0 && (
        		<div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl text-center">
        			<div className="text-yellow-600 dark:text-yellow-400 text-sm">
        				No hay datos de entrenamiento para {type}.
        			</div>
        			<div className="text-yellow-500 dark:text-yellow-300 text-xs mt-1">
        				Entrena primero algunos elementos para poder hacer predicciones.
        			</div>
        		</div>
        	)}
        </div>
      </div>
    </>
  );
}

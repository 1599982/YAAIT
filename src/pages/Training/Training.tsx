import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import Button from "../../components/ui/button/Button";
import HandCamera from "../../components/camera/HandCamera";
import handLandmarksDB from "../../services/database";
import DataVerification from "../../components/common/DataVerification";

import {
  ArrowUpIcon
} from "../../icons";
import Badge from "../../components/ui/badge/Badge";

type TrainingProps = {
	type: string;
	arr: (number | string)[];
};

export default function Training({type, arr=[]}: TrainingProps) {
	const navigate = useNavigate();
	const [selectedElement, setSelectedElement] = useState<number | string | null>(null);
	const [isCollecting, setIsCollecting] = useState(false);
	const [collectionStep, setCollectionStep] = useState<'waiting' | 'countdown' | 'collecting' | 'completed'>('waiting');
	const [countdown, setCountdown] = useState(3);
	const [collectionTimer, setCollectionTimer] = useState(10);
	const [handDetected, setHandDetected] = useState(false);
	const [currentLandmarks, setCurrentLandmarks] = useState<Array<{ x: number; y: number; z: number }>>([]);
	const [collectedSamples, setCollectedSamples] = useState(0);
	const [sessionId, setSessionId] = useState('');
	const [showDataVerification, setShowDataVerification] = useState(false);
	const [trainedElements, setTrainedElements] = useState<Set<string | number>>(new Set());

	let folder = "";

	if (type === "Numeros") {
		folder = "numbers";
	} else {
		folder = "letters";
	}

	// Load trained elements when component mounts or type changes
	useEffect(() => {
		const loadTrainedElements = async () => {
			try {
				const stats = await handLandmarksDB.getTrainingStats();
				const trained = new Set(
					stats
						.filter(stat => stat.category === type)
						.map(stat => stat.element)
				);
				setTrainedElements(trained);
				console.log(`📊 [Training] Loaded ${trained.size} trained elements for ${type}:`, Array.from(trained));
			} catch (error) {
				console.error('❌ [Training] Error loading trained elements:', error);
			}
		};

		loadTrainedElements();
	}, [type]);

	const handleElementSelect = (element: number | string) => {
		setSelectedElement(element);
	};

	const handleCollectClick = async () => {
		if (selectedElement !== null) {
			// Verify database status before starting collection
			const dbStatus = await handLandmarksDB.verifyDatabaseStatus();
			
			if (!dbStatus.isValid) {
				alert(`Error en la base de datos: ${dbStatus.error || 'Estado inválido'}. Por favor recarga la página.`);
				return;
			}
			
			const newSessionId = handLandmarksDB.generateSessionId();
			setSessionId(newSessionId);
			setIsCollecting(true);
			setCollectionStep('waiting');
			setCountdown(3);
			setCollectionTimer(10);
			setCollectedSamples(0);
		}
	};

	const handleHandDetectionChange = useCallback((detected: boolean) => {
		setHandDetected(detected);
	}, []);

	const handleLandmarksDetected = useCallback((landmarks: Array<{ x: number; y: number; z: number }>) => {
		setCurrentLandmarks(landmarks);
	}, []);

	const stopCollection = () => {
		console.log(`🛑 [Stop] Stopping collection - resetting all timers`);
		setIsCollecting(false);
		setCollectionStep('waiting');
		setCountdown(3);
		setCollectionTimer(10); // Reset collection timer
		setCollectedSamples(0);
		setCurrentLandmarks([]);
		setSessionId('');
		console.log('Recolección detenida');
	};
	// Efecto para manejar el cronómetro inicial de 3 segundos
	useEffect(() => {
		let timer: number;

		if (isCollecting && collectionStep === 'countdown' && handDetected) {
			if (countdown > 0) {
				timer = setTimeout(() => {
					setCountdown(countdown - 1);
				}, 1000);
			} else {
				// Cronómetro completado, iniciar recolección
				setCollectionStep('collecting');
				setCollectionTimer(10); // Reset timer to 10 seconds
				console.log(`Iniciando recolección de datos para elemento: ${selectedElement} - Timer reseteado a 10s`);
			}
		}

		return () => {
			if (timer) clearTimeout(timer);
		};
	}, [isCollecting, collectionStep, countdown, handDetected, selectedElement]);

	// Collection timer effect - runs for exactly 10 seconds regardless of hand detection
	useEffect(() => {
		let timer: number;
		
		console.log(`🔍 [Timer Debug] isCollecting: ${isCollecting}, collectionStep: ${collectionStep}, collectionTimer: ${collectionTimer}`);

		if (isCollecting && collectionStep === 'collecting' && collectionTimer > 0) {
			console.log(`✅ [Timer] Setting timeout for ${collectionTimer}s → ${collectionTimer - 1}s`);
			timer = setTimeout(() => {
				const newTime = collectionTimer - 1;
				console.log(`⏱️ [Timer] Collection timer: ${newTime}s remaining (was ${collectionTimer}s)`);
				setCollectionTimer(newTime);
			}, 1000);
		} else if (isCollecting && collectionStep === 'collecting' && collectionTimer === 0) {
			// Collection completed
			console.log(`🏁 [Timer] Timer reached 0 - completing collection`);
			setCollectionStep('completed');
			console.log(`🎉 Recolección completada para elemento: ${selectedElement}. ${collectedSamples} muestras guardadas.`);

			// Verify saved data
			setTimeout(async () => {
				try {
					const stats = await handLandmarksDB.getTrainingStats();
					const totalSize = await handLandmarksDB.getDatabaseSize();
					const elementData = stats.filter(s => s.category === type && s.element === selectedElement);

					console.log(`📊 Verificación final - Total DB size: ${totalSize}, Datos para ${type}-${selectedElement}:`, elementData);

					if (elementData.length > 0) {
						console.log(`✅ Se guardaron ${elementData[0].count} muestras para ${type}-${selectedElement}`);
						// Update trained elements set
						setTrainedElements(prev => new Set([...prev, selectedElement!]));
					} else {
						console.warn(`⚠️ No se encontraron datos guardados para ${type}-${selectedElement}`);
					}
				} catch (error) {
					console.error('❌ Error verificando datos guardados:', error);
				}

				setTimeout(() => {
					stopCollection();
				}, 1000);
			}, 200);
		} else {
			console.log(`❌ [Timer] Conditions not met - isCollecting: ${isCollecting}, step: ${collectionStep}, timer: ${collectionTimer}`);
		}

		return () => {
			if (timer) clearTimeout(timer);
		};
	}, [isCollecting, collectionStep, collectionTimer]);


	// Simplified data collection using ref for current landmarks
	const currentLandmarksRef = useRef<Array<{ x: number; y: number; z: number }>>([]);
	const collectionTimerRef = useRef(10);
	
	// Update refs when values change
	useEffect(() => {
		currentLandmarksRef.current = currentLandmarks;
	}, [currentLandmarks]);

	useEffect(() => {
		collectionTimerRef.current = collectionTimer;
	}, [collectionTimer]);

	// Data collection interval effect
	useEffect(() => {
		let dataCollectionInterval: number;

		if (isCollecting && collectionStep === 'collecting' && handDetected) {
			// Set up interval for data collection
			dataCollectionInterval = setInterval(async () => {
				const landmarks = currentLandmarksRef.current;
				
				if (landmarks.length > 0 && selectedElement !== null && sessionId) {
					try {
						const landmarksCopy = landmarks.map(l => ({...l}));
						
						await handLandmarksDB.saveTrainingData(
							type,
							selectedElement,
							landmarksCopy,
							sessionId
						);
						
						setCollectedSamples(prev => {
							const newCount = prev + 1;
							console.log(`📊 [Collection] Muestra ${newCount} guardada para ${selectedElement} (${collectionTimerRef.current}s restantes)`);
							return newCount;
						});
						
					} catch (error) {
						console.error('Error saving training data:', error);
					}
				}
			}, 500);
		}

		return () => {
			if (dataCollectionInterval) {
				clearInterval(dataCollectionInterval);
			}
		};
	}, [isCollecting, collectionStep, handDetected, selectedElement, sessionId, type]);

	// Efecto para iniciar cronómetro cuando se detecta la mano
	useEffect(() => {
		if (isCollecting && collectionStep === 'waiting' && handDetected) {
			setCollectionStep('countdown');
		} else if (isCollecting && (collectionStep === 'countdown' || collectionStep === 'collecting') && !handDetected) {
			// Si la mano desaparece durante el cronómetro o recolección, detener la recolección
			stopCollection();
		}
	}, [handDetected, isCollecting, collectionStep]);



  return (
    <>
      <PageMeta
        title="Entrenamiento"
        description="..."
      />
      <div className="grid grid-cols-12 gap-4 md:gap-6">
        <div className="col-span-12 space-y-6 xl:col-span-7">
	        <div className="grid grid-cols-1 gap-4 md:gap-6">
	          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
	            <div className="flex justify-between h-12 rounded-xl dark:bg-gray-800">
	            	<p className="flex flex-col text-xl dark:text-white">Recolecte los datos necesarios<span className="text-sm font-light text-gray-500">Ponga la mano frente a la camara</span></p>
             		<div className="flex gap-2">
			         		<Button size="sm" variant="outline" onClick={() => setShowDataVerification(true)}>
			         			Ver Datos
			         		</Button>
			         		<Button 
			         			size="sm" 
			         			variant="primary"
			         			onClick={() => {
			         				// Navigate to corresponding prediction page
			         				const routes = {
			         					'Numeros': '/previsione/numeri',
			         					'Vocales': '/previsione/vocales', 
			         					'Abecedario': '/previsione/abecedario',
			         					'Palabras': '/previsione/palore'
			         				};
			         				const route = routes[type as keyof typeof routes];
			         				if (route) {
			         					navigate(route);
			         				}
			         			}}
			         		>
			         			Predicción
			         		</Button>
			         		<Button
			         			size="sm"
			         			variant="primary"
			         			disabled={selectedElement === null}
			         			onClick={handleCollectClick}
			         		>
			         			Recolectar
			         		</Button>
             		</div>
	            </div>

	            <div className=" mt-5">
	              <Badge color="success">
	                <ArrowUpIcon />
	                {isCollecting && collectionStep === 'collecting'
	                  ? `${Math.round(((10 - collectionTimer) / 10) * 100)}% (${collectedSamples} muestras) - ${collectionTimer}s`
	                  : `0% (${collectedSamples} muestras)`}
	              </Badge>
	              <div className="w-full h-3 bg-gray-100 rounded-xl mt-1.5 overflow-hidden">
	                <div
	                  className="h-full bg-blue-500 rounded-xl transition-all duration-500 ease-out"
	                  style={{
	                    width: isCollecting && collectionStep === 'collecting'
	                      ? `${((10 - collectionTimer) / 10) * 100}%`
	                      : '0%'
	                  }}
	                ></div>
	              </div>
	            </div>
	          </div>
	        </div>

          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-5 p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 sm:pt-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">{type}</h3>
            <div className="flex flex-wrap justify-between gap-3 mt-5 max-w-full custom-scrollbar">
				      {arr.length > 0 ? (arr.map(val => {
				      	const isTrained = trainedElements.has(val);
				      	const isSelected = selectedElement === val;
				      	return (
					      	<Button
					      		key={val}
					      		className={`w-20 h-30 flex flex-col relative ${
					      			isSelected 
					      				? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20' 
					      				: isTrained 
					      					? 'ring-2 ring-green-500 bg-green-50 dark:bg-green-900/20' 
					      					: ''
					      		}`}
					      		size="sm"
					      		variant="outline"
					      		onClick={() => handleElementSelect(val)}
					      	>
					      		{isTrained && (
					      			<div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
					      				<svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
					      					<path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
					      				</svg>
					      			</div>
					      		)}
										<img className="w-18 h-18 dark:[filter:invert(100%)_sepia(0%)_saturate(7466%)_hue-rotate(83deg)_brightness(99%)_contrast(102%)]" src={`/images/${folder}/${val}.png`} alt={`${val}`} />
					         	<p className="text-xl font-medium text-gray-800 dark:text-white/90">{val}</p>
					        </Button>
				        );
				      })) : (
				      	<Button
				      		className={`w-20 h-30 flex flex-col ${selectedElement === '+' ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20' : ''}`}
				      		size="sm"
				      		variant="outline"
				      		onClick={() => handleElementSelect('+')}
				      	>
				         	<p className="text-5xl font-medium text-gray-800 dark:text-white/90">+</p>
				        </Button>
				      )}
            </div>
          </div>
        </div>

        <div className="col-span-12 xl:col-span-5">
        	<div className="relative h-200 rounded-2xl border border-gray-200 bg-gray-100 dark:border-gray-800 dark:bg-white/[0.03]">
        		<HandCamera
        			mode="training"
        			onHandDetected={handleHandDetectionChange}
        			onLandmarksDetected={handleLandmarksDetected}
        		/>


        		{/* Overlay para recolección */}
        		{isCollecting && (
        			<div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20 rounded-2xl">
        				<div className="bg-transparent rounded-xl p-8 text-center">
        					{collectionStep === 'waiting' && (
        						<div>
        							<div className="text-2xl font-semibold text-gray-800 dark:text-white mb-2">
        								Coloca la mano para empezar a recolectar
        							</div>
        							<div className="text-sm text-gray-600 dark:text-gray-400">
        								Elemento seleccionado: {selectedElement}
        							</div>
        							<button
        								onClick={stopCollection}
        								className="mt-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
        							>
        								Cancelar
        							</button>
        						</div>
        					)}

        					{collectionStep === 'countdown' && (
        						<div>
        							<div className="text-6xl font-bold text-blue-600 dark:text-blue-400 mb-4">
        								{countdown}
        							</div>
        							<div className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
        								Preparándose para recolectar...
        							</div>
        							<div className="text-sm text-gray-600 dark:text-gray-400">
        								Mantén la mano en posición
        							</div>
        						</div>
        					)}

        					{collectionStep === 'collecting' && (
        						<div>
        							<div className="text-4xl font-bold text-green-600 dark:text-green-400 mb-4 animate-pulse">
        								🔄
        							</div>
        							<div className="text-2xl font-semibold text-gray-800 dark:text-white mb-2">
        								¡Recolectando datos!
        							</div>
        							<div className="text-lg text-gray-600 dark:text-gray-400 mb-2">
        								{collectionTimer}s restantes
        							</div>
        							<div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        								{collectedSamples} muestras guardadas
        							</div>
        							<div className="w-48 h-2 bg-gray-200 rounded-full mx-auto">
        								<div 
        									className="h-full bg-green-500 rounded-full transition-all duration-1000 ease-out"
        									style={{ width: `${((10 - collectionTimer) / 10) * 100}%` }}
        								/>
        							</div>
        						</div>
        					)}

        					{collectionStep === 'completed' && (
        						<div>
        							<div className="text-4xl text-green-600 dark:text-green-400 mb-4">
        								✓
        							</div>
        							<div className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
        								¡Recolección completada!
        							</div>
        							<div className="text-sm text-gray-600 dark:text-gray-400">
        								{collectedSamples} muestras guardadas en la base de datos
        							</div>
        						</div>
        					)}
        				</div>
        			</div>
        		)}
        	</div>
        </div>
      </div>

      {/* Data Verification Modal */}
      <DataVerification
        isOpen={showDataVerification}
        onClose={() => setShowDataVerification(false)}
      />
    </>
  );
}

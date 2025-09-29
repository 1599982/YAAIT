import { useState, useEffect, useCallback } from "react";
import PageMeta from "../../components/common/PageMeta";
import Button from "../../components/ui/button/Button";
import HandCamera from "../../components/camera/HandCamera";
import handLandmarksDB from "../../services/database";

import {
  ArrowUpIcon
} from "../../icons";
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

	const handleHandDetectionChange = useCallback((detected: boolean) => {
		setHandDetected(detected);
	}, []);

	const predictFromLandmarks = useCallback(async (currentLandmarks: Array<{ x: number; y: number; z: number }>) => {
		// Get all training data for this category
		const trainingData = await handLandmarksDB.getTrainingData(type);
		
		if (trainingData.length === 0) {
			return null;
		}

		// Simple distance-based prediction
		let bestMatch = { element: '', distance: Infinity, confidence: 0 };
		
		for (const record of trainingData) {
			const distance = calculateLandmarkDistance(currentLandmarks, record.landmarks);
			if (distance < bestMatch.distance) {
				bestMatch = {
					element: String(record.element),
					distance,
					confidence: Math.max(0, Math.min(100, 100 - (distance * 100)))
				};
			}
		}

		// Only return prediction if confidence is above threshold
		if (bestMatch.confidence > 30) {
			return bestMatch;
		}
		
		return null;
	}, [type]);

	const handleLandmarksDetected = useCallback(async (landmarks: Array<{ x: number; y: number; z: number }>) => {
		// Simple prediction based on stored data
		if (landmarks.length > 0) {
			try {
				const prediction = await predictFromLandmarks(landmarks);
				if (prediction) {
					setCurrentPrediction(prediction.element);
					setConfidence(prediction.confidence);
					
					// Add to history
					setPredictionHistory(prev => [
						{ prediction: prediction.element, confidence: prediction.confidence, timestamp: Date.now() },
						...prev.slice(0, 9) // Keep last 10 predictions
					]);
				}
			} catch (error) {
				console.error('Error making prediction:', error);
			}
		}
	}, [predictFromLandmarks]);



	const calculateLandmarkDistance = (landmarks1: Array<{ x: number; y: number; z: number }>, landmarks2: Array<{ x: number; y: number; z: number }>) => {
		if (landmarks1.length !== landmarks2.length) return Infinity;
		
		let totalDistance = 0;
		for (let i = 0; i < landmarks1.length; i++) {
			const dx = landmarks1[i].x - landmarks2[i].x;
			const dy = landmarks1[i].y - landmarks2[i].y;
			const dz = landmarks1[i].z - landmarks2[i].z;
			totalDistance += Math.sqrt(dx * dx + dy * dy + dz * dz);
		}
		
		return totalDistance / landmarks1.length;
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
	              <Badge color={confidence > 70 ? "success" : confidence > 40 ? "warning" : "error"}>
	                <ArrowUpIcon />
	                {confidence.toFixed(1)}% {currentPrediction && `- ${currentPrediction}`}
	              </Badge>
	              <div className="w-full h-3 bg-gray-100 rounded-xl mt-1.5 overflow-hidden">
	                <div
	                  className={`h-full rounded-xl transition-all duration-300 ease-out ${
	                    confidence > 70 ? 'bg-green-500' : confidence > 40 ? 'bg-yellow-500' : 'bg-red-500'
	                  }`}
	                  style={{ width: `${confidence}%` }}
	                ></div>
	              </div>
	            </div>

	            {/* Current Prediction Display */}
	            {currentPrediction && handDetected && (
	              <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-center">
	                <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">
	                  {currentPrediction}
	                </div>
	                <div className="text-sm text-gray-600 dark:text-gray-400">
	                  Confianza: {confidence.toFixed(1)}%
	                </div>
	              </div>
	            )}

	            {!handDetected && (
	              <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-xl text-center">
	                <div className="text-gray-500 dark:text-gray-400">
	                  No se detecta mano
	                </div>
	              </div>
	            )}
	          </div>
						{type !== "Vocales" && (
							<>
			          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
			            <div className="flex justify-between h-12 rounded-xl dark:bg-gray-800">
			            	<p className="flex flex-col text-xl dark:text-white">Historial de predicciones<span className="text-sm font-light text-gray-500">Últimas predicciones realizadas</span></p>
			            </div>

			            <div className="mt-5 space-y-2 max-h-32 overflow-y-auto">
			              {predictionHistory.length > 0 ? (
			                predictionHistory.map((pred, index) => (
			                  <div key={index} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700 rounded">
			                    <span className="font-medium text-gray-800 dark:text-white">{pred.prediction}</span>
			                    <span className="text-sm text-gray-600 dark:text-gray-400">{pred.confidence.toFixed(1)}%</span>
			                  </div>
			                ))
			              ) : (
			                <div className="text-center text-gray-500 dark:text-gray-400 py-4">
			                  No hay predicciones aún
			                </div>
			              )}
			            </div>
			          </div>
			          <div className="flex justify-between items-center col-span-full rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6 md:gap-5">
									<p></p>
									{type !== "Numeros" && (
										<div className="flex md:gap-3">
						      		<Button size="sm" variant="primary">Espacio</Button>
						      		<Button size="sm" variant="primary">Borrar</Button>
										</div>
									)}
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

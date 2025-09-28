import { useState, useEffect, useCallback } from "react";
import PageMeta from "../../components/common/PageMeta";
import Button from "../../components/ui/button/Button";
import HandCamera from "../../components/camera/HandCamera";

import {
  ArrowUpIcon
} from "../../icons";
import Badge from "../../components/ui/badge/Badge";

type TrainingProps = {
	type: string;
	arr: (number | string)[];
};

export default function Training({type, arr=[]}: TrainingProps) {
	const [selectedElement, setSelectedElement] = useState<number | string | null>(null);
	const [isCollecting, setIsCollecting] = useState(false);
	const [collectionStep, setCollectionStep] = useState<'waiting' | 'countdown' | 'collecting' | 'completed'>('waiting');
	const [countdown, setCountdown] = useState(3);
	const [collectionTimer, setCollectionTimer] = useState(10);
	const [handDetected, setHandDetected] = useState(false);

	let folder = "";

	if (type === "Numeros") {
		folder = "numbers";
	} else {
		folder = "letters";
	}

	const handleElementSelect = (element: number | string) => {
		setSelectedElement(element);
	};

	const handleCollectClick = () => {
		if (selectedElement) {
			setIsCollecting(true);
			setCollectionStep('waiting');
			setCountdown(3);
			setCollectionTimer(10);
			console.log(`Iniciando recolección para elemento: ${selectedElement}`);
		}
	};

	const handleHandDetectionChange = useCallback((detected: boolean) => {
		setHandDetected(detected);
	}, []);

	const stopCollection = () => {
		setIsCollecting(false);
		setCollectionStep('waiting');
		setCountdown(3);
		setCollectionTimer(10);
		console.log('Recolección detenida');
	};

	// Efecto para manejar el cronómetro inicial de 3 segundos
	useEffect(() => {
		let timer: NodeJS.Timeout;

		if (isCollecting && collectionStep === 'countdown' && handDetected) {
			if (countdown > 0) {
				timer = setTimeout(() => {
					setCountdown(countdown - 1);
				}, 1000);
			} else {
				// Cronómetro completado, iniciar recolección
				setCollectionStep('collecting');
				console.log(`Iniciando recolección de datos para elemento: ${selectedElement}`);
			}
		}

		return () => {
			if (timer) clearTimeout(timer);
		};
	}, [isCollecting, collectionStep, countdown, handDetected, selectedElement]);

	// Efecto para manejar la recolección de datos de 10 segundos
	useEffect(() => {
		let timer: NodeJS.Timeout;

		if (isCollecting && collectionStep === 'collecting' && handDetected) {
			if (collectionTimer > 0) {
				timer = setTimeout(() => {
					setCollectionTimer(collectionTimer - 1);
				}, 1000);
			} else {
				// Recolección completada
				setCollectionStep('completed');
				console.log(`Recolección completada para elemento: ${selectedElement}. Datos simulados guardados.`);
				setTimeout(() => {
					stopCollection();
				}, 1000);
			}
		}

		return () => {
			if (timer) clearTimeout(timer);
		};
	}, [isCollecting, collectionStep, collectionTimer, handDetected, selectedElement]);

	// Efecto para iniciar cronómetro cuando se detecta la mano
	useEffect(() => {
		if (isCollecting && collectionStep === 'waiting' && handDetected) {
			setCollectionStep('countdown');
			console.log('Mano detectada, iniciando cronómetro de 3 segundos');
		} else if (isCollecting && (collectionStep === 'countdown' || collectionStep === 'collecting') && !handDetected) {
			// Si la mano desaparece durante el cronómetro o recolección, detener la recolección
			console.log('Mano perdida, deteniendo recolección');
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
			         		<Button size="sm" variant="primary">Prediccion</Button>
			         		<Button
			         			size="sm"
			         			variant="primary"
			         			disabled={!selectedElement}
			         			onClick={handleCollectClick}
			         		>
			         			Recolectar
			         		</Button>
             		</div>
	            </div>

	            <div className=" mt-5">
	              <Badge color="success">
	                <ArrowUpIcon />
	                11.01%
	              </Badge>
	              <div className="w-full h-3 bg-gray-100 rounded-xl mt-1.5"></div>
	            </div>
	          </div>
	        </div>

          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-5 p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 sm:pt-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">{type}</h3>
            <div className="flex flex-wrap justify-between gap-3 mt-5 max-w-full overflow-x-auto custom-scrollbar">
				      {arr.length > 0 ? (arr.map(val => (
				      	<Button
				      		key={val}
				      		className={`w-20 h-30 flex flex-col ${selectedElement === val ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20' : ''}`}
				      		size="sm"
				      		variant="outline"
				      		onClick={() => handleElementSelect(val)}
				      	>
									<img className="w-18 h-18 dark:[filter:invert(100%)_sepia(0%)_saturate(7466%)_hue-rotate(83deg)_brightness(99%)_contrast(102%)]" src={`/images/${folder}/${val}.png`} alt={`${val}`} />
				         	<p className="text-xl font-medium text-gray-800 dark:text-white/90">{val}</p>
				        </Button>
				      ))) : (
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
        		/>

        		{/* Overlay para recolección */}
        		{isCollecting && (
        			<div className="absolute inset-0 flex items-center justify-center z-20 rounded-2xl">
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



        					{collectionStep === 'completed' && (
        						<div>
        							<div className="text-4xl text-green-600 dark:text-green-400 mb-4">
        								✓
        							</div>
        							<div className="text-xl font-semibold text-gray-800 dark:text-white">
        								¡Recolección completada!
        							</div>
        						</div>
        					)}
        				</div>
        			</div>
        		)}
        	</div>
        </div>
      </div>
    </>
  );
}

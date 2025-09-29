import React, { useEffect, useRef, useState } from 'react';

interface HandCameraProps {
  mode: 'training' | 'prediction';
  onHandDetected?: (detected: boolean) => void;
  onLandmarksDetected?: (landmarks: Array<{ x: number; y: number; z: number }>) => void;
}

declare global {
  interface Window {
    Hands: new (config: { locateFile: (file: string) => string }) => MediaPipeHands;
    drawConnectors: (
      ctx: CanvasRenderingContext2D,
      landmarks: Array<{ x: number; y: number; z?: number }>,
      connections: Array<[number, number]>,
      options: { color: string; lineWidth: number }
    ) => void;
    drawLandmarks: (
      ctx: CanvasRenderingContext2D,
      landmarks: Array<{ x: number; y: number; z?: number }>,
      options: { color: string; lineWidth: number; radius: number }
    ) => void;
    HAND_CONNECTIONS: Array<[number, number]>;
  }
}

interface MediaPipeHands {
  setOptions(options: {
    maxNumHands: number;
    modelComplexity: number;
    minDetectionConfidence: number;
    minTrackingConfidence: number;
  }): void;
  onResults(callback: (results: MediaPipeResults) => void): void;
  send(inputs: { image: HTMLVideoElement }): Promise<void>;
}

interface MediaPipeResults {
  multiHandLandmarks?: Array<Array<{ x: number; y: number; z: number }>>;
}

const HandCamera: React.FC<HandCameraProps> = ({ mode, onHandDetected, onLandmarksDetected }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mediaPipeLoaded, setMediaPipeLoaded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const streamRef = useRef<MediaStream | null>(null);
  const handsRef = useRef<MediaPipeHands | null>(null);
  const animationRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    let isMounted = true;

    const initialize = async (): Promise<void> => {
      try {
        // Load MediaPipe
        await loadMediaPipe();

        if (!isMounted) return;

        // Initialize camera
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: 'user' }
        });

        if (!isMounted) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        // Wait for video to load
        await new Promise<void>((resolve, reject) => {
          if (!videoRef.current) {
            reject(new Error('Video element not found'));
            return;
          }

          videoRef.current.onloadedmetadata = () => {
            if (videoRef.current) {
              videoRef.current.play()
                .then(() => resolve())
                .catch(reject);
            }
          };
        });

        // Setup hand detection
        setupHandDetection();
        setIsReady(true);

      } catch {
        if (isMounted) {
          setError('Error inicializando cámara');
        }
      }
    };

    const loadMediaPipe = (): Promise<void> => {
      return new Promise((resolve, reject) => {
        if (window.Hands) {
          setMediaPipeLoaded(true);
          resolve();
          return;
        }

        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js';
        script.onload = () => {
          setTimeout(() => {
            if (window.Hands) {
              setMediaPipeLoaded(true);
              resolve();
            } else {
              reject(new Error('MediaPipe failed to load'));
            }
          }, 1000);
        };
        script.onerror = () => reject(new Error('Failed to load MediaPipe'));
        document.head.appendChild(script);
      });
    };

    const setupHandDetection = (): void => {
      const hands = new window.Hands({
        locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
      });

      hands.setOptions({
        maxNumHands: mode === 'training' ? 1 : 2,
        modelComplexity: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      });

      hands.onResults((results: MediaPipeResults) => {
        if (!isProcessing) {
          setIsProcessing(true);
          drawResults(results);
          setIsProcessing(false);
        }
      });

      handsRef.current = hands;

      const processFrame = async (): Promise<void> => {
        if (!videoRef.current || !handsRef.current) {
          animationRef.current = requestAnimationFrame(processFrame);
          return;
        }

        if (videoRef.current.readyState === 4) {
          try {
            await handsRef.current.send({ image: videoRef.current });
          } catch (error) {
            console.warn('Frame processing error:', error);
          }
        }

        animationRef.current = requestAnimationFrame(processFrame);
      };

      processFrame();
    };

    const drawResults = (results: MediaPipeResults): void => {
      const canvas = canvasRef.current;
      const video = videoRef.current;

      if (!canvas || !video) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      ctx.restore();

      // Notificar detección de manos al componente padre
      const handsDetected = !!(results.multiHandLandmarks && results.multiHandLandmarks.length > 0);
      
      if (onHandDetected) {
        onHandDetected(handsDetected);
      }

      // Enviar landmarks normalizados al componente padre
      if (handsDetected && results.multiHandLandmarks && onLandmarksDetected) {
        if (mode === 'training') {
          // Para entrenamiento, solo la primera mano
          const landmarks = results.multiHandLandmarks[0];
          onLandmarksDetected(landmarks);
        } else {
          // Para predicción, procesar ambas manos con handedness
          results.multiHandLandmarks.forEach((landmarks, index) => {
            const handedness = results.multiHandedness?.[index]?.label as 'Left' | 'Right' | undefined;
            console.log(`🖐️ [HandCamera] Detected hand ${index}: ${handedness || 'unknown'} with ${landmarks.length} landmarks`);
            onLandmarksDetected(landmarks, handedness);
          });
        }
      }

      if (results.multiHandLandmarks) {
        ctx.save();

        // Dibujar conexiones de manos
        results.multiHandLandmarks.forEach((landmarks, index) => {
          // Conexiones de MediaPipe para manos
          const HAND_CONNECTIONS = [
            [0, 1], [1, 2], [2, 3], [3, 4], // Pulgar
            [0, 5], [5, 6], [6, 7], [7, 8], // Índice
            [0, 9], [9, 10], [10, 11], [11, 12], // Medio
            [0, 13], [13, 14], [14, 15], [15, 16], // Anular
            [0, 17], [17, 18], [18, 19], [19, 20], // Meñique
            [5, 9], [9, 13], [13, 17] // Conexiones entre dedos
          ];

          // Determinar el color según la mano
          const handedness = results.multiHandedness?.[index]?.label;
          const isRightHand = handedness === 'Right';
          const connectionColor = isRightHand ? '#0066FF' : '#00AA00'; // Azul para mano derecha (elementos), verde para izquierda (control)
          const landmarkColor = isRightHand ? '#0044BB' : '#008800'; // Azul oscuro para mano derecha, verde oscuro para izquierda

          // Dibujar conexiones
          ctx.strokeStyle = connectionColor;
          ctx.lineWidth = 2;
          for (const [start, end] of HAND_CONNECTIONS) {
            const startPoint = landmarks[start];
            const endPoint = landmarks[end];
            
            ctx.beginPath();
            ctx.moveTo(startPoint.x * canvas.width, startPoint.y * canvas.height);
            ctx.lineTo(endPoint.x * canvas.width, endPoint.y * canvas.height);
            ctx.stroke();
          }

          // Dibujar puntos de landmarks
          ctx.fillStyle = landmarkColor;
          for (const landmark of landmarks) {
            ctx.beginPath();
            ctx.arc(
              landmark.x * canvas.width,
              landmark.y * canvas.height,
              3, 0, 2 * Math.PI
            );
            ctx.fill();
          }
        });

        ctx.restore();
      }
    };

    initialize();

    return () => {
      isMounted = false;

      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      handsRef.current = null;
    };
  }, [mode]);

  return (
    <div className="relative w-full h-full bg-gray-100 dark:bg-white/[0.03] rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        style={{ display: 'none' }}
      />

      <canvas
        ref={canvasRef}
        className="w-full h-full object-cover"
        style={{ display: isReady ? 'block' : 'none' }}
      />

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-50 dark:bg-red-900/20 z-10">
          <div className="text-center p-4">
            <div className="text-red-500 text-xl mb-2">⚠️</div>
            <p className="text-red-600 dark:text-red-300 text-sm">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-2 px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
            >
              Reintentar
            </button>
          </div>
        </div>
      )}

      {!isReady && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-white/[0.03] z-10">
          <div className="text-center p-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-2"></div>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              {mediaPipeLoaded ? 'Inicializando cámara...' : 'Cargando MediaPipe...'}
            </p>
          </div>
        </div>
      )}
      
    </div>
  );
};

export default HandCamera;

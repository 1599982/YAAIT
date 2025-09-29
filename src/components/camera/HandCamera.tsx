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
        console.log('🔄 [HandCamera] Loading MediaPipe...');
        
        if (window.Hands) {
          console.log('✅ [HandCamera] MediaPipe already loaded');
          setMediaPipeLoaded(true);
          resolve();
          return;
        }

        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js';
        script.onload = () => {
          console.log('📦 [HandCamera] MediaPipe script loaded, checking availability...');
          setTimeout(() => {
            if (window.Hands) {
              console.log('✅ [HandCamera] MediaPipe Hands available');
              setMediaPipeLoaded(true);
              resolve();
            } else {
              console.error('❌ [HandCamera] MediaPipe Hands not available after loading');
              reject(new Error('MediaPipe failed to load'));
            }
          }, 1000);
        };
        script.onerror = () => {
          console.error('❌ [HandCamera] Failed to load MediaPipe script');
          reject(new Error('Failed to load MediaPipe'));
        };
        document.head.appendChild(script);
      });
    };

    const setupHandDetection = (): void => {
      console.log('🏗️ [HandCamera] Setting up hand detection...');
      
      const hands = new window.Hands({
        locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
      });

      const options = {
        maxNumHands: mode === 'training' ? 1 : 2,
        modelComplexity: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      };
      
      console.log('⚙️ [HandCamera] Setting MediaPipe options:', options);
      hands.setOptions(options);

      hands.onResults((results: MediaPipeResults) => {
        console.log(`🎥 [HandCamera] MediaPipe results received - Processing: ${isProcessing}`);
        if (!isProcessing) {
          setIsProcessing(true);
          drawResults(results);
          setIsProcessing(false);
        }
      });

      handsRef.current = hands;
      console.log('✅ [HandCamera] MediaPipe hands instance created');

      const processFrame = async (): Promise<void> => {
        if (!videoRef.current || !handsRef.current) {
          animationRef.current = requestAnimationFrame(processFrame);
          return;
        }

        if (videoRef.current.readyState === 4) {
          try {
            await handsRef.current.send({ image: videoRef.current });
          } catch (error) {
            console.warn('⚠️ [HandCamera] Frame processing error:', error);
          }
        } else {
          console.log(`📹 [HandCamera] Video not ready, readyState: ${videoRef.current.readyState}`);
        }

        animationRef.current = requestAnimationFrame(processFrame);
      };

      console.log('🎬 [HandCamera] Starting frame processing loop');
      processFrame();
    };

    const drawResults = (results: MediaPipeResults): void => {
      console.log(`🎨 [HandCamera] drawResults called`, {
        hasMultiHandLandmarks: !!(results.multiHandLandmarks),
        landmarksCount: results.multiHandLandmarks?.length || 0
      });
      
      const canvas = canvasRef.current;
      const video = videoRef.current;

      if (!canvas || !video) {
        console.log(`⚠️ [HandCamera] Missing canvas or video element`);
        return;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      ctx.scale(-1, 1);
      ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
      ctx.restore();

      // Notificar detección de manos al componente padre
      const handsDetected = !!(results.multiHandLandmarks && results.multiHandLandmarks.length > 0);
      console.log(`👋 [HandCamera] Hand detection status: ${handsDetected}`);
      
      if (onHandDetected) {
        console.log(`📡 [HandCamera] Calling onHandDetected with: ${handsDetected}`);
        onHandDetected(handsDetected);
      } else {
        console.log(`⚠️ [HandCamera] onHandDetected callback not provided`);
      }

      // Enviar landmarks normalizados al componente padre
      if (handsDetected && results.multiHandLandmarks && onLandmarksDetected) {
        // Tomar solo la primera mano detectada para entrenamiento
        const landmarks = results.multiHandLandmarks[0];
        console.log(`📤 [HandCamera] Sending ${landmarks.length} landmarks to parent component`);
        console.log(`🔍 [HandCamera] First landmark sample:`, {
          x: landmarks[0].x,
          y: landmarks[0].y,
          z: landmarks[0].z
        });
        console.log(`🔍 [HandCamera] Callback function exists: ${typeof onLandmarksDetected}`);
        onLandmarksDetected(landmarks);
        console.log(`✅ [HandCamera] Landmarks sent successfully`);
      } else {
        console.log(`⚠️ [HandCamera] Not sending landmarks:`, {
          handsDetected,
          hasMultiHandLandmarks: !!results.multiHandLandmarks,
          hasCallback: !!onLandmarksDetected,
          callbackType: typeof onLandmarksDetected
        });
      }

      if (results.multiHandLandmarks) {
        ctx.save();
        ctx.scale(-1, 1);
        ctx.translate(-canvas.width, 0);

        if (window.drawLandmarks && window.drawConnectors && window.HAND_CONNECTIONS) {
          for (const landmarks of results.multiHandLandmarks) {
            window.drawConnectors(ctx, landmarks, window.HAND_CONNECTIONS, {
              color: '#00FF00',
              lineWidth: 2
            });

            window.drawLandmarks(ctx, landmarks, {
              color: '#00FF00',
              lineWidth: 2,
              radius: 3
            });
          }
        } else {
          ctx.fillStyle = '#00FF00';
          for (const landmarks of results.multiHandLandmarks) {
            for (const landmark of landmarks) {
              ctx.beginPath();
              ctx.arc(
                landmark.x * canvas.width,
                landmark.y * canvas.height,
                4, 0, 2 * Math.PI
              );
              ctx.fill();
            }
          }
        }

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
      
      {/* Debug info */}
      <div className="absolute top-2 right-2 bg-black bg-opacity-70 text-white text-xs p-2 rounded z-20">
        <div>MediaPipe: {mediaPipeLoaded ? '✅' : '⏳'}</div>
        <div>Camera: {isReady ? '✅' : '⏳'}</div>
        <div>Processing: {isProcessing ? '🔄' : '⏸️'}</div>
      </div>
    </div>
  );
};

export default HandCamera;

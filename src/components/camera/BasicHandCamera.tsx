import React, { useEffect, useRef, useState } from 'react';

interface BasicHandCameraProps {
  mode: 'training' | 'prediction';
}

const BasicHandCamera: React.FC<BasicHandCameraProps> = ({ mode }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const streamRef = useRef<MediaStream | null>(null);
  const handsRef = useRef<any>(null);
  const animationRef = useRef<number>();

  useEffect(() => {
    let isMounted = true;

    const initialize = async () => {
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

      } catch (err) {
        if (isMounted) {
          setError('Error inicializando cámara');
        }
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

  const loadMediaPipe = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      if ((window as any).Hands) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js';
      script.onload = () => {
        setTimeout(() => {
          if ((window as any).Hands) {
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

  const setupHandDetection = () => {
    const hands = new (window as any).Hands({
      locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
    });

    hands.setOptions({
      maxNumHands: mode === 'training' ? 1 : 2,
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    hands.onResults((results: any) => {
      drawResults(results);
    });

    handsRef.current = hands;

    const processFrame = async () => {
      if (!videoRef.current || !handsRef.current) return;
      
      if (videoRef.current.readyState === 4) {
        try {
          await handsRef.current.send({ image: videoRef.current });
        } catch (err) {
          console.warn('Frame processing error:', err);
        }
      }

      animationRef.current = requestAnimationFrame(processFrame);
    };

    processFrame();
  };

  const drawResults = (results: any) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
    ctx.restore();

    if (results.multiHandLandmarks) {
      ctx.save();
      ctx.scale(-1, 1);
      ctx.translate(-canvas.width, 0);

      const drawLandmarks = (window as any).drawLandmarks;
      const drawConnectors = (window as any).drawConnectors;
      const HAND_CONNECTIONS = (window as any).HAND_CONNECTIONS;

      if (drawLandmarks && drawConnectors && HAND_CONNECTIONS) {
        for (const landmarks of results.multiHandLandmarks) {
          drawConnectors(ctx, landmarks, HAND_CONNECTIONS, {
            color: '#00FF00',
            lineWidth: 2
          });
          
          drawLandmarks(ctx, landmarks, {
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

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-200 dark:border-red-800">
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
    );
  }

  if (!isReady) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-white/[0.03] rounded-2xl border border-gray-200 dark:border-gray-800">
        <div className="text-center p-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-2"></div>
          <p className="text-gray-600 dark:text-gray-400 text-sm">Inicializando cámara...</p>
        </div>
      </div>
    );
  }

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
      />
    </div>
  );
};

export default BasicHandCamera;
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { FilesetResolver, HandLandmarker, DrawingUtils } from '@mediapipe/tasks-vision';
import { GestureState } from '../types';

export const useHandTracking = (videoRef: React.RefObject<HTMLVideoElement>) => {
  const [gestureState, setGestureState] = useState<GestureState>({
    isHandDetected: false,
    collapseFactor: 0,
    rotationX: 0,
    pinchDistance: 1,
  });

  const [loading, setLoading] = useState(true);
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const requestRef = useRef<number>();
  const lastUiUpdateRef = useRef<number>(0);

  // Use a ref for state to avoid re-renders in the tight loop, 
  // but expose a state for the UI updates if needed.
  // Ideally, we pass the ref directly to the 3D scene.
  const gestureRef = useRef<GestureState>({
    isHandDetected: false,
    collapseFactor: 0,
    rotationX: 0,
    pinchDistance: 1,
  });

  useEffect(() => {
    const initMediaPipe = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
        );
        
        handLandmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 1
        });
        
        setLoading(false);
        startLoop();
      } catch (error) {
        console.error("Error initializing MediaPipe:", error);
        setLoading(false);
      }
    };

    initMediaPipe();

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      handLandmarkerRef.current?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startLoop = useCallback(() => {
    const loop = () => {
      if (videoRef.current && videoRef.current.readyState >= 2 && handLandmarkerRef.current) {
        const results = handLandmarkerRef.current.detectForVideo(videoRef.current, performance.now());
        
        if (results.landmarks.length > 0) {
          const landmarks = results.landmarks[0];

          // 1. Collapse Factor (Fist Detection)
          // Average distance of finger tips (8, 12, 16, 20) to wrist (0)
          const wrist = landmarks[0];
          const tips = [8, 12, 16, 20]; // Index, Middle, Ring, Pinky tips
          let avgDist = 0;
          tips.forEach(idx => {
            const dx = landmarks[idx].x - wrist.x;
            const dy = landmarks[idx].y - wrist.y;
            const dz = landmarks[idx].z - wrist.z;
            avgDist += Math.sqrt(dx*dx + dy*dy + dz*dz);
          });
          avgDist /= tips.length;
          
          // Heuristic: Open palm ~ 0.3-0.4, Fist ~ 0.1-0.15. 
          // Tune these for easier triggering
          const minOpen = 0.12; 
          const maxOpen = 0.38; 
          let collapse = 1 - (Math.max(minOpen, Math.min(maxOpen, avgDist)) - minOpen) / (maxOpen - minOpen);
          
          // 2. Rotation (Hand position X)
          // Map x from 0-1 to -1 to 1. Invert because webcam is mirrored usually.
          const rotX = (wrist.x - 0.5) * 2; 

          // 3. Pinch (Thumb tip 4 to Index tip 8)
          const thumb = landmarks[4];
          const index = landmarks[8];
          const pinchDist = Math.sqrt(
            Math.pow(thumb.x - index.x, 2) + 
            Math.pow(thumb.y - index.y, 2)
          );
          // Heuristic: < 0.05 is pinch
          const pinchFactor = Math.min(1, Math.max(0, pinchDist / 0.1));

          gestureRef.current = {
            isHandDetected: true,
            collapseFactor: collapse, // 0 to 1
            rotationX: -rotX, // Flip for intuitive control
            pinchDistance: pinchFactor
          };

        } else {
           // Decay effect if hand lost
           gestureRef.current = {
             ...gestureRef.current,
             isHandDetected: false,
             // Slowly reset collapse
             collapseFactor: gestureRef.current.collapseFactor * 0.9,
           };
        }
        
        // PERFORMANCE OPTIMIZATION:
        // Update the React State (which triggers UI re-renders) only at ~10fps (every 100ms).
        // The 3D scene reads directly from gestureRef.current at 60fps, so animation remains smooth
        // while minimizing React overhead.
        const now = performance.now();
        if (now - lastUiUpdateRef.current > 100) {
            setGestureState({...gestureRef.current});
            lastUiUpdateRef.current = now;
        }
      }
      requestRef.current = requestAnimationFrame(loop);
    };
    loop();
  }, [videoRef]);

  return { loading, gestureState, gestureRef };
};
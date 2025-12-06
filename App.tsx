import React, { useRef, useState, useEffect } from 'react';
import { Experience } from './components/Scene';
import { useHandTracking } from './hooks/useHandTracking';
import { SHAPES, COLORS } from './constants';
import { ParticleShape } from './types';

const App = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { loading, gestureState, gestureRef } = useHandTracking(videoRef);
  
  const [currentShape, setCurrentShape] = useState<ParticleShape>('tree');
  const [currentColor, setCurrentColor] = useState(COLORS[0].hex);
  const [showControls, setShowControls] = useState(true);
  
  const [hasStarted, setHasStarted] = useState(false);

  // Setup webcam
  useEffect(() => {
    const startWebcam = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: 320, 
            height: 240,
            facingMode: 'user'
          } 
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Webcam access denied", err);
      }
    };
    startWebcam();
  }, []);

  const handleStart = () => {
      setHasStarted(true);
  };

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden selection:bg-green-500/30">
      
      {/* 3D Scene Layer */}
      <div className="absolute inset-0 z-0">
        <Experience 
            gestureRef={gestureRef} 
            shape={currentShape} 
            color={currentColor} 
        />
      </div>

      {/* Webcam Feed */}
      <div className={`absolute bottom-4 left-4 z-10 w-32 rounded-lg overflow-hidden border border-white/10 shadow-lg transition-opacity duration-300 ${loading ? 'opacity-0' : 'opacity-60 hover:opacity-100'}`}>
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          muted 
          className="w-full h-auto transform -scale-x-100" // Mirror webcam
        />
        <div className="absolute top-1 left-2 text-[10px] text-white font-mono bg-black/60 px-1 rounded backdrop-blur-sm">
          {gestureState.isHandDetected ? "CONNECTED" : "SEARCHING"}
        </div>
      </div>

      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mb-4"></div>
          <h2 className="text-xl font-cinzel text-green-400 tracking-widest">INITIALIZING</h2>
        </div>
      )}

      {/* Start / Intro Overlay */}
      {!loading && !hasStarted && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md text-center p-6">
              <h1 className="text-6xl font-cinzel text-green-500 mb-6 drop-shadow-[0_0_30px_rgba(74,222,128,0.4)]">
                  Merry Christmas
              </h1>
              <p className="text-white/80 max-w-md mb-10 text-lg leading-relaxed font-light">
                  A gesture-controlled holographic experience.<br/>
                  <span className="text-sm opacity-60 mt-2 block">Ensure camera access is enabled.</span>
              </p>
              <button 
                  onClick={handleStart}
                  className="px-10 py-4 bg-gradient-to-r from-green-700 to-green-600 hover:from-green-600 hover:to-green-500 text-white font-bold rounded-full shadow-[0_0_25px_rgba(34,197,94,0.4)] transition-all transform hover:scale-105 hover:shadow-[0_0_40px_rgba(34,197,94,0.6)]"
              >
                  Begin Experience
              </button>
          </div>
      )}

      {/* UI Layer */}
      <div className={`absolute top-0 left-0 right-0 p-8 z-20 transition-all duration-700 ${showControls && hasStarted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'}`}>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-5xl font-cinzel text-green-500 drop-shadow-[0_0_15px_rgba(74,222,128,0.3)]">
              Merry Christmas
            </h1>
            <p className="text-green-100/60 text-sm mt-2 max-w-xs font-light tracking-wide">
              Close fist to collapse. Move hand to rotate. Pinch to focus.
            </p>
          </div>
          
          <div className="flex gap-4">
              <button 
                onClick={() => setShowControls(!showControls)}
                className="text-white/70 hover:text-white pointer-events-auto text-sm uppercase tracking-wider font-bold"
              >
                Hide UI
              </button>
          </div>
        </div>
      </div>
      
      {/* Toggle Button for Hidden Controls */}
      {!showControls && hasStarted && (
         <button 
            onClick={() => setShowControls(true)}
            className="absolute top-8 right-8 z-20 text-white/50 hover:text-white bg-black/40 px-4 py-2 rounded-full backdrop-blur-md text-sm font-bold uppercase tracking-wider border border-white/5 hover:border-white/20 transition-all"
         >
            Show Controls
         </button>
      )}

    </div>
  );
};

export default App;
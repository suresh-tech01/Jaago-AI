import React, { useState, useEffect, useRef } from 'react';
import { Persona, TaskType } from '../types';
import { verifyAwakeFace, verifySpeech, getReadingChallenge, verifyQRCodeOrObject } from '../services/geminiService';
import { Loader2, Camera, Mic, Activity, XCircle, Zap, Volume2, Hand, Settings, Ear, CheckCircle2, XCircle as XIcon } from 'lucide-react';

interface TaskFlowProps {
  persona: Persona;
  tasks: TaskType[];
  onComplete: () => void;
  onMuteAlarm?: () => void;
  onUnmuteAlarm?: () => void;
}

export const TaskFlow: React.FC<TaskFlowProps> = ({ persona, tasks, onComplete, onMuteAlarm, onUnmuteAlarm }) => {
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Photo/QR State
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  // Reading State
  const [sentence, setSentence] = useState<string>("");
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Chanting State
  const [chantCount, setChantCount] = useState(0);
  const TARGET_CHANTS = 108;
  const analyserRef = useRef<AnalyserNode | null>(null);
  const chantAudioContextRef = useRef<AudioContext | null>(null);
  const lastNoiseTimeRef = useRef<number>(0);
  const isChantingRef = useRef(false);
  const recognitionRef = useRef<any>(null); // For SpeechRecognition
  const [currentVol, setCurrentVol] = useState(0); // For Visualizer
  const [manualMode, setManualMode] = useState(false);
  const [lastHeard, setLastHeard] = useState<{text: string, valid: boolean} | null>(null); // Feedback for user
  
  // Generic Manual Count (reused for Camera fallback)
  const [manualTapCount, setManualTapCount] = useState(0);
  const TARGET_MANUAL_TAPS = 30;

  // Steps State
  const [steps, setSteps] = useState(0);
  const targetSteps = 20;

  const currentTask = tasks[currentTaskIndex];

  // Initialize Task Logic
  useEffect(() => {
    if (!currentTask) {
        onComplete();
        return;
    }

    const initTask = async () => {
      setLoading(true);
      setError(null);
      setCapturedImage(null);
      setIsRecording(false);
      setChantCount(0);
      setCurrentVol(0);
      setManualMode(false);
      setManualTapCount(0);
      setCameraActive(false); // Reset camera UI
      setLastHeard(null);
      cleanupChantAudio();
      stopCameraStream(); // Ensure previous stream is closed

      // Unmute alarm by default when starting a new task to ensure they are awake
      if (onUnmuteAlarm) onUnmuteAlarm();

      if (currentTask === TaskType.READ_SENTENCE) {
        const s = await getReadingChallenge();
        setSentence(s);
      } else if (currentTask === TaskType.WALK_STEPS) {
        setSteps(0);
      }
      setLoading(false);
    };

    initTask();
    
    return () => {
      cleanupChantAudio();
      stopCameraStream();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTaskIndex, currentTask]);

  const handleNext = () => {
    cleanupChantAudio();
    stopCameraStream();
    if (onUnmuteAlarm) onUnmuteAlarm(); // Ensure alarm is loud for next task
    if (currentTaskIndex + 1 >= tasks.length) {
      onComplete();
    } else {
      setCurrentTaskIndex(prev => prev + 1);
    }
  };

  // --- Chanting Logic (Real-time Speech Recognition) ---
  
  const cleanupChantAudio = () => {
    if (chantAudioContextRef.current) {
        chantAudioContextRef.current.close();
        chantAudioContextRef.current = null;
    }
    if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
    }
    isChantingRef.current = false;
  };

  const startChantingSession = async () => {
    setError(null);
    setManualMode(false);
    setChantCount(0);
    setLastHeard(null);
    
    // 1. Setup Volume Detection (For Alarm Control)
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError("Microphone not supported. Switching to Manual Mode.");
        setManualMode(true);
        return;
    }

    try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioContextClass();
        chantAudioContextRef.current = ctx;

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        if (ctx.state === 'suspended') {
            await ctx.resume();
        }

        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        analyserRef.current = analyser;

        // 2. Setup Speech Recognition (For Counting)
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        
        if (SpeechRecognition) {
            const recognition = new SpeechRecognition();
            recognition.continuous = true;
            // False = only return final results. This prevents double counting and improves accuracy.
            recognition.interimResults = false; 
            recognition.lang = 'hi-IN'; // Optimized for Hindi names

            recognition.onresult = (event: any) => {
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        const transcript = event.results[i][0].transcript.toLowerCase().trim();
                        
                        // Strict Regex: Only Radha/Radhe variations allowed
                        // Removed Krishna, Hare, Govinda etc. to satisfy "sirf radha name hi detect krna"
                        const regex = /(radha|radhe|rada|raadha|राधा|राधे)/g;
                        const found = transcript.match(regex);
                        const matches = (found || []).length;
                        
                        if (matches > 0) {
                             // If multiple matches in one phrase, count them all
                             // e.g. "Radha Radha" -> 2
                            setLastHeard({ text: found!.join(' '), valid: true }); 
                            setChantCount(prev => Math.min(prev + matches, TARGET_CHANTS));
                        } else {
                            // Feedback for ignored words
                            setLastHeard({ text: transcript, valid: false });
                        }
                    }
                }
            };
            
            recognition.onerror = (e: any) => {
                console.warn("Speech recognition error", e);
                // Don't error out completely, user can still see volume visualizer
            };

            recognition.onend = () => {
                // Auto-restart if task not done
                if (isChantingRef.current && chantCount < TARGET_CHANTS) {
                    try { recognition.start(); } catch(e) {}
                }
            };

            recognitionRef.current = recognition;
            recognition.start();
        } else {
            setError("Speech Recognition not supported in this browser. Please use Chrome.");
        }

        setIsRecording(true);
        isChantingRef.current = true;
        lastNoiseTimeRef.current = Date.now();
        
        // Mute alarm immediately when starting
        if(onMuteAlarm) onMuteAlarm();

        requestAnimationFrame(detectChantPeak);

    } catch (err: any) {
        console.error("Chanting Setup Error:", err);
        setManualMode(true);
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError' || err.message?.includes('Permission denied')) {
            setError("Microphone permission denied. Please allow microphone access in your browser settings. Switched to Manual Mode.");
        } else {
            setError(`Microphone error: ${err.message}. Switched to Manual Mode.`);
        }
    }
  };

  const detectChantPeak = () => {
    if (!isChantingRef.current || !analyserRef.current) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyserRef.current.getByteFrequencyData(dataArray);

    let sum = 0;
    for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
    }
    const average = sum / bufferLength;
    setCurrentVol(average); 

    const now = Date.now();
    
    // Smart Alarm Logic:
    // If volume > 15 (user is chanting/making noise), mute alarm.
    // If silence for > 2 seconds, unmute alarm (punishment).
    if (average > 15) {
        lastNoiseTimeRef.current = now;
        if (onMuteAlarm) onMuteAlarm(); 
    } else {
        if (now - lastNoiseTimeRef.current > 2000) {
            if (onUnmuteAlarm) onUnmuteAlarm();
        }
    }

    if (isChantingRef.current) {
        requestAnimationFrame(detectChantPeak);
    }
  };

  const handleManualChantTap = () => {
      setChantCount(prev => {
          const newCount = prev + 1;
          if (newCount >= TARGET_CHANTS) {
              setTimeout(handleNext, 300);
              return TARGET_CHANTS;
          }
          return newCount;
      });
      setCurrentVol(50);
      setTimeout(() => setCurrentVol(0), 100);
  };

  // --- Camera Logic ---

  const stopCameraStream = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
  };

  const startCamera = async () => {
    setError(null);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError("Camera not supported on this device. Manual mode activated.");
        setManualMode(true);
        return;
    }

    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: "user" } 
        });
      } catch (e: any) {
        if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError' || e.message?.includes('Permission denied')) {
            throw e;
        }
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }

      setCameraActive(true);
      setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.onloadedmetadata = () => {
                videoRef.current?.play().catch(e => console.error(e));
            };
          }
      }, 50);

    } catch (err: any) {
      console.error("Camera Error:", err);
      setManualMode(true);
      stopCameraStream();
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError' || err.message?.includes('Permission denied')) {
          setError("Camera permission denied. Please allow camera access in your browser settings. Switched to Manual Mode.");
      } else {
          setError("Camera access failed. Switched to Manual Mode.");
      }
    }
  };

  const handleManualCameraTap = () => {
      setManualTapCount(prev => {
          const next = prev + 1;
          if (next >= TARGET_MANUAL_TAPS) {
              setTimeout(handleNext, 300);
              return TARGET_MANUAL_TAPS;
          }
          return next;
      });
  };

  const captureAndVerify = async (mode: 'FACE' | 'QR') => {
    if (!videoRef.current) return;
    
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const imageBase64 = canvas.toDataURL('image/jpeg', 0.8);
        setCapturedImage(imageBase64);
        
        stopCameraStream();
        setCameraActive(false);

        setLoading(true);
        let result;
        if (mode === 'FACE') {
            result = await verifyAwakeFace(imageBase64);
        } else {
            result = await verifyQRCodeOrObject(imageBase64);
        }
        setLoading(false);

        if (result.passed) {
            handleNext();
        } else {
            setError(result.message);
            setCapturedImage(null); 
        }
    } else {
        setError("Could not process image. Please try again.");
    }
  };

  // --- Reading Logic ---

  const startReading = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        setLoading(true);
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = reader.result as string;
          const result = await verifySpeech(base64Audio, sentence);
          setLoading(false);
          if (result.passed) {
            handleNext();
          } else {
            setError(result.message);
          }
        };
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err: any) {
      console.error("Mic Error:", err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError' || err.message?.includes('Permission denied')) {
          setError("Microphone permission denied. Please allow microphone access in your browser settings.");
      } else {
          setError("Could not access microphone.");
      }
    }
  };

  const stopReading = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  // --- Steps Logic ---
  const incrementSteps = () => {
      setSteps(prev => {
          const next = prev + 1;
          if (next >= targetSteps) {
              setTimeout(handleNext, 500);
          }
          return next;
      });
  };

  // --- Renderers ---

  if (loading && !isRecording && currentTask !== TaskType.PHOTO_FACE && currentTask !== TaskType.SCAN_QR) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4 animate-pulse">
        <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
        <p className="text-zinc-400 font-mono">Verifying...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-md md:max-w-2xl lg:max-w-4xl mx-auto p-6 space-y-6">
      <div className="w-full flex justify-between items-center text-xs font-bold text-zinc-500 uppercase tracking-wider">
        <span>Task {currentTaskIndex + 1} / {tasks.length}</span>
        <span>{persona} Mode</span>
      </div>
      
      {/* Progress Bar */}
      <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
        <div 
            className="h-full bg-indigo-500 transition-all duration-500 ease-out" 
            style={{ width: `${((currentTaskIndex) / tasks.length) * 100}%` }}
        />
      </div>

      <div className="w-full bg-zinc-900 border border-zinc-800 p-6 md:p-10 rounded-2xl shadow-xl flex flex-col items-center justify-center min-h-[400px]">
        {error && (
          <div className="w-full mb-4 p-4 bg-amber-900/20 border border-amber-500/50 text-amber-200 text-sm rounded-lg flex flex-col gap-2">
            <div className="flex items-center gap-2 font-bold text-amber-100">
               <XCircle className="w-4 h-4" />
               System Notice
            </div>
            <p>{error}</p>
          </div>
        )}

        {/* CHANTING UI */}
        {currentTask === TaskType.CHANTING && (
          <div className="space-y-8 text-center">
             <div className="relative">
                <div 
                    className="absolute inset-0 rounded-full border border-amber-500/30 transition-all duration-100 ease-out"
                    style={{ 
                        transform: `scale(${1 + (currentVol / 100)})`,
                        opacity: (isRecording || manualMode) ? 0.5 : 0 
                    }}
                />
                
                <div className="w-40 h-40 mx-auto rounded-full border-8 border-zinc-800 flex items-center justify-center relative overflow-hidden bg-zinc-950 z-10">
                    <div 
                        className="absolute bottom-0 w-full bg-amber-500/20 transition-all duration-300 ease-linear"
                        style={{ height: `${(chantCount / TARGET_CHANTS) * 100}%` }}
                    />
                    <div className="relative z-10 flex flex-col items-center">
                        <span className="text-5xl font-black text-white">{chantCount}</span>
                        <span className="text-xs text-zinc-500 uppercase mt-1">/ {TARGET_CHANTS}</span>
                    </div>
                </div>
             </div>

             <div className="space-y-2">
                 <h2 className="text-2xl font-bold text-white">Chant "Radha"</h2>
                 <p className="text-zinc-400 text-sm max-w-[200px] mx-auto">
                    {manualMode 
                        ? "Microphone unavailable. Tap button repeatedly."
                        : (isRecording ? "Listening & Verifying..." : "Press start and chant 'Radha' clearly.")
                    }
                 </p>
                 {!manualMode && isRecording && (
                    <div className="flex flex-col gap-2 items-center">
                        <p className="text-xs text-red-400 font-medium animate-pulse">
                            Alarm resumes if you stop.
                        </p>
                        {lastHeard && (
                             <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold ${
                                 lastHeard.valid ? 'bg-green-900/30 text-green-400 border border-green-800' : 'bg-red-900/30 text-red-400 border border-red-800'
                             }`}>
                                {lastHeard.valid ? <CheckCircle2 className="w-3 h-3" /> : <XIcon className="w-3 h-3" />}
                                <span>Heard: "{lastHeard.text}"</span>
                             </div>
                        )}
                    </div>
                 )}
             </div>

             <div className="flex flex-col gap-3">
                 {manualMode ? (
                     <button
                        onClick={handleManualChantTap}
                        className="w-full py-4 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-amber-900/20"
                     >
                        <Hand className="w-5 h-5" />
                        Tap to Chant ({chantCount})
                     </button>
                 ) : (
                     !isRecording ? (
                         <button 
                            onClick={startChantingSession}
                            className="w-full py-4 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all"
                         >
                            <Mic className="w-5 h-5" />
                            Start Chanting
                         </button>
                     ) : (
                        <button 
                            disabled={chantCount < TARGET_CHANTS}
                            onClick={handleNext}
                            className={`w-full py-4 font-bold rounded-xl flex items-center justify-center gap-2 transition-all ${
                                chantCount >= TARGET_CHANTS 
                                ? 'bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-500/20' 
                                : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                            }`}
                        >
                            {chantCount >= TARGET_CHANTS ? (
                                <>
                                    <Zap className="w-5 h-5" /> Finish Task
                                </>
                            ) : (
                                <>
                                    <Volume2 className="w-5 h-5" /> {TARGET_CHANTS - chantCount} Remaining...
                                </>
                            )}
                        </button>
                     )
                 )}
             </div>
          </div>
        )}

        {/* CAMERA TASKS UI */}
        {(currentTask === TaskType.PHOTO_FACE || currentTask === TaskType.SCAN_QR) && (
          <div className="space-y-4 flex flex-col items-center w-full">
             {!manualMode ? (
                <>
                    <div className="relative w-full aspect-[4/3] bg-black rounded-xl overflow-hidden border border-zinc-700 shadow-inner">
                        {!cameraActive && !capturedImage && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-600 space-y-2">
                                <Camera className="w-12 h-12 opacity-50" />
                                <p className="text-xs uppercase tracking-widest">Camera Inactive</p>
                            </div>
                        )}
                        <video 
                            ref={videoRef} 
                            autoPlay 
                            muted 
                            playsInline 
                            className={`w-full h-full object-cover transform scale-x-[-1] ${!cameraActive ? 'hidden' : ''}`}
                        />
                        {capturedImage && (
                            <img src={capturedImage} alt="Captured" className="w-full h-full object-cover transform scale-x-[-1]" />
                        )}
                    </div>
                    
                    <p className="text-zinc-400 text-center text-sm px-4">
                        {currentTask === TaskType.PHOTO_FACE 
                            ? "Prove you are awake. Take a selfie with your eyes wide open." 
                            : "Scan a bathroom object (like a toothbrush) or QR code."
                        }
                    </p>

                    {!cameraActive ? (
                        <button 
                            onClick={startCamera}
                            className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/20"
                        >
                            <Camera className="w-5 h-5" />
                            Open Camera
                        </button>
                    ) : (
                        <button 
                            onClick={() => captureAndVerify(currentTask === TaskType.PHOTO_FACE ? 'FACE' : 'QR')}
                            disabled={loading}
                            className="w-full py-4 bg-white text-black font-bold rounded-xl hover:bg-zinc-200 transition-all disabled:opacity-50 flex justify-center items-center gap-2 shadow-lg"
                        >
                            {loading && <Loader2 className="animate-spin w-4 h-4"/>}
                            {loading ? "Analyzing..." : "Capture & Verify"}
                        </button>
                    )}
                </>
             ) : (
                 /* Manual Fallback Mode for Camera */
                 <div className="w-full py-8 flex flex-col items-center space-y-6">
                     <div className="w-40 h-40 mx-auto rounded-full border-8 border-zinc-800 flex items-center justify-center relative bg-zinc-950">
                        <div 
                            className="absolute bottom-0 w-full bg-indigo-500/20 transition-all duration-100 ease-out"
                            style={{ height: `${(manualTapCount / TARGET_MANUAL_TAPS) * 100}%` }}
                        />
                        <span className="text-5xl font-black text-white relative z-10">{manualTapCount}</span>
                        <span className="text-xs text-zinc-500 absolute bottom-8 font-bold tracking-widest z-10">/ {TARGET_MANUAL_TAPS}</span>
                    </div>
                    
                    <div className="space-y-2 text-center">
                        <h3 className="text-xl font-bold text-white">Manual Override</h3>
                        <p className="text-zinc-400 text-sm">Camera unavailable. Tap rapidly to prove you are awake.</p>
                    </div>

                    <button 
                        onClick={handleManualCameraTap}
                        className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"
                    >
                        <Hand className="w-5 h-5" />
                        Tap to Verify
                    </button>
                 </div>
             )}
          </div>
        )}

        {/* READING TASK UI */}
        {currentTask === TaskType.READ_SENTENCE && (
          <div className="space-y-8 text-center flex flex-col items-center">
             <div className="w-full p-8 bg-gradient-to-br from-indigo-900/20 to-zinc-900 rounded-2xl border border-indigo-500/20 shadow-[inset_0_0_20px_rgba(79,70,229,0.1)]">
                <p className="text-xl md:text-2xl font-serif italic text-indigo-300 leading-relaxed drop-shadow-sm">
                    "{sentence || "Loading quote..."}"
                </p>
             </div>
             
             <div className="space-y-6 w-full flex flex-col items-center">
                 <p className="text-zinc-500 text-xs uppercase tracking-widest font-bold flex items-center gap-2">
                    {isRecording ? <span className="flex h-2 w-2 rounded-full bg-red-500 animate-ping"/> : null}
                    {isRecording ? "Recording Active..." : "Hold Button & Read Aloud"}
                 </p>

                 <button 
                    onMouseDown={startReading}
                    onMouseUp={stopReading}
                    onTouchStart={(e) => { e.preventDefault(); startReading(); }}
                    onTouchEnd={(e) => { e.preventDefault(); stopReading(); }}
                    onContextMenu={(e) => e.preventDefault()}
                    disabled={loading}
                    className={`
                        relative w-36 h-36 rounded-full flex items-center justify-center transition-all duration-200 select-none touch-none
                        ${isRecording 
                            ? 'bg-red-500 scale-110 shadow-[0_0_50px_rgba(239,68,68,0.5)] border-4 border-red-400' 
                            : 'bg-zinc-800 hover:bg-zinc-700 hover:scale-105 shadow-xl border-4 border-zinc-700'
                        }
                        ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-95'}
                    `}
                 >
                    {isRecording && (
                        <div className="absolute inset-0 rounded-full border border-white/50 animate-ping duration-1000" />
                    )}
                    
                    {loading ? (
                        <Loader2 className="animate-spin w-12 h-12 text-white/50" /> 
                    ) : (
                        <Mic className={`w-12 h-12 ${isRecording ? 'text-white' : 'text-zinc-400'} transition-colors`} />
                    )}
                 </button>

                 {isRecording ? (
                    <p className="text-red-400 text-sm animate-pulse font-medium">
                        Release button to verify
                    </p>
                 ) : (
                    <p className="text-zinc-600 text-sm">
                        Keep holding while you read the entire sentence.
                    </p>
                 )}
             </div>
          </div>
        )}

        {/* STEPS UI */}
        {currentTask === TaskType.WALK_STEPS && (
            <div className="space-y-6 text-center">
                <div className="w-40 h-40 mx-auto rounded-full border-8 border-zinc-800 flex items-center justify-center relative bg-zinc-950">
                    <span className="text-5xl font-black text-white">{steps}</span>
                    <span className="text-xs text-zinc-500 absolute bottom-8 font-bold tracking-widest">/ {targetSteps}</span>
                </div>
                <div className="space-y-2">
                    <h3 className="text-xl font-bold text-white">Get Moving!</h3>
                    <p className="text-zinc-400 text-sm">Walk around with your device. <br/><span className="text-xs text-zinc-600">(Or simulate by tapping below)</span></p>
                </div>
                <button 
                    onClick={incrementSteps}
                    className="w-full py-4 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95"
                >
                    <Activity className="w-5 h-5" />
                    Simulate Step
                </button>
            </div>
        )}
      </div>
    </div>
  );
};
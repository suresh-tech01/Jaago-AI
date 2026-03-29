import React, { useState, useEffect, useRef } from 'react';
import { AlarmClock } from './components/AlarmClock';
import { TaskFlow } from './components/TaskFlow';
import { AlarmConfig, Persona, TaskType, Ringtone } from './types';
import { generateMotivationalQuote } from './services/geminiService';
import { getCustomAudio } from './services/audioStorage';
import { Volume2, Database, Cpu } from 'lucide-react';

export default function App() {
  // --- DATABASE LAYER (Local Storage) ---
  const [persona, setPersona] = useState<Persona>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('wakeup_persona');
      return (saved as Persona) || Persona.STUDENT;
    }
    return Persona.STUDENT;
  });

  const [config, setConfig] = useState<AlarmConfig>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('wakeup_config');
      return saved ? JSON.parse(saved) : {
        time: "07:00",
        enabled: false,
        tasks: [TaskType.CHANTING, TaskType.PHOTO_FACE],
        snoozeAllowed: false,
        days: [1, 2, 3, 4, 5], // Mon-Fri default
        label: "Wake Up",
        ringtone: Ringtone.WAR,
        is24Hour: false
      };
    }
    return {
      time: "07:00",
      enabled: false,
      tasks: [TaskType.CHANTING, TaskType.PHOTO_FACE],
      snoozeAllowed: false,
      days: [1, 2, 3, 4, 5],
      label: "Wake Up",
      ringtone: Ringtone.WAR,
      is24Hour: false
    };
  });

  useEffect(() => {
    localStorage.setItem('wakeup_persona', persona);
  }, [persona]);

  useEffect(() => {
    localStorage.setItem('wakeup_config', JSON.stringify(config));
  }, [config]);

  // --- APP LOGIC ---

  const [isAlarmRinging, setIsAlarmRinging] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const customAudioElementRef = useRef<HTMLAudioElement | null>(null);
  const [quote, setQuote] = useState<string>("");

  // Ensure AudioContext is unlocked on user interaction (browser autoplay policy)
  useEffect(() => {
    const unlockAudio = () => {
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume().then(() => {
            console.log("AudioContext resumed by user gesture");
        });
      }
    };
    document.addEventListener('click', unlockAudio);
    document.addEventListener('touchstart', unlockAudio);
    return () => {
        document.removeEventListener('click', unlockAudio);
        document.removeEventListener('touchstart', unlockAudio);
    };
  }, []);

  // Wake Lock Logic
  useEffect(() => {
    let wakeLock: any = null;

    const requestWakeLock = async () => {
      if ('wakeLock' in navigator) {
        try {
          wakeLock = await (navigator as any).wakeLock.request('screen');
        } catch (err: any) {
          console.warn(`Wake Lock Request Failed: ${err.name}, ${err.message}`);
        }
      }
    };

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && isAlarmRinging) {
        await requestWakeLock();
      }
    };

    if (isAlarmRinging) {
      requestWakeLock();
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLock) {
        wakeLock.release().catch((e: any) => console.warn("Wake Lock release error", e));
      }
    };
  }, [isAlarmRinging]);

  // Sound Logic
  const startAlarmSound = async () => {
    try {
        if (config.ringtone === Ringtone.CUSTOM) {
            const customFile = await getCustomAudio();
            if (customFile) {
                const url = URL.createObjectURL(customFile);
                const audio = new Audio(url);
                audio.loop = true;
                audio.play().catch(e => console.error("Custom audio play error:", e));
                customAudioElementRef.current = audio;
                return;
            }
            // Fallback to WAR if custom audio fails or is missing
        }

        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioContextClass();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        // Ringtone Logic
        if (config.ringtone === Ringtone.COSMIC) {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(300, ctx.currentTime);
            osc.frequency.linearRampToValueAtTime(600, ctx.currentTime + 2);
            // Pulsing effect handled in interval
        } else if (config.ringtone === Ringtone.CLASSIC) {
            osc.type = 'square';
            osc.frequency.setValueAtTime(800, ctx.currentTime);
        } else {
            // WAR (Default)
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(440, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.5);
        }
        
        gain.gain.value = 0.1;
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        
        audioContextRef.current = ctx;
        oscillatorRef.current = osc;
        gainNodeRef.current = gain;

        // Pattern Interval
        const interval = setInterval(() => {
            if(!osc.frequency) return;
            const t = ctx.currentTime;

            if (config.ringtone === Ringtone.COSMIC) {
                osc.frequency.setValueAtTime(300, t); 
                osc.frequency.linearRampToValueAtTime(600, t + 1.8);
            } else if (config.ringtone === Ringtone.CLASSIC) {
                // Beep Beep Beep
                gain.gain.setValueAtTime(0.1, t);
                gain.gain.setValueAtTime(0, t + 0.1);
                gain.gain.setValueAtTime(0.1, t + 0.2);
                gain.gain.setValueAtTime(0, t + 0.3);
            } else {
                // WAR
               osc.frequency.setValueAtTime(440, t); 
               osc.frequency.exponentialRampToValueAtTime(880, t + 0.5);
            }
        }, config.ringtone === Ringtone.CLASSIC ? 1000 : 2000);
        
        (osc as any).interval = interval;

    } catch (e) {
        console.error("Audio error", e);
    }
  };

  const stopAlarmSound = () => {
    if (customAudioElementRef.current) {
        customAudioElementRef.current.pause();
        customAudioElementRef.current.currentTime = 0;
        customAudioElementRef.current = null;
    }
    if (oscillatorRef.current) {
        clearInterval((oscillatorRef.current as any).interval);
        try {
            oscillatorRef.current.stop();
            oscillatorRef.current.disconnect();
        } catch (e) { console.warn("Error stopping oscillator", e); }
    }
    if (audioContextRef.current) {
        try {
            audioContextRef.current.close();
        } catch (e) { console.warn("Error closing audio context", e); }
    }
    oscillatorRef.current = null;
    audioContextRef.current = null;
    gainNodeRef.current = null;
  };

  const muteAlarm = () => {
    if (gainNodeRef.current && audioContextRef.current) {
        try {
            gainNodeRef.current.gain.setTargetAtTime(0, audioContextRef.current.currentTime, 0.1);
        } catch(e) {}
    }
  };

  const unmuteAlarm = () => {
    if (gainNodeRef.current && audioContextRef.current) {
        try {
            gainNodeRef.current.gain.setTargetAtTime(0.1, audioContextRef.current.currentTime, 0.1);
        } catch(e) {}
    }
  };

  const handleTriggerAlarm = async () => {
    setIsAlarmRinging(true);
    startAlarmSound();
    const q = await generateMotivationalQuote(persona);
    setQuote(q);
  };

  const handleTasksComplete = () => {
    setIsAlarmRinging(false);
    stopAlarmSound();
    
    // If it's a one-time alarm (no repeat days), disable it
    if (config.days.length === 0) {
        setConfig({ ...config, enabled: false });
    }
    // If it repeats, keep it enabled for the next day
  };

  return (
    <div className="min-h-screen w-full bg-black text-zinc-100 flex flex-col relative overflow-hidden font-sans">
        {/* Background Gradients */}
        <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-indigo-900/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-rose-900/10 rounded-full blur-[120px] pointer-events-none" />

        {/* System Status Indicators */}
        {!isAlarmRinging && (
           <div className="absolute top-3 right-4 flex gap-2 z-20 opacity-40 hover:opacity-100 transition-opacity">
              <div className="flex items-center gap-1.5 px-2 py-1 bg-zinc-900 rounded border border-zinc-800 text-[9px] text-zinc-500 font-mono">
                  <Database className="w-2.5 h-2.5 text-emerald-500" />
                  <span>DB:OK</span>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-1 bg-zinc-900 rounded border border-zinc-800 text-[9px] text-zinc-500 font-mono">
                  <Cpu className="w-2.5 h-2.5 text-indigo-500" />
                  <span>AI:OK</span>
              </div>
           </div>
        )}

        {isAlarmRinging ? (
            <div className="z-50 flex flex-col items-center justify-center min-h-screen relative bg-black">
                {/* Alarm Ringing Overlay */}
                <div className="absolute inset-0 bg-red-500/10 animate-pulse pointer-events-none"></div>
                
                <div className="relative z-10 flex flex-col items-center w-full">
                    <div className="mb-8 flex flex-col items-center animate-bounce">
                        <Volume2 className="w-12 h-12 text-red-500 mb-2" />
                        <h2 className="text-3xl font-black text-white tracking-widest uppercase">Wake Up</h2>
                        <p className="text-zinc-400 font-mono text-sm mt-1">{config.label}</p>
                    </div>
                    
                    {/* Intro/Motivational Quote before tasks */}
                    <div className="mb-8 px-8 text-center max-w-lg">
                        <p className="text-lg font-bold text-white mb-2">Protocol: {persona}</p>
                        <p className="text-zinc-400 italic text-sm border-l-2 border-red-500 pl-4">"{quote}"</p>
                    </div>

                    <TaskFlow 
                        persona={persona}
                        tasks={config.tasks}
                        onComplete={handleTasksComplete}
                        onMuteAlarm={muteAlarm}
                        onUnmuteAlarm={unmuteAlarm}
                    />
                </div>
            </div>
        ) : (
            <AlarmClock 
                config={config}
                persona={persona}
                onUpdateConfig={setConfig}
                onUpdatePersona={setPersona}
                onTriggerAlarm={handleTriggerAlarm}
            />
        )}
    </div>
  );
}
import React, { useState, useEffect, useRef } from 'react';
import { Persona, AlarmConfig, TaskType, Ringtone } from '../types';
import { saveCustomAudio } from '../services/audioStorage';
import { 
    Bell, Play, Square, Moon, Briefcase, Dumbbell, GraduationCap, 
    User, BookOpen, Clock, Timer, Settings, Check, ChevronRight, 
    Music2, CalendarDays, Tag, Flag, Plus, Minus 
} from 'lucide-react';

interface AlarmClockProps {
  config: AlarmConfig;
  persona: Persona;
  onUpdateConfig: (config: AlarmConfig) => void;
  onUpdatePersona: (persona: Persona) => void;
  onTriggerAlarm: () => void;
}

type Tab = 'CLOCK' | 'ALARM' | 'STOPWATCH';

export const AlarmClock: React.FC<AlarmClockProps> = ({ config, persona, onUpdateConfig, onUpdatePersona, onTriggerAlarm }) => {
  const [activeTab, setActiveTab] = useState<Tab>('CLOCK');
  const [currentTime, setCurrentTime] = useState(new Date());

  // --- CLOCK TICKER ---
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);
      
      // ALARM TRIGGER LOGIC
      if (config.enabled) {
        const [alarmHour, alarmMinute] = config.time.split(':').map(Number);
        
        // Check seconds to trigger only once per minute
        if (now.getHours() === alarmHour && now.getMinutes() === alarmMinute && now.getSeconds() === 0) {
            
            // Check Days logic
            const today = now.getDay(); // 0 = Sun
            const days = config.days;
            
            // If days array is empty, it's a one-time alarm, so trigger it.
            // If days array has values, check if today is included.
            if (days.length === 0 || days.includes(today)) {
                onTriggerAlarm();
            }
        }
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [config, onTriggerAlarm]);

  // --- HELPERS ---
  const formatTime = (date: Date, showSeconds = false) => {
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const seconds = date.getSeconds();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    
    if (!config.is24Hour) {
        hours = hours % 12;
        hours = hours ? hours : 12; // the hour '0' should be '12'
    }

    const strTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    const secStr = showSeconds ? `:${seconds.toString().padStart(2, '0')}` : '';
    
    return { time: strTime + secStr, ampm: config.is24Hour ? '' : ampm };
  };

  return (
    <div className="flex flex-col md:flex-row-reverse h-screen w-full max-w-md md:max-w-4xl lg:max-w-5xl mx-auto bg-black md:border border-zinc-900 shadow-2xl overflow-hidden relative md:my-8 md:h-[calc(100vh-64px)] md:rounded-3xl">
        
        {/* TOP STATUS BAR (Fake) - Mobile Only */}
        <div className="h-6 w-full flex justify-between items-center px-6 pt-2 z-20 md:hidden absolute top-0 left-0">
            <span className="text-[10px] font-medium text-white">{currentTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
            <div className="flex gap-1">
                <div className="w-3 h-3 bg-zinc-800 rounded-full" />
                <div className="w-3 h-3 bg-zinc-800 rounded-full" />
                <div className="w-4 h-2 bg-white rounded-[2px]" />
            </div>
        </div>

        {/* MAIN CONTENT AREA */}
        <div className="flex-1 overflow-y-auto scrollbar-hide pb-20 md:pb-0 pt-6 md:pt-0 w-full">
            {activeTab === 'CLOCK' && <ClockTab currentTime={currentTime} config={config} persona={persona} onUpdatePersona={onUpdatePersona} />}
            {activeTab === 'ALARM' && <AlarmTab config={config} onUpdateConfig={onUpdateConfig} />}
            {activeTab === 'STOPWATCH' && <StopwatchTab />}
        </div>

        {/* NAVIGATION DOCK (Bottom on mobile, Side on desktop) */}
        <div className="absolute md:relative bottom-0 w-full md:w-24 h-20 md:h-full bg-zinc-950/90 backdrop-blur-md border-t md:border-t-0 md:border-r border-zinc-900 flex md:flex-col justify-around md:justify-center md:gap-12 items-center pb-2 md:pb-0 z-30">
            <NavIcon icon={<Clock className="w-6 h-6" />} label="Clock" isActive={activeTab === 'CLOCK'} onClick={() => setActiveTab('CLOCK')} />
            <NavIcon icon={<Bell className="w-6 h-6" />} label="Alarm" isActive={activeTab === 'ALARM'} onClick={() => setActiveTab('ALARM')} />
            <NavIcon icon={<Timer className="w-6 h-6" />} label="Stopwatch" isActive={activeTab === 'STOPWATCH'} onClick={() => setActiveTab('STOPWATCH')} />
        </div>
    </div>
  );
};

// --- TAB COMPONENTS ---

const ClockTab = ({ currentTime, config, persona, onUpdatePersona }: any) => {
    // Determine greeting
    const hrs = currentTime.getHours();
    let greeting = "Good Morning";
    if (hrs >= 12) greeting = "Good Afternoon";
    if (hrs >= 17) greeting = "Good Evening";

    const { time, ampm } = { 
        time: currentTime.toLocaleTimeString([], { hour12: !config.is24Hour, hour: '2-digit', minute: '2-digit', second: '2-digit' }).split(' ')[0],
        ampm: !config.is24Hour ? (hrs >= 12 ? 'PM' : 'AM') : ''
    };

    const getPersonaIcon = (p: Persona) => {
        switch(p) {
            case Persona.STUDENT: return <BookOpen className="w-4 h-4" />;
            case Persona.CEO: return <Briefcase className="w-4 h-4" />;
            case Persona.GYM_FREAK: return <Dumbbell className="w-4 h-4" />;
            case Persona.SCHOOL_KID: return <GraduationCap className="w-4 h-4" />;
            case Persona.NIGHT_SHIFT_WORKER: return <Moon className="w-4 h-4" />;
            default: return <User className="w-4 h-4" />;
        }
    };

    return (
        <div className="flex flex-col items-center justify-center h-full px-6 space-y-8 md:space-y-12">
            
            <div className="text-center space-y-1">
                <span className="text-zinc-500 uppercase tracking-widest text-xs font-bold">{greeting}</span>
                <div className="flex items-baseline justify-center gap-2">
                    <h1 className="text-7xl md:text-8xl lg:text-9xl font-light text-white tracking-tighter tabular-nums">
                        {time}
                    </h1>
                    {ampm && <span className="text-xl md:text-2xl text-zinc-600 font-bold">{ampm}</span>}
                </div>
                <p className="text-indigo-400 font-medium md:text-lg">
                    {currentTime.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric'})}
                </p>
            </div>

            {/* Persona Quick Switch */}
            <div className="w-full max-w-2xl">
                <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-bold text-zinc-600 uppercase tracking-wider">Current Identity</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {Object.values(Persona).map((p: any) => (
                        <button
                            key={p}
                            onClick={() => onUpdatePersona(p)}
                            className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${
                                persona === p 
                                ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-900/40' 
                                : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:bg-zinc-800'
                            }`}
                        >
                            <div className={`p-2 rounded-full ${persona === p ? 'bg-indigo-500' : 'bg-zinc-800'}`}>
                                {getPersonaIcon(p)}
                            </div>
                            <div className="flex flex-col items-start">
                                <span className="text-xs font-bold truncate max-w-[80px] md:max-w-[120px]">{p}</span>
                                {persona === p && <span className="text-[9px] opacity-70">Active</span>}
                            </div>
                        </button>
                    ))}
                </div>
            </div>
            
            <div className="w-full max-w-2xl bg-zinc-900/50 rounded-2xl p-4 border border-zinc-800 flex items-center justify-between">
                <div className="flex gap-3 items-center">
                    <div className="bg-amber-500/10 p-2 rounded-full">
                        <Bell className="w-5 h-5 text-amber-500" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xs text-zinc-500 font-bold uppercase">Next Alarm</span>
                        <span className="text-white font-medium">
                            {config.enabled ? config.time : "No Alarm Set"}
                        </span>
                    </div>
                </div>
                <div className={`w-2 h-2 rounded-full ${config.enabled ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-zinc-700'}`} />
            </div>
        </div>
    );
};

const AlarmTab = ({ config, onUpdateConfig }: { config: AlarmConfig, onUpdateConfig: any }) => {
    const [showRingtoneSelect, setShowRingtoneSelect] = useState(false);
    
    const toggleDay = (dayIndex: number) => {
        const newDays = config.days.includes(dayIndex)
            ? config.days.filter(d => d !== dayIndex)
            : [...config.days, dayIndex].sort();
        onUpdateConfig({ ...config, days: newDays });
    };

    const toggleTask = (task: TaskType) => {
        const newTasks = config.tasks.includes(task)
          ? config.tasks.filter(t => t !== task)
          : [...config.tasks, task];
        onUpdateConfig({ ...config, tasks: newTasks });
    };

    const previewSound = (rt: Ringtone) => {
        onUpdateConfig({ ...config, ringtone: rt });
        // Create a short preview beep logic here if needed, 
        // but for now updating state is enough as user will test alarm.
    };

    const handleCustomAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                await saveCustomAudio(file);
                onUpdateConfig({ ...config, ringtone: Ringtone.CUSTOM });
            } catch (err) {
                console.error("Failed to save custom audio", err);
                alert("Failed to save custom audio. Please try a smaller file.");
            }
        }
    };

    return (
        <div className="px-5 py-8 space-y-8 max-w-2xl mx-auto">
            {/* Header */}
            <div className="flex justify-between items-end">
                 <h2 className="text-3xl font-bold text-white">Alarm</h2>
                 <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-500 uppercase font-bold mr-2">
                        {config.enabled ? 'On' : 'Off'}
                    </span>
                    <button 
                        onClick={() => onUpdateConfig({...config, enabled: !config.enabled})}
                        className={`w-12 h-7 rounded-full transition-colors relative ${config.enabled ? 'bg-green-500' : 'bg-zinc-700'}`}
                    >
                        <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-transform ${config.enabled ? 'left-6' : 'left-1'}`} />
                    </button>
                 </div>
            </div>

            {/* Time Picker Visual */}
            <div className="flex justify-center py-6 bg-zinc-900/30 rounded-3xl border border-zinc-800">
                <input 
                    type="time" 
                    value={config.time}
                    onChange={(e) => onUpdateConfig({...config, time: e.target.value, enabled: true})}
                    className="bg-transparent text-6xl font-black text-white focus:outline-none text-center w-full"
                    style={{ colorScheme: 'dark' }}
                />
            </div>

            {/* Settings List */}
            <div className="space-y-4">
                
                {/* Format Toggle */}
                <div className="bg-zinc-900 rounded-xl overflow-hidden">
                     <div className="flex items-center justify-between p-4 border-b border-zinc-800">
                        <div className="flex items-center gap-3">
                            <Clock className="w-5 h-5 text-orange-500" />
                            <span className="text-white font-medium">24-Hour Time</span>
                        </div>
                        <button 
                            onClick={() => onUpdateConfig({...config, is24Hour: !config.is24Hour})}
                            className={`w-10 h-6 rounded-full transition-colors relative ${config.is24Hour ? 'bg-green-500' : 'bg-zinc-700'}`}
                        >
                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${config.is24Hour ? 'left-5' : 'left-1'}`} />
                        </button>
                    </div>
                </div>

                {/* Repeat */}
                <div className="bg-zinc-900 rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-3 mb-2">
                        <CalendarDays className="w-5 h-5 text-blue-500" />
                        <span className="text-white font-medium">Repeat</span>
                    </div>
                    <div className="flex justify-between">
                        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
                            <button
                                key={idx}
                                onClick={() => toggleDay(idx)}
                                className={`w-8 h-8 rounded-full text-xs font-bold transition-all ${
                                    config.days.includes(idx) 
                                    ? 'bg-blue-600 text-white' 
                                    : 'bg-zinc-800 text-zinc-500'
                                }`}
                            >
                                {day}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Label */}
                <div className="bg-zinc-900 rounded-xl p-4 flex items-center gap-3">
                    <Tag className="w-5 h-5 text-purple-500" />
                    <input 
                        type="text" 
                        value={config.label}
                        onChange={(e) => onUpdateConfig({...config, label: e.target.value})}
                        placeholder="Alarm Label"
                        className="bg-transparent text-white font-medium focus:outline-none w-full placeholder-zinc-600"
                    />
                </div>

                {/* Sound */}
                <div className="bg-zinc-900 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Music2 className="w-5 h-5 text-pink-500" />
                            <span className="text-white font-medium">Sound</span>
                        </div>
                        <button 
                            onClick={() => setShowRingtoneSelect(!showRingtoneSelect)}
                            className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-700 transition-all"
                        >
                            {showRingtoneSelect ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                        </button>
                    </div>
                    
                    <div className="flex items-center justify-between bg-zinc-800/50 p-3 rounded-lg">
                        <span className="text-sm text-zinc-300 font-medium">Current Ringtone</span>
                        <span className="text-xs font-bold text-pink-400 uppercase bg-pink-500/10 px-2 py-1 rounded-md">{config.ringtone}</span>
                    </div>

                    {showRingtoneSelect && (
                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800">
                            {Object.values(Ringtone).filter(rt => rt !== Ringtone.CUSTOM).map((rt) => (
                                <button
                                    key={rt}
                                    onClick={() => previewSound(rt)}
                                    className={`py-2 px-1 rounded-lg text-xs font-bold uppercase transition-all ${
                                        config.ringtone === rt 
                                        ? 'bg-pink-600 text-white' 
                                        : 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700'
                                    }`}
                                >
                                    {rt}
                                </button>
                            ))}
                            <label className={`py-2 px-1 rounded-lg text-xs font-bold uppercase transition-all flex items-center justify-center cursor-pointer ${
                                config.ringtone === Ringtone.CUSTOM 
                                ? 'bg-pink-600 text-white' 
                                : 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700'
                            }`}>
                                <input 
                                    type="file" 
                                    accept="audio/*" 
                                    className="hidden" 
                                    onChange={handleCustomAudioUpload} 
                                />
                                {config.ringtone === Ringtone.CUSTOM ? 'CUSTOM (Active)' : 'Upload Audio'}
                            </label>
                        </div>
                    )}
                </div>

                {/* Tasks */}
                <div className="bg-zinc-900 rounded-xl p-4 space-y-3">
                     <div className="flex items-center gap-3">
                        <Flag className="w-5 h-5 text-red-500" />
                        <span className="text-white font-medium">Required Tasks</span>
                    </div>
                    <div className="space-y-1">
                        {[
                            { type: TaskType.CHANTING, label: '108 Radha Chants' },
                            { type: TaskType.PHOTO_FACE, label: 'Verify Awake Face' },
                            { type: TaskType.READ_SENTENCE, label: 'Read Quote' },
                            { type: TaskType.WALK_STEPS, label: 'Walk 20 Steps' },
                            { type: TaskType.SCAN_QR, label: 'Bathroom Scan' },
                        ].map((task) => (
                            <button
                                key={task.type}
                                onClick={() => toggleTask(task.type)}
                                className="w-full flex items-center justify-between py-3 border-b border-zinc-800 last:border-0"
                            >
                                <span className={`text-sm ${config.tasks.includes(task.type) ? 'text-white' : 'text-zinc-500'}`}>
                                    {task.label}
                                </span>
                                {config.tasks.includes(task.type) && <Check className="w-4 h-4 text-red-500" />}
                            </button>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
};

const StopwatchTab = () => {
    const [time, setTime] = useState(0);
    const [isRunning, setIsRunning] = useState(false);
    const [laps, setLaps] = useState<number[]>([]);
    const intervalRef = useRef<any>(null);

    useEffect(() => {
        if (isRunning) {
            intervalRef.current = setInterval(() => {
                setTime(prev => prev + 10);
            }, 10);
        } else {
            clearInterval(intervalRef.current);
        }
        return () => clearInterval(intervalRef.current);
    }, [isRunning]);

    const format = (ms: number) => {
        const min = Math.floor(ms / 60000);
        const sec = Math.floor((ms % 60000) / 1000);
        const cent = Math.floor((ms % 1000) / 10);
        return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}.${cent.toString().padStart(2, '0')}`;
    };

    const handleLap = () => {
        setLaps([time, ...laps]);
    };

    const handleReset = () => {
        setIsRunning(false);
        setTime(0);
        setLaps([]);
    };

    return (
        <div className="flex flex-col h-full pt-12 px-6 max-w-2xl mx-auto">
            {/* Display */}
            <div className="flex justify-center py-12 md:py-24">
                <span className="text-6xl md:text-8xl font-light font-mono text-white tracking-widest">
                    {format(time)}
                </span>
            </div>

            {/* Controls */}
            <div className="flex justify-between items-center mb-8 px-4 md:px-12">
                <button 
                    onClick={isRunning ? handleLap : handleReset}
                    className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-zinc-800 border-2 border-zinc-700 flex items-center justify-center text-white font-medium active:bg-zinc-700 md:text-lg hover:bg-zinc-700 transition-colors"
                >
                    {isRunning ? "Lap" : "Reset"}
                </button>
                
                <div className="flex gap-2">
                    <div className="w-2 h-2 rounded-full bg-indigo-500/50" />
                    <div className="w-2 h-2 rounded-full bg-indigo-500/50" />
                </div>

                <button 
                    onClick={() => setIsRunning(!isRunning)}
                    className={`w-20 h-20 md:w-24 md:h-24 rounded-full border-2 flex items-center justify-center font-medium transition-colors md:text-lg ${
                        isRunning 
                        ? 'bg-red-900/30 border-red-900 text-red-500 hover:bg-red-900/50' 
                        : 'bg-green-900/30 border-green-900 text-green-500 hover:bg-green-900/50'
                    }`}
                >
                    {isRunning ? "Stop" : "Start"}
                </button>
            </div>

            {/* Laps */}
            <div className="flex-1 overflow-y-auto border-t border-zinc-800 scrollbar-hide">
                {laps.map((lapTime, idx) => (
                    <div key={idx} className="flex justify-between py-4 md:py-6 border-b border-zinc-900 text-sm md:text-base font-mono px-4">
                        <span className="text-zinc-500">Lap {laps.length - idx}</span>
                        <span className="text-white">{format(lapTime)}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

const NavIcon = ({ icon, label, isActive, onClick }: any) => (
    <button onClick={onClick} className={`flex flex-col items-center gap-1 w-20 ${isActive ? 'text-indigo-500' : 'text-zinc-600'}`}>
        {icon}
        <span className="text-[10px] font-medium">{label}</span>
    </button>
);
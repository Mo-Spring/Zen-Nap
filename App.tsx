import React, { useState, useEffect, useRef } from 'react';
import { Background } from './components/Background';
import { CircularTimer } from './components/CircularTimer';
import { WheelPicker } from './components/WheelPicker';
import { IconMap, SettingsIcon } from './components/Icons';
import { AppState, NapMode, SessionStats } from './types';
import { Play, ChevronUp, Music, X, ChevronsUpDown, Upload } from 'lucide-react';

// --- DATA ---
const MODES: NapMode[] = [
  {
    id: 'custom',
    name: '自定义',
    durationMinutes: 30, // Default for custom, but mutable in state
    themeColor: '#94a3b8', // Slate Blue/Grey for custom
    accentColor: 'bg-slate-400',
    iconType: 'custom',
    bgImage: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?q=80&w=2944&auto=format&fit=crop' // Deep space/sky
  },
  {
    id: 'scientific',
    name: '科学小盹 10\'',
    durationMinutes: 10,
    themeColor: '#f472b6', // Pink (Matches Screenshot 12)
    accentColor: 'bg-pink-400',
    iconType: 'coffee',
    bgImage: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=2946&auto=format&fit=crop' // Pinkish sky/sea
  },
  {
    id: 'efficient',
    name: '高效午休 24\'',
    durationMinutes: 24,
    themeColor: '#4ade80', // Green (Matches Screenshot 14)
    accentColor: 'bg-green-500',
    iconType: 'lightning',
    bgImage: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=2560&auto=format&fit=crop' // Forest
  },
  {
    id: 'travel',
    name: '差旅模式 40\'',
    durationMinutes: 40,
    themeColor: '#fbbf24', // Amber/Gold (Matches Screenshot 15)
    accentColor: 'bg-amber-400',
    iconType: 'plane',
    bgImage: 'https://images.unsplash.com/photo-1500964757637-c85e8a162699?q=80&w=2000&auto=format&fit=crop' // Misty Gold Landscape
  },
  {
    id: 'complete',
    name: '完整午休 90\'',
    durationMinutes: 90,
    themeColor: '#3b82f6', // Blue (Matches Screenshot 16)
    accentColor: 'bg-blue-600',
    iconType: 'bed',
    bgImage: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?q=80&w=2613&auto=format&fit=crop' // Foggy City/Blue
  }
];

interface MusicTrack {
  name: string;
  url: string;
}

export default function App() {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [selectedModeIndex, setSelectedModeIndex] = useState(2); // Default to efficient 24'
  const [customDuration, setCustomDuration] = useState(30); // Independent state for custom mode
  
  // Settings State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [painlessWakeUpDuration, setPainlessWakeUpDuration] = useState(10); // Seconds
  const [snoozeDuration, setSnoozeDuration] = useState(5); // Minutes

  // Music State
  const [globalWakeUpMusic, setGlobalWakeUpMusic] = useState<MusicTrack | null>(null);
  const [globalRefreshMusic, setGlobalRefreshMusic] = useState<MusicTrack | null>(null);
  const [modeGuideMusic, setModeGuideMusic] = useState<Record<string, MusicTrack>>({});
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeUploadContext, setActiveUploadContext] = useState<{
      field: 'wakeUp' | 'refresh' | 'guide';
      modeId?: string;
  } | null>(null);

  const [timeLeft, setTimeLeft] = useState(0);
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [sessionStats, setSessionStats] = useState<SessionStats | null>(null);
  
  const timerRef = useRef<number | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Gestures
  const [slideY, setSlideY] = useState(0);
  
  // Custom Time Drag Gestures (kept for reference, though WheelPicker replaces it)
  const dragStartY = useRef<number | null>(null);

  // Long Press to Stop Logic
  const [stopProgress, setStopProgress] = useState(0);
  const stopIntervalRef = useRef<number | null>(null);

  const currentMode = MODES[selectedModeIndex];
  // Determine effective duration based on mode
  const displayDuration = currentMode.id === 'custom' ? customDuration : currentMode.durationMinutes;

  // --- HANDLERS ---

  const handleModeSelect = (index: number) => {
    if (appState !== AppState.IDLE) return;
    setSelectedModeIndex(index);
    
    // Smooth scroll to center the selected item
    const container = scrollContainerRef.current;
    if (container) {
        const buttons = container.querySelectorAll('button');
        const button = buttons[index];
        if (button) {
            const containerCenter = container.clientWidth / 2;
            const buttonCenter = button.offsetLeft + button.offsetWidth / 2;
            container.scrollTo({
                left: buttonCenter - containerCenter,
                behavior: 'smooth'
            });
        }
    }
  };

  const startTimer = (durationOverride?: number) => {
    const durationMin = durationOverride !== undefined ? durationOverride : displayDuration;
    const durationSec = durationMin * 60;
    
    setTimeLeft(durationSec);
    const end = new Date(new Date().getTime() + durationSec * 1000);
    setEndTime(end);
    
    // Only set stats start time if it's a fresh session, otherwise (snooze) we might want to keep original start
    if (!sessionStats) {
        setSessionStats({
            startTime: new Date(),
            endTime: end,
            durationSeconds: durationSec
        });
    } else {
        // Update stats end time
         setSessionStats(prev => prev ? { ...prev, endTime: end, durationSeconds: prev.durationSeconds + durationSec } : null);
    }
    
    setAppState(AppState.RUNNING);
  };

  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (stopIntervalRef.current) {
        clearInterval(stopIntervalRef.current);
        stopIntervalRef.current = null;
    }
    setAppState(AppState.IDLE);
    setSlideY(0);
    setStopProgress(0);
    setSessionStats(null); // Reset stats on full stop
  };

  const finishTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setAppState(AppState.ALARM);
  };

  const completeSession = () => {
    setAppState(AppState.SUMMARY);
  };

  const handleSnooze = () => {
      // Start a timer for the snooze duration
      startTimer(snoozeDuration);
      setSlideY(0); // Reset slide
  };

  // --- MUSIC SETTINGS HANDLERS ---
  const handleUploadClick = (field: 'wakeUp' | 'refresh' | 'guide', modeId?: string) => {
      setActiveUploadContext({ field, modeId });
      if (fileInputRef.current) {
          fileInputRef.current.value = ''; // Reset to allow same file selection
          fileInputRef.current.click();
      }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && activeUploadContext) {
          const url = URL.createObjectURL(file);
          const track = { name: file.name, url };

          if (activeUploadContext.field === 'wakeUp') {
              setGlobalWakeUpMusic(track);
          } else if (activeUploadContext.field === 'refresh') {
              setGlobalRefreshMusic(track);
          } else if (activeUploadContext.field === 'guide' && activeUploadContext.modeId) {
              setModeGuideMusic(prev => ({
                  ...prev,
                  [activeUploadContext.modeId!]: track
              }));
          }
      }
      setActiveUploadContext(null);
  };

  const getMusicStatusText = (field: 'wakeUp' | 'refresh' | 'guide', modeId?: string) => {
      let track: MusicTrack | null | undefined = null;
      if (field === 'wakeUp') track = globalWakeUpMusic;
      else if (field === 'refresh') track = globalRefreshMusic;
      else if (field === 'guide' && modeId) track = modeGuideMusic[modeId];

      if (track) return track.name;
      return null;
  };

  // --- LONG PRESS HANDLERS ---
  const handleStopPressStart = () => {
    if (stopIntervalRef.current) return;
    const startTime = Date.now();
    const DURATION = 3000; // 3 seconds

    stopIntervalRef.current = window.setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / DURATION, 1);
        setStopProgress(progress);

        if (progress >= 1) {
            stopTimer(); // This will clear the interval inside stopTimer
        }
    }, 16);
  };

  const handleStopPressEnd = () => {
    if (stopIntervalRef.current) {
        clearInterval(stopIntervalRef.current);
        stopIntervalRef.current = null;
    }
    // Quickly animate back to 0 or just snap
    setStopProgress(0);
  };

  // --- EFFECTS ---

  useEffect(() => {
    if (appState === AppState.RUNNING && timeLeft > 0) {
      timerRef.current = window.setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            finishTimer();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (stopIntervalRef.current) clearInterval(stopIntervalRef.current);
    };
  }, [appState]);

  // Wake up time string
  const getWakeUpTimeString = () => {
    const target = endTime || new Date(new Date().getTime() + displayDuration * 60000);
    return target.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  // Slide to stop logic - Touch
  const handleAlarmTouchMove = (e: React.TouchEvent) => {
    if (appState !== AppState.ALARM) return;
    const touch = e.touches[0];
    const screenH = window.innerHeight;
    const y = touch.clientY;
    
    // Inverted: moving up decreases Y
    const delta = screenH - y;
    
    // Threshold to unlock
    if (delta > 200) {
        completeSession();
    }
    
    setSlideY(Math.min(delta, 250));
  };

  const handleAlarmTouchEnd = () => {
    if (appState === AppState.ALARM && slideY < 200) {
        setSlideY(0); // Snap back
    }
  };

  // Slide to stop logic - Mouse
  const handleAlarmMouseDown = (e: React.MouseEvent) => {
      if (appState !== AppState.ALARM) return;
      dragStartY.current = e.clientY; // Use dragStartY as a flag that mouse is down
  };

  const handleAlarmMouseMove = (e: React.MouseEvent) => {
      if (appState !== AppState.ALARM || dragStartY.current === null) return;
      
      const screenH = window.innerHeight;
      const y = e.clientY;
      
      // Moving mouse up decreases Y, so delta (distance from bottom) increases
      const delta = screenH - y;
      
      if (delta > 200) {
          completeSession();
          dragStartY.current = null; // Reset
      }
      setSlideY(Math.min(delta, 250));
  };

  const handleAlarmMouseUp = () => {
      if (appState !== AppState.ALARM) return;
      dragStartY.current = null;
      if (slideY < 200) {
          setSlideY(0);
      }
  };


  // --- RENDER HELPERS ---

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return { m, s };
  };

  const { m, s } = formatTime(timeLeft);
  const StartIcon = IconMap[currentMode.iconType];

  return (
    <div 
        className="relative w-full h-full overflow-hidden font-light" 
        onTouchMove={handleAlarmTouchMove} 
        onTouchEnd={handleAlarmTouchEnd}
        onMouseDown={handleAlarmMouseDown}
        onMouseMove={handleAlarmMouseMove}
        onMouseUp={handleAlarmMouseUp}
        onMouseLeave={handleAlarmMouseUp}
    >
      <Background color={currentMode.themeColor} image={currentMode.bgImage} />

      {/* Hidden File Input */}
      <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept="audio/*" 
          onChange={onFileChange}
      />

      {/* --- SETTINGS MODAL --- */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 bg-[#0B0D14] flex flex-col animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/5 bg-[#0B0D14] shrink-0 z-20">
                <div className="text-xl font-semibold tracking-wide text-white">设置</div>
                <button onClick={() => setIsSettingsOpen(false)} className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors">
                    <X className="w-5 h-5 text-white/70" />
                </button>
            </div>
            
            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 pb-12 no-scrollbar">
                
                {/* General Settings */}
                <div className="mb-2">
                    <div className="text-xs text-white/40 font-bold mb-3 uppercase tracking-wider pl-1">通用设置</div>
                    
                    {/* Snooze */}
                    <div className="bg-[#161821] rounded-xl mb-4 overflow-hidden border border-white/5">
                        <div className="p-4 flex items-center justify-between">
                            <div>
                                <div className="text-base font-medium text-white/90">再睡一会</div>
                                <div className="text-xs text-white/40 mt-1">闹钟响铃后的贪睡时长</div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="bg-[#242630] rounded-lg px-2 py-1 min-w-[3.5rem] text-center border border-white/10">
                                    <input 
                                        type="number" 
                                        value={snoozeDuration}
                                        onChange={(e) => setSnoozeDuration(Math.max(1, Number(e.target.value)))}
                                        className="bg-transparent text-white text-center w-full focus:outline-none"
                                    />
                                </div>
                                <span className="text-sm text-white/60">分钟</span>
                            </div>
                        </div>
                    </div>

                    {/* Painless Wake Up & Audio */}
                    <div className="bg-[#161821] rounded-xl mb-4 overflow-hidden border border-white/5">
                        <div className="p-4 flex items-center justify-between">
                            <div>
                                <div className="text-base font-medium text-white/90">无痛唤醒</div>
                                <div className="text-xs text-white/40 mt-1">提前播放唤醒音 (单位: 秒)</div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="bg-[#242630] rounded-lg px-2 py-1 min-w-[3.5rem] text-center border border-white/10">
                                    <input 
                                        type="number" 
                                        value={painlessWakeUpDuration}
                                        onChange={(e) => setPainlessWakeUpDuration(Math.max(0, Number(e.target.value)))}
                                        className="bg-transparent text-white text-center w-full focus:outline-none"
                                    />
                                </div>
                                <span className="text-sm text-white/60">秒</span>
                            </div>
                        </div>
                        
                        <div className="border-t border-white/5 mx-4" />
                        
                        <div className="p-4 flex items-center justify-between">
                            <div className="flex flex-col">
                                <span className="text-base font-medium text-white/90">唤醒音频</span>
                                {getMusicStatusText('wakeUp') && (
                                    <span className="text-xs text-white/40 mt-1 max-w-[150px] truncate">{getMusicStatusText('wakeUp')}</span>
                                )}
                            </div>
                            <button 
                                onClick={() => handleUploadClick('wakeUp')}
                                className="flex items-center gap-2 bg-[#242630] hover:bg-[#2d303a] transition-colors px-4 py-2 rounded-lg border border-white/10"
                            >
                                <Upload className="w-4 h-4 text-white/70" />
                                <span className="text-xs font-medium text-white/70">选择文件</span>
                            </button>
                        </div>
                    </div>

                    {/* Refresh Audio */}
                    <div className="bg-[#161821] rounded-xl mb-6 overflow-hidden border border-white/5">
                            <div className="p-4 flex items-center justify-between">
                            <div className="flex flex-col">
                                <span className="text-base font-medium text-white/90">提神醒脑音频</span>
                                <span className="text-xs text-white/40 mt-1">小憩结束总结页面播放</span>
                                {getMusicStatusText('refresh') && (
                                    <span className="text-xs text-white/60 mt-1 max-w-[150px] truncate">当前: {getMusicStatusText('refresh')}</span>
                                )}
                            </div>
                            <button 
                                onClick={() => handleUploadClick('refresh')}
                                className="flex items-center gap-2 bg-[#242630] hover:bg-[#2d303a] transition-colors px-4 py-2 rounded-lg border border-white/10"
                            >
                                <Upload className="w-4 h-4 text-white/70" />
                                <span className="text-xs font-medium text-white/70">选择文件</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mode Exclusive Guide Music */}
                <div className="mb-2">
                    <div className="text-xs text-white/40 font-bold mb-3 uppercase tracking-wider pl-1">模式专属引导音乐</div>
                    
                    <div className="bg-[#161821] rounded-xl overflow-hidden border border-white/5">
                        {MODES.map((mode, idx) => {
                            const ModeIcon = IconMap[mode.iconType];
                            const trackName = getMusicStatusText('guide', mode.id);
                            
                            return (
                                <div key={mode.id}>
                                    <div className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className="p-2 rounded-lg bg-[#242630] text-white/70 border border-white/5">
                                                <ModeIcon className="w-5 h-5" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium text-white/90">{mode.name.split(' ')[0]}</span>
                                                {trackName && (
                                                    <span className="text-xs text-white/40 max-w-[120px] truncate">{trackName}</span>
                                                )}
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => handleUploadClick('guide', mode.id)}
                                            className={`p-3 rounded-lg border transition-all ${trackName ? 'bg-white/10 border-white/20 text-white' : 'bg-[#242630] border-white/10 text-white/50 hover:text-white'}`}
                                        >
                                            <Upload className="w-4 h-4" />
                                        </button>
                                    </div>
                                    {idx < MODES.length - 1 && <div className="border-t border-white/5 mx-4" />}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* --- IDLE STATE UI --- */}
      {appState === AppState.IDLE && (
        <div className="flex flex-col h-full animate-fade-in relative z-10">
            {/* Header / Nav */}
            <div className="pt-12 px-6 flex justify-between items-center text-white/80 relative z-40">
                <div className="w-6 h-6" /> {/* Spacer for balance since Left icon is removed */}
                <div className="text-lg tracking-wide font-medium">小憩</div>
                <button 
                    onClick={() => setIsSettingsOpen(true)}
                    className="p-1 rounded-full active:bg-white/10 transition-colors"
                >
                    <SettingsIcon />
                </button>
            </div>

            {/* Mode Selector */}
            <div className="relative z-30">
                <div 
                    ref={scrollContainerRef}
                    className="mt-8 flex overflow-x-auto space-x-2 px-4 pb-4 no-scrollbar snap-x snap-mandatory"
                    style={{ maskImage: 'linear-gradient(to right, transparent, black 5%, black 95%, transparent)' }}
                >
                    {MODES.map((mode, idx) => (
                        <button
                            key={mode.id}
                            onClick={() => handleModeSelect(idx)}
                            className={`
                                whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 snap-center
                                ${idx === selectedModeIndex ? 'bg-white/20 text-white backdrop-blur-md border border-white/30' : 'text-white/50 hover:text-white/80'}
                            `}
                        >
                            {mode.name}
                        </button>
                    ))}
                    {/* Extra spacing for scrolling */}
                    <div className="w-4 flex-shrink-0" />
                </div>
            </div>

            {/* Main Center Content */}
            <div className="flex-1 flex flex-col items-center justify-center mt-0 relative z-10 pointer-events-none">
                
                {/* Clock Block */}
                <div className="relative flex items-center justify-center pointer-events-none min-h-[260px]">
                    {/* Dashed Circle Background (Decorative) - Hide for custom mode */}
                    {currentMode.id !== 'custom' && (
                        <CircularTimer progress={0} size={230} showTicks={true} color="transparent" />
                    )}
                    
                    {/* Centered Time and Unit */}
                    <div className={`${currentMode.id === 'custom' ? 'relative' : 'absolute inset-0'} flex flex-col items-center justify-center pointer-events-auto`}>
                        
                        {/* Custom Mode: Scroll Wheel Picker */}
                        {currentMode.id === 'custom' ? (
                            <WheelPicker 
                                value={customDuration}
                                min={1}
                                max={180}
                                onChange={setCustomDuration}
                            />
                        ) : (
                            /* Standard Modes: Static Text */
                            <div className="flex flex-col items-center justify-center select-none">
                                <div className="text-[72px] leading-none font-thin text-white tracking-tighter tabular-nums drop-shadow-lg flex items-center">
                                    {displayDuration}
                                </div>
                                <div className="flex items-center gap-2 mt-2">
                                    <div className="text-lg text-white/90 font-light tracking-widest">
                                        分钟
                                    </div>
                                </div>
                            </div>
                        )}

                    </div>
                </div>

                {/* NOTE: Wake Up Time Block removed from here to avoid overlap, moved to bottom controls */}
            </div>

            {/* Bottom Controls */}
            <div className="pb-16 flex flex-col items-center justify-center w-full relative z-20">
                
                {/* Wake Up Time Block - Moved here for better layout */}
                <div className="text-white/70 text-sm font-light mb-8 transition-opacity">
                    将在 {getWakeUpTimeString()} 唤醒你
                </div>

                {/* Custom Music Pill */}
                <button className="flex items-center space-x-2 bg-white/10 hover:bg-white/20 backdrop-blur-md px-5 py-2.5 rounded-full text-white/90 transition-all border border-white/10 mb-12">
                    <Play className="w-3 h-3 fill-current" />
                    <span className="text-sm">
                        {getMusicStatusText('guide', currentMode.id) 
                            ? `专属引导: ${getMusicStatusText('guide', currentMode.id)}` 
                            : '特制引导音乐'
                        }
                    </span>
                </button>

                <div className="flex items-center justify-between w-full px-12">
                     {/* Removed Music Button, replaced with spacer for layout balance */}
                     <div className="w-6 h-6" />

                     <button 
                        onClick={() => startTimer()}
                        className="w-20 h-20 bg-white rounded-full flex items-center justify-center transition-transform active:scale-95 group relative"
                        style={{ boxShadow: `0 0 40px ${currentMode.themeColor}50` }}
                     >
                        <StartIcon 
                            className="w-8 h-8 transition-colors duration-300"
                            style={{ color: currentMode.themeColor }}
                            fill="currentColor" 
                            strokeWidth={0} 
                        />
                     </button>

                     <div className="w-6 h-6" /> {/* Spacer for balance */}
                </div>
                
                <div className="mt-6 text-white/50 text-xs pointer-events-none">开始小憩</div>
            </div>
        </div>
      )}

      {/* --- RUNNING STATE UI --- */}
      {appState === AppState.RUNNING && (
        <div className="absolute inset-0 z-20 flex flex-col h-full animate-fade-in bg-black/20 backdrop-blur-sm">
             {/* Header */}
             <div className="pt-12 px-6 flex justify-center items-center text-white/80 relative">
                 <div className="text-lg font-light tracking-wide opacity-80">{currentMode.name.split(' ')[0]}</div>
             </div>

             {/* Main Content */}
             <div className="flex-1 flex flex-col items-center justify-center mt-0">
                 {/* Clock Block */}
                 <div className="relative flex items-center justify-center">
                     <CircularTimer progress={1 - (timeLeft / (displayDuration * 60))} size={250} color="white" />
                     
                     <div className="absolute inset-0 flex flex-col items-center justify-center">
                         {/* Precise MM:SS format */}
                         <div className="text-7xl font-thin tabular-nums tracking-tighter text-white leading-none">
                             {m.toString().padStart(2, '0')}:{s.toString().padStart(2, '0')}
                         </div>
                     </div>
                 </div>

                 {/* Wake Up Time Block - Distinctly below */}
                 <div className="text-white/60 text-sm mt-8 font-light tracking-wide">
                     将在 {endTime?.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })} 唤醒你
                 </div>
             </div>

             {/* Bottom Controls */}
             <div className="pb-24 w-full flex flex-col items-center justify-center">
                 <div className="relative flex items-center justify-center">
                    {/* Long Press Progress Ring */}
                    <svg className="absolute w-[88px] h-[88px] pointer-events-none transform -rotate-90">
                         {/* Background track */}
                         <circle 
                            r="42" 
                            cx="44" 
                            cy="44" 
                            fill="transparent" 
                            stroke="rgba(255,255,255,0.1)" 
                            strokeWidth="2" 
                         />
                         {/* Progress indicator */}
                         <circle 
                            r="42" 
                            cx="44" 
                            cy="44" 
                            fill="transparent" 
                            stroke="white" 
                            strokeWidth="3" 
                            strokeDasharray={2 * Math.PI * 42}
                            strokeDashoffset={2 * Math.PI * 42 * (1 - stopProgress)}
                            strokeLinecap="round"
                            className="transition-all duration-75 ease-linear"
                         />
                    </svg>

                    <button 
                        onMouseDown={handleStopPressStart}
                        onMouseUp={handleStopPressEnd}
                        onMouseLeave={handleStopPressEnd}
                        onTouchStart={handleStopPressStart}
                        onTouchEnd={handleStopPressEnd}
                        className="w-16 h-16 rounded-full border border-white/30 flex items-center justify-center text-white/80 backdrop-blur-md active:bg-white/10 transition-colors z-10"
                    >
                        <div className="w-3 h-3 bg-white rounded-[1px]" />
                    </button>
                 </div>
                 <div className="mt-4 text-white/40 text-xs tracking-wider">长按停止</div>
             </div>
        </div>
      )}

      {/* --- ALARM/WAKE UP STATE UI --- */}
      {appState === AppState.ALARM && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-between pb-16 pt-20 animate-fade-in overflow-hidden">
             
             {/* Background Image for Alarm */}
             <div className="absolute inset-0 z-[-1]">
                 <img 
                    src="https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?q=80&w=2940&auto=format&fit=crop" 
                    className="w-full h-full object-cover opacity-60 scale-110"
                    alt="Morning"
                 />
                 <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />
                 {/* Bottom gradient to ensure text readability */}
                 <div className="absolute bottom-0 left-0 w-full h-40 bg-gradient-to-t from-black/80 to-transparent" />
             </div>

             <div className="text-center mt-10 relative z-10">
                 <div className="flex items-center justify-center mb-4">
                    <Music className="w-6 h-6 text-white/80 mr-2" />
                    <span className="text-white/80 text-lg">
                        {getMusicStatusText('wakeUp') ? `正在播放: ${getMusicStatusText('wakeUp')}` : '小憩结束'}
                    </span>
                 </div>
                 <div className="text-7xl font-light text-white mb-2">
                    {new Date().toLocaleTimeString('zh-CN', {hour:'2-digit', minute:'2-digit', hour12: false})}
                 </div>
             </div>

             <div className="relative w-64 h-64 flex items-center justify-center z-10">
                {/* Ripples */}
                <div className="absolute inset-0 border border-white/20 rounded-full animate-ping opacity-20 pointer-events-none" style={{ animationDuration: '3s' }} />
                <div className="absolute inset-4 border border-white/20 rounded-full animate-ping opacity-30 pointer-events-none" style={{ animationDelay: '0.5s', animationDuration: '3s' }} />
                
                {/* Snooze Button - Clickable */}
                <div 
                    onClick={handleSnooze}
                    className="z-10 bg-white/10 hover:bg-white/20 backdrop-blur-lg w-48 h-48 rounded-full flex flex-col items-center justify-center text-center px-4 border border-white/10 cursor-pointer transition-all active:scale-95 active:bg-white/30"
                >
                    <div className="text-xl font-medium mb-1">再睡{snoozeDuration}分钟</div>
                    <div className="text-xs text-white/60">「多倍劫」唤醒你</div>
                </div>
             </div>

             <div className="flex flex-col items-center w-full relative h-32 justify-end z-10">
                 <div 
                    className="flex flex-col items-center transition-transform duration-100 ease-out cursor-pointer pb-8"
                    style={{ transform: `translateY(-${slideY}px)` }}
                 >
                     <ChevronUp className="w-6 h-6 text-white/70 animate-bounce" />
                     <div className="text-white/70 text-sm mt-2 font-medium tracking-wide">上滑停止唤醒</div>
                 </div>
             </div>
        </div>
      )}

      {/* --- SUMMARY STATE UI --- */}
      {appState === AppState.SUMMARY && sessionStats && (
        <div className="absolute inset-0 z-40 bg-black/60 backdrop-blur-xl flex flex-col items-center justify-center p-6 animate-fade-in">
             
             {/* Card */}
             <div className="w-full max-w-sm bg-[#2a2a35] rounded-3xl p-6 shadow-2xl relative overflow-hidden">
                {/* Top illustration placeholder */}
                <div className="absolute top-0 right-0 w-32 h-32 opacity-20">
                     <img src="https://picsum.photos/id/40/200/200" className="mask-image-gradient" alt="cat" />
                </div>
                
                <div className="relative z-10">
                    <div className="text-gray-400 text-sm mb-1">{currentMode.name}</div>
                    <div className="text-gray-500 text-xs mb-6">
                        {new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'long' })}
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-8">
                        <div>
                            <div className="text-gray-500 text-xs mb-1">就寝</div>
                            <div className="text-white text-xl font-light">
                                {sessionStats.startTime.toLocaleTimeString('zh-CN', {hour:'2-digit', minute:'2-digit', hour12: false})}
                            </div>
                        </div>
                        <div>
                            <div className="text-gray-500 text-xs mb-1">起床</div>
                            <div className="text-white text-xl font-light">
                                {new Date().toLocaleTimeString('zh-CN', {hour:'2-digit', minute:'2-digit', hour12: false})}
                            </div>
                        </div>
                        <div>
                            <div className="text-gray-500 text-xs mb-1">总时长</div>
                            <div className="text-white text-xl font-light">
                                {(sessionStats.durationSeconds / 60).toFixed(1)} <span className="text-xs">分</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-[#3b3b47] rounded-xl p-4 flex items-center justify-between">
                         <div className="flex flex-col">
                            <span className="text-gray-300 text-sm">来点提神醒脑白噪音</span>
                            {getMusicStatusText('refresh') && (
                                <span className="text-xs text-white/50">{getMusicStatusText('refresh')}</span>
                            )}
                         </div>
                         <Play className="w-4 h-4 text-white fill-current" />
                    </div>
                </div>
             </div>

             <button onClick={() => setAppState(AppState.IDLE)} className="mt-8 p-4 rounded-full bg-white/10 hover:bg-white/20 transition-colors">
                <X className="w-6 h-6 text-white" />
             </button>
        </div>
      )}
    </div>
  );
}
import React, { useState, useEffect, useRef } from 'react';
import { Background } from './components/Background';
import { CircularTimer } from './components/CircularTimer';
import { WheelPicker } from './components/WheelPicker';
import { IconMap, SettingsIcon } from './components/Icons';
import { AppState, NapMode, SessionStats } from './types';
import { X, Upload } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';

// --- DATA ---
const MODES: NapMode[] = [
  {
    id: 'custom',
    name: '自定义',
    durationMinutes: 30,
    themeColor: '#94a3b8',
    accentColor: 'bg-slate-400',
    iconType: 'custom',
    bgImage: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?q=80&w=2944&auto=format&fit=crop'
  },
  {
    id: 'scientific',
    name: '科学小盹 10\'',
    durationMinutes: 10,
    themeColor: '#f472b6',
    accentColor: 'bg-pink-400',
    iconType: 'coffee',
    bgImage: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=2946&auto=format&fit=crop'
  },
  {
    id: 'efficient',
    name: '高效午休 24\'',
    durationMinutes: 24,
    themeColor: '#4ade80',
    accentColor: 'bg-green-500',
    iconType: 'lightning',
    bgImage: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=2560&auto=format&fit=crop'
  },
  {
    id: 'travel',
    name: '差旅模式 40\'',
    durationMinutes: 40,
    themeColor: '#fbbf24',
    accentColor: 'bg-amber-400',
    iconType: 'plane',
    bgImage: 'https://images.unsplash.com/photo-1500964757637-c85e8a162699?q=80&w=2000&auto=format&fit=crop'
  },
  {
    id: 'complete',
    name: '完整午休 90\'',
    durationMinutes: 90,
    themeColor: '#3b82f6',
    accentColor: 'bg-blue-600',
    iconType: 'bed',
    bgImage: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?q=80&w=2613&auto=format&fit=crop'
  }
];

interface MusicTrack {
  name: string;
  path: string;
}

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = (error) => reject(error);
  });

// Animated Playing Icon Component
const PlayingIcon = () => (
  <div className="flex items-end justify-center gap-[2px] w-3 h-3 mb-[2px]">
    <div className="w-[2px] bg-current rounded-full animate-sound-wave" style={{ animationDelay: '0s' }}></div>
    <div className="w-[2px] bg-current rounded-full animate-sound-wave" style={{ animationDelay: '0.1s' }}></div>
    <div className="w-[2px] bg-current rounded-full animate-sound-wave" style={{ animationDelay: '0.2s' }}></div>
  </div>
);

export default function App() {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [selectedModeIndex, setSelectedModeIndex] = useState(2);
  const [customDuration, setCustomDuration] = useState(30);
  
  // 动画状态
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationProgress, setAnimationProgress] = useState(0);
  // Settings State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [painlessWakeUpDuration, setPainlessWakeUpDuration] = useState(10);
  const [snoozeDuration, setSnoozeDuration] = useState(5);
  // Music State
  const [globalWakeUpMusic, setGlobalWakeUpMusic] = useState<MusicTrack | null>(null);
  const [globalRefreshMusic, setGlobalRefreshMusic] = useState<MusicTrack | null>(null);
  const [modeGuideMusic, setModeGuideMusic] = useState<Record<string, MusicTrack>>({});
  
  // Audio Playback State
  const [playingAudioPath, setPlayingAudioPath] = useState<string | null>(null);
  
  // Timer State
  const [timeLeft, setTimeLeft] = useState(0);
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [sessionStats, setSessionStats] = useState<SessionStats | null>(null);
  
  // 新增：修复缺失的状态变量
  const [activeUploadContext, setActiveUploadContext] = useState<{
      field: 'wakeUp' | 'refresh' | 'guide';
      modeId?: string;
  } | null>(null);
  
  // Gesture State
  const [slideY, setSlideY] = useState(0);
  
  // Long Press to Stop State
  const [stopProgress, setStopProgress] = useState(0);
  
  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const stopIntervalRef = useRef<number | null>(null);
  
  // Gesture Refs
  const dragStartY = useRef<number | null>(null);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const isDragging = useRef(false);
  
  const currentMode = MODES[selectedModeIndex];
  const displayDuration = currentMode.id === 'custom' ? customDuration : currentMode.durationMinutes;

  // --- EFFECTS ---
  useEffect(() => {
    const savedSettings = localStorage.getItem('zenNapSettings');
    if (savedSettings) {
        try {
            const settings = JSON.parse(savedSettings);
            if(settings.music) {
                setGlobalWakeUpMusic(settings.music.wakeUp || null);
                setGlobalRefreshMusic(settings.music.refresh || null);
                setModeGuideMusic(settings.music.guides || {});
            }
        } catch (e) {
            console.error("Failed to parse settings from localStorage", e);
        }
    }
  }, []);

  useEffect(() => {
    const settings = {
        music: {
            wakeUp: globalWakeUpMusic,
            refresh: globalRefreshMusic,
            guides: modeGuideMusic,
        }
    };
    localStorage.setItem('zenNapSettings', JSON.stringify(settings));
  }, [globalWakeUpMusic, globalRefreshMusic, modeGuideMusic]);

  // 计时器逻辑
  useEffect(() => {
    if (appState === AppState.RUNNING && startTime && timeLeft > 0) {
      const updateTimer = () => {
        if (!startTime) {
          finishTimer();
          return;
        }
        
        const now = Date.now();
        const elapsedSeconds = Math.floor((now - startTime.getTime()) / 1000);
        const totalDurationSeconds = displayDuration * 60;
        const remaining = Math.max(0, totalDurationSeconds - elapsedSeconds);
        
        setTimeLeft(remaining);
        
        if (remaining <= 0) {
          finishTimer();
        } else {
          animationFrameRef.current = requestAnimationFrame(updateTimer);
        }
      };
      
      animationFrameRef.current = requestAnimationFrame(updateTimer);
    }
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [appState, startTime, displayDuration]);

  // 动画效果（入场）
  useEffect(() => {
    if (isAnimating) {
      const duration = 500;
      const startTime = Date.now();
      
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        const easeOutCubic = 1 - Math.pow(1 - progress, 3);
        setAnimationProgress(easeOutCubic);
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          setIsAnimating(false);
          setAnimationProgress(0);
          startTimerInternal();
        }
      };
      
      requestAnimationFrame(animate);
    }
  }, [isAnimating]);

  // --- AUDIO HANDLERS ---
  
  const playAudio = (trackPath: string | undefined) => {
      if (!audioRef.current) return;
      if (!trackPath) {
          console.log("No audio track selected");
          return;
      }
      if (playingAudioPath === trackPath && !audioRef.current.paused) {
          audioRef.current.pause();
          setPlayingAudioPath(null);
          return;
      }
      let audioSrc = trackPath;
      if (Capacitor.isNativePlatform()) {
          audioSrc = Capacitor.convertFileSrc(trackPath);
      }
      
      audioRef.current.src = audioSrc;
      audioRef.current.load();
      
      audioRef.current.play()
          .then(() => {
              setPlayingAudioPath(trackPath);
          })
          .catch(e => {
              console.error("Error playing audio:", e);
              setPlayingAudioPath(null);
          });
  };

  const stopAllAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setPlayingAudioPath(null);
    }
  };

  // --- SETTINGS HANDLERS ---
  const handleUploadClick = (field: 'wakeUp' | 'refresh' | 'guide', modeId?: string) => {
      setActiveUploadContext({ field, modeId });
      if (fileInputRef.current) {
          fileInputRef.current.value = '';
          fileInputRef.current.click();
      }
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && activeUploadContext) {
          try {
              const base64Data = await fileToBase64(file);
              const fileName = `${Date.now()}-${file.name}`;
              
              const result = await Filesystem.writeFile({
                  path: fileName,
                  data: base64Data,
                  directory: Directory.Data,
              });
              const track: MusicTrack = { name: file.name, path: result.uri };
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
          } catch (error) {
              console.error("Failed to save file:", error);
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
  
  // --- TIMER HANDLERS ---
  const handleModeSelect = (index: number) => {
    if (appState !== AppState.IDLE || isAnimating) return;
    const newIndex = Math.max(0, Math.min(MODES.length - 1, index));
    setSelectedModeIndex(newIndex);
    
    if (MODES[newIndex].id === 'custom') {
        setCustomDuration(MODES[newIndex].durationMinutes);
    }
    
    const container = scrollContainerRef.current;
    if (container) {
        const buttons = container.querySelectorAll('button');
        const button = buttons[newIndex];
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

  const startTimerInternal = () => {
    const durationMin = displayDuration;
    const durationSec = durationMin * 60;
    
    setTimeLeft(durationSec);
    const now = new Date();
    const end = new Date(now.getTime() + durationSec * 1000);
    setStartTime(now);
    setEndTime(end);
    
    if (!sessionStats) {
        setSessionStats({
            startTime: now,
            endTime: end,
            durationSeconds: durationSec
        });
    } else {
         setSessionStats(prev => prev ? { 
           ...prev, 
           endTime: end, 
           durationSeconds: prev.durationSeconds + durationSec 
         } : null);
    }
    
    setAppState(AppState.RUNNING);
  };

  const startTimer = () => {
    if (isAnimating || appState !== AppState.IDLE) return;
    setIsAnimating(true);
  };

  const stopTimer = () => {
    if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrame Refuge.current);
        animationFrameRef.current = null;
    }
    if (stopIntervalRef.current) {
        clearInterval(stopIntervalRef.current);
        stopIntervalRef.current = null;
    }
    setIsAnimating(false);
    setAnimationProgress(0);
    setAppState(AppState.IDLE);
    setSessionStats(null);
    setStartTime(null);
    setEndTime(null);
    stopAllAudio();
  };

  const finishTimer = () => {
    if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
    }
    setAppState(AppState.ALARM);
    if (globalWakeUpMusic?.path) {
      playAudio(globalWakeUpMusic.path);
    }
  };

  const completeSession = () => {
    stopAllAudio();
    setAppState(AppState.SUMMARY);
  };

  const handleSnooze = () => {
    stopAllAudio();
    startTimerInternal();
    setSlideY(0);
  };

  // --- GESTURE HANDLERS ---
  const handleStopPressStart = () => {
    if (stopIntervalRef.current || isAnimating) return;
    const startTime = Date.now();
    const DURATION = 3000;
    stopIntervalRef.current = window.setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / DURATION, 1);
        setStopProgress(progress);
        if (progress >= 1) {
            stopTimer();
        }
    }, 16);
  };

  const handleStopPressEnd = () => {
    if (stopIntervalRef.current) {
        clearInterval(stopIntervalRef.current);
        stopIntervalRef.current = null;
    }
    setStopProgress(0);
  };
  
  const handleTouchStart = (e: React.TouchEvent) => {
    if (appState !== AppState.IDLE || isAnimating) return;
    touchStartX.current = e.targetTouches[0].clientX;
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (appState !== AppState.IDLE || isAnimating || touchStartX.current === null) return;
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (appState !== AppState.IDLE || isAnimating || touchStartX.current === null || touchEndX.current === null) return;
    
    const diff = touchStartX.current - touchEndX.current;
    const SWIPE_THRESHOLD = 50;
    if (Math.abs(diff) > SWIPE_THRESHOLD) {
      if (diff > 0) {
        handleModeSelect(selectedModeIndex + 1);
      } else {
        handleModeSelect(selectedModeIndex - 1);
      }
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (appState !== AppState.IDLE || isAnimating) return;
    touchStartX.current = e.clientX;
    isDragging.current = true;
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (appState !== AppState.IDLE || isAnimating || !isDragging.current || touchStartX.current === null) {
      isDragging.current = false;
      return;
    }
    isDragging.current = false;
    touchEndX.current = e.clientX;
    
    const diff = touchStartX.current - touchEndX.current;
    const SWIPE_THRESHOLD = 50;
    if (Math.abs(diff) > SWIPE_THRESHOLD) {
      if (diff > 0) {
        handleModeSelect(selectedModeIndex + 1);
      } else {
        handleModeSelect(selectedModeIndex - 1);
      }
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };
  
  const handleMouseLeave = (e: React.MouseEvent) => {
    if (isDragging.current) {
      handleMouseUp(e);
    }
  };

  const handleAlarmTouchStart = (e: React.TouchEvent) => {
    if (appState !== AppState.ALARM) return;
    dragStartY.current = e.touches[0].clientY;
  };

  const handleAlarmTouchMove = (e: React.TouchEvent) => {
    if (appState !== AppState.ALARM || dragStartY.current === null) return;
    const touch = e.touches[0];
    const screenH = window.innerHeight;
    const y = touch.clientY;
    
    const delta = screenH - y;
    
    if (delta > 200) {
        completeSession();
    }
    
    setSlideY(Math.min(delta, 250));
  };

  const handleAlarmTouchEnd = () => {
    if (appState === AppState.ALARM && slideY < 200) {
        setSlideY(0);
    }
  };

  const handleAlarmMouseDown = (e: React.MouseEvent) => {
      if (appState !== AppState.ALARM) return;
      dragStartY.current = e.clientY;
  };

  const handleAlarmMouseMove = (e: React.MouseEvent) => {
      if (appState !== AppState.ALARM || dragStartY.current === null) return;
      
      const screenH = window.innerHeight;
      const y = e.clientY;
      
      const delta = screenH - y;
      
      if (delta > 200) {
          completeSession();
          dragStartY.current = null;
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

  const getWakeUpTimeString = () => {
    const target = endTime || new Date(new Date().getTime() + displayDuration * 60000);
    return target.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return { m, s };
  };

  const { m, s } = formatTime(timeLeft);
  const StartIcon = IconMap[currentMode.iconType];

  // UI opacity for exit animation
  const uiOpacity = 1 - animationProgress;
  const blurAmount = animationProgress * 10;

  return (
    <div 
      className="relative w-full h-full overflow-hidden font-light"
      onTouchMove={handleAlarmTouchMove} 
      onTouchEnd={handleAlarmTouchEnd}
      onMouseDown={handleAlarmMouseDown}
      onMouseMove={handleAlarmMouseMove}
      onMouseUp={handleAlarmMouseUp}
    >
      <Background color={currentMode.themeColor} image={currentMode.bgImage} />
      
      {/* 👇 新增：常驻毛玻璃背景（IDLE 时也模糊） */}
      <div className="absolute inset-0 z-1 bg-black/20 backdrop-blur-xl" />

      {/* 背景动态模糊层（动画叠加） */}
      <div 
        className="absolute inset-0 z-5 transition-all duration-300"
        style={{ 
          backdropFilter: `blur(${blurAmount}px)`,
          WebkitBackdropFilter: `blur(${blurAmount}px)`,
        }}
      />
      
      <audio 
        ref={audioRef} 
        className="hidden" 
        onEnded={() => setPlayingAudioPath(null)}
        onPause={() => setPlayingAudioPath(null)}
      />
      
      <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept="audio/*" 
          onChange={onFileChange}
      />
      
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 bg-[#0B0D14] flex flex-col animate-fade-in">
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/5 bg-[#0B0D14] shrink-0 z-20">
                <div className="text-xl font-semibold tracking-wide text-white">设置</div>
                <button onClick={() => setIsSettingsOpen(false)} className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors">
                    <X className="w-5 h-5 text-white/70" />
                </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 pb-12 no-scrollbar">
                
                <div className="mb-2">
                    <div className="text-xs text-white/40 font-bold mb-3 uppercase tracking-wider pl-1">通用设置</div>
                    
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

      {appState === AppState.IDLE && (
        <div className="flex flex-col h-full relative z-10">
          {/* 顶部栏 —— 上滑 + 渐隐 + iOS 弹性 */}
          <div
            className="pt-12 px-6 flex justify-between items-center text-white/80 relative z-40 transition-all duration-500 ios-ease-out"
            style={{
              opacity: uiOpacity,
              transform: `translateY(${(1 - uiOpacity) * -40}px)`,
            }}
          >
            <div className="w-6 h-6" />
            <div className="text-lg tracking-wide font-medium">小憩</div>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-1 rounded-full active:bg-white/10 transition-colors"
              disabled={isAnimating}
            >
              <SettingsIcon />
            </button>
          </div>

          {/* 模式选择 —— 同样动画 */}
          <div
            className="relative z-30 transition-all duration-500 ios-ease-out"
            style={{
              opacity: uiOpacity,
              transform: `translateY(${(1 - uiOpacity) * -30}px)`,
            }}
          >
            <div
              ref={scrollContainerRef}
              className="mt-6 mb-4 flex overflow-x-auto space-x-2 px-4 pb-2 no-scrollbar"
              style={{
                maskImage: 'linear-gradient(to right, transparent, black 5%, black 95%, transparent)',
              }}
            >
              {MODES.map((mode, idx) => (
                <button
                  key={mode.id}
                  onClick={() => handleModeSelect(idx)}
                  className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                    idx === selectedModeIndex
                      ? 'bg-white/20 text-white backdrop-blur-md border border-white/30'
                      : 'text-white/50 hover:text-white/80'
                  }`}
                  disabled={isAnimating}
                >
                  {mode.name}
                </button>
              ))}
            </div>
          </div>

          {/* 自定义滚轮（仅在自定义模式下显示） */}
          {currentMode.id === 'custom' && (
            <div className="mt-auto mb-12 z-20 flex justify-center">
              <WheelPicker
                value={customDuration}
                min={1}
                max={120}
                onChange={setCustomDuration}
              />
            </div>
          )}

          {/* 开始按钮 */}
          <div className="mb-12 flex justify-center z-20">
            <button
              onClick={startTimer}
              disabled={isAnimating}
              className="py-4 px-12 bg-white/20 text-white rounded-full text-lg font-medium backdrop-blur-md border border-white/30 active:bg-white/30 transition-colors disabled:opacity-50"
            >
              开始
            </button>
          </div>
        </div>
      )}

      {/* 其他状态（RUNNING / ALARM / SUMMARY）保持原样 */}
      {appState === AppState.RUNNING && (
        <div className="flex flex-col items-center justify-center h-full z-10">
          <CircularTimer
            size={250}
            minutes={m}
            seconds={s}
            progress={1 - timeLeft / (displayDuration * 60)}
            color={currentMode.themeColor}
          />
          <div className="mt-8 text-white/70 text-lg">将在 {getWakeUpTimeString()} 唤醒</div>
          <button
            onMouseDown={handleStopPressStart}
            onMouseUp={handleStopPressEnd}
            onMouseLeave={handleStopPressEnd}
            onTouchStart={handleStopPressStart}
            onTouchEnd={handleStopPressEnd}
            className="mt-12 relative"
          >
            <div className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center">
              {stopProgress > 0 ? (
                <div
                  className="absolute inset-0 rounded-full border-4 border-transparent border-t-white"
                  style={{ transform: `rotate(${stopProgress * 360}deg)` }}
                />
              ) : (
                <X className="w-8 h-8 text-white" />
              )}
            </div>
          </button>
        </div>
      )}

      {appState === AppState.ALARM && (
        <div className="flex flex-col items-center justify-end h-full pb-24 z-10">
          <div className="text-7xl font-light text-white tabular-nums">{m.toString().padStart(2, '0')}:{s.toString().padStart(2, '0')}</div>
          <div className="mt-4 text-white/70">小憩结束</div>
          <div className="mt-8 flex gap-6">
            <button
              onClick={handleSnooze}
              className="py-3 px-6 bg-white/20 text-white rounded-full backdrop-blur-md border border-white/30"
            >
              再睡 {snoozeDuration} 分钟
            </button>
            <button
              onClick={completeSession}
              className="py-3 px-6 bg-white/20 text-white rounded-full backdrop-blur-md border border-white/30"
            >
              完成
            </button>
          </div>
        </div>
      )}

      {appState === AppState.SUMMARY && (
        <div className="flex flex-col items-center justify-center h-full z-10">
          <div className="text-5xl font-light text-white">小憩完成</div>
          <div className="mt-4 text-white/70">
            本次时长: {Math.floor((sessionStats?.durationSeconds || 0) / 60)} 分钟
          </div>
          <button
            onClick={() => setAppState(AppState.IDLE)}
            className="mt-12 py-3 px-8 bg-white/20 text-white rounded-full backdrop-blur-md border border-white/30"
          >
            返回
          </button>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import { Background } from './components/Background';
import { CircularTimer } from './components/CircularTimer';
import { WheelPicker } from './components/WheelPicker';
import { IconMap, SettingsIcon } from './components/Icons';
import { AppState, NapMode, SessionStats } from './types';
import { Play, ChevronUp, Music, X, Upload } from 'lucide-react';
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
  
  // 动画状态 - 更精细的控制
  const [isAnimating, setIsAnimating] = useState(false);
  const [headerOpacity, setHeaderOpacity] = useState(1);
  const [headerTranslateY, setHeaderTranslateY] = useState(0);
  const [timerScale, setTimerScale] = useState(1);
  const [controlOpacity, setControlOpacity] = useState(1);
  const [backgroundBlur, setBackgroundBlur] = useState(0);

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
  
  const [activeUploadContext, setActiveUploadContext] = useState<{
      field: 'wakeUp' | 'refresh' | 'guide';
      modeId?: string;
  } | null>(null);
  
  const [slideY, setSlideY] = useState(0);
  const [stopProgress, setStopProgress] = useState(0);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const stopIntervalRef = useRef<number | null>(null);
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

  // --- ANIMATION HANDLERS ---
  const startTransitionAnimation = () => {
    if (isAnimating || appState !== AppState.IDLE) return;
    
    setIsAnimating(true);
    
    const duration = 500; // 动画总时长
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // iOS风格的缓动函数
      const easeOutCubic = 1 - Math.pow(1 - progress, 3);
      
      // 标头和模式选择器向上移动并渐隐
      setHeaderOpacity(1 - easeOutCubic);
      setHeaderTranslateY(-40 * easeOutCubic); // 向上移动40px
      
      // 刻度盘轻微放大
      setTimerScale(1 + (0.15 * easeOutCubic));
      
      // 底部控制区域渐隐
      setControlOpacity(1 - easeOutCubic);
      
      // 背景模糊增加（小憩状态下需要模糊）
      setBackgroundBlur(20 * easeOutCubic); // 最大20px模糊
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // 动画完成后开始计时器
        setIsAnimating(false);
        startTimerInternal();
      }
    };
    
    requestAnimationFrame(animate);
  };

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
    
    // 重置动画状态
    setTimeout(() => {
      setHeaderOpacity(1);
      setHeaderTranslateY(0);
      setTimerScale(1);
      setControlOpacity(1);
      setBackgroundBlur(20); // 运行状态下保持模糊
    }, 100);
  };

  const stopTimer = () => {
    if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
    }
    if (stopIntervalRef.current) {
        clearInterval(stopIntervalRef.current);
        stopIntervalRef.current = null;
    }
    setAppState(AppState.IDLE);
    setSessionStats(null);
    setStartTime(null);
    setEndTime(null);
    stopAllAudio();
    
    // 重置动画状态
    setHeaderOpacity(1);
    setHeaderTranslateY(0);
    setTimerScale(1);
    setControlOpacity(1);
    setBackgroundBlur(0); // 回到初始状态
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

  // ... 其他手势处理函数保持不变 ...

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

  // 计时器大小
  const idleTimerSize = currentMode.id === 'custom' ? 300 : 230;
  const runningTimerSize = 250;

  return (
    <div className="relative w-full h-full overflow-hidden font-light">
      {/* 背景 - 始终渲染，小憩状态下有模糊 */}
      <div className="absolute inset-0 z-0">
        <Background color={currentMode.themeColor} image={currentMode.bgImage} />
      </div>
      
      {/* 动态模糊层 - 根据状态变化 */}
      <div 
        className="absolute inset-0 z-10 transition-all duration-500"
        style={{ 
          backdropFilter: `blur(${backgroundBlur}px)`,
          WebkitBackdropFilter: `blur(${backgroundBlur}px)`,
          backgroundColor: appState === AppState.RUNNING ? 'rgba(0,0,0,0.3)' : 'transparent'
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
                {/* 设置内容保持不变 */}
            </div>
        </div>
      )}

      {appState === AppState.IDLE && (
        <div className="flex flex-col h-full relative z-20">
            {/* 顶部栏 - 带动画 */}
            <div 
              className="pt-12 px-6 flex justify-between items-center text-white/80 relative transition-all duration-500"
              style={{ 
                opacity: headerOpacity,
                transform: `translateY(${headerTranslateY}px)`
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

            {/* 模式选择 - 带动画 */}
            <div 
              className="relative transition-all duration-500"
              style={{ 
                opacity: headerOpacity,
                transform: `translateY(${headerTranslateY}px)`
              }}
            >
                <div 
                    ref={scrollContainerRef}
                    className="mt-8 flex overflow-x-auto space-x-2 px-4 pb-4 no-scrollbar"
                    style={{ maskImage: 'linear-gradient(to right, transparent, black 5%, black 95%, transparent)' }}
                >
                    {MODES.map((mode, idx) => (
                        <button
                            key={mode.id}
                            onClick={() => handleModeSelect(idx)}
                            className={`
                                whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-all duration-300
                                ${idx === selectedModeIndex ? 'bg-white/20 text-white backdrop-blur-md border border-white/30' : 'text-white/50 hover:text-white/80'}
                            `}
                            disabled={isAnimating}
                        >
                            {mode.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* 主计时区域 */}
            <div className="flex-1 flex flex-col items-center justify-center">
                <div className="relative flex items-center justify-center min-h-[300px]">
                    {currentMode.id !== 'custom' && (
                        <div 
                          className="transition-all duration-500 ease-out"
                          style={{ transform: `scale(${timerScale})` }}
                        >
                          <CircularTimer progress={0} size={idleTimerSize} showTicks={true} color="transparent" />
                        </div>
                    )}
                    
                    <div className={`${currentMode.id === 'custom' ? 'relative' : 'absolute inset-0'} flex flex-col items-center justify-center`}>
                        {currentMode.id === 'custom' ? (
                            <div 
                              className="transition-all duration-500 ease-out"
                              style={{ transform: `scale(${timerScale})` }}
                            >
                              <WheelPicker 
                                  value={customDuration}
                                  min={1}
                                  max={180}
                                  onChange={setCustomDuration}
                              />
                            </div>
                        ) : (
                            <div 
                              className="flex flex-col items-center justify-center select-none transition-all duration-500 ease-out"
                              style={{ transform: `scale(${timerScale})` }}
                            >
                                <div className="text-[72px] leading-none font-thin text-white tracking-tighter tabular-nums drop-shadow-lg">
                                    {displayDuration}
                                </div>
                                <div className="text-lg text-white/90 font-light tracking-widest mt-2">
                                    分钟
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* 底部控制区域 - 带动画 */}
                <div 
                  className="pb-16 flex flex-col items-center justify-center w-full relative transition-all duration-500"
                  style={{ opacity: controlOpacity }}
                >
                    
                    <div className="text-white/70 text-sm font-light mb-8">
                        将在 {getWakeUpTimeString()} 唤醒你
                    </div>

                    <button 
                        onClick={() => playAudio(modeGuideMusic[currentMode.id]?.path)}
                        className="flex items-center space-x-2 bg-white/10 hover:bg-white/20 backdrop-blur-md px-5 py-2.5 rounded-full text-white/90 transition-all border border-white/10 mb-12 h-10"
                        disabled={isAnimating}
                    >
                        {playingAudioPath && playingAudioPath === modeGuideMusic[currentMode.id]?.path ? (
                            <PlayingIcon />
                        ) : (
                            <Play className="w-3 h-3 fill-current" />
                        )}
                        <span className="text-sm">
                            {getMusicStatusText('guide', currentMode.id) 
                                ? `专属引导: ${getMusicStatusText('guide', currentMode.id)}`
                                : '特制引导音乐'
                            }
                        </span>
                    </button>

                    <div className="flex items-center justify-center w-full">
                        <button 
                            onClick={startTransitionAnimation}
                            className="w-20 h-20 bg-white rounded-full flex items-center justify-center transition-all duration-300 active:scale-95 group relative hover:scale-105"
                            style={{ 
                              boxShadow: `0 0 40px ${currentMode.themeColor}50`,
                              transform: `scale(${isAnimating ? 0.9 : 1})`
                            }}
                            disabled={isAnimating}
                        >
                            <StartIcon 
                                className="w-8 h-8 transition-colors duration-300"
                                style={{ color: currentMode.themeColor }}
                                fill="currentColor" 
                                strokeWidth={0} 
                            />
                        </button>
                    </div>
                    
                    <div className="mt-6 text-white/50 text-xs">开始小憩</div>
                </div>
            </div>
        </div>
      )}

      {appState === AppState.RUNNING && (
        <div className="absolute inset-0 z-30 flex flex-col h-full animate-fade-in-up">
            <div className="pt-12 px-6 flex justify-center items-center text-white/80">
                <div className="text-lg font-light tracking-wide opacity-80">{currentMode.name.split(' ')[0]}</div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center">
                <div className="relative flex items-center justify-center">
                    <CircularTimer progress={1 - (timeLeft / (displayDuration * 60))} size={runningTimerSize} color="white" />
                    
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <div className="text-7xl font-thin tabular-nums tracking-tighter text-white leading-none">
                            {m.toString().padStart(2, '0')}:{s.toString().padStart(2, '0')}
                        </div>
                    </div>
                </div>

                <div className="text-white/60 text-sm mt-8 font-light tracking-wide">
                    将在 {endTime?.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })} 唤醒你
                </div>
            </div>

            <div className="pb-24 w-full flex flex-col items-center justify-center">
                <div className="relative flex items-center justify-center">
                    <svg className="absolute w-[88px] h-[88px] pointer-events-none transform -rotate-90">
                        <circle 
                            r="42" 
                            cx="44" 
                            cy="44" 
                            fill="transparent" 
                            stroke="rgba(255,255,255,0.1)" 
                            strokeWidth="2" 
                        />
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

      {/* 闹钟和总结页面保持不变 */}
    </div>
  );
}

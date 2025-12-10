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
  
  // 动画状态 - 简化版，参考iOS设计
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
  
  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  
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

  // 修复的计时器逻辑
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

  // 动画效果 - iOS风格渐入渐出
  useEffect(() => {
    if (isAnimating) {
      const duration = 500;
      const startTime = Date.now();
      
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // iOS风格的缓动函数
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

  // 停止所有音频
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
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
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
    // 播放唤醒音乐
    if (globalWakeUpMusic?.path) {
      playAudio(globalWakeUpMusic.path);
    }
  };

  const completeSession = () => {
    stopAllAudio(); // 用户操作，停止音乐
    setAppState(AppState.SUMMARY);
  };

  const handleSnooze = () => {
    stopAllAudio(); // 用户点击再睡一会，停止当前音乐
    startTimerInternal();
    setSlideY(0);
  };

  // 获取唤醒时间字符串
  const getWakeUpTimeString = () => {
    const target = endTime || new Date(new Date().getTime() + displayDuration * 60000);
    return target.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  // 格式时间显示
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return { m, s };
  };

  const { m, s } = formatTime(timeLeft);
  const StartIcon = IconMap[currentMode.iconType];

  // 动画计算
  const idleTimerSize = currentMode.id === 'custom' ? 260 : 230;
  const runningTimerSize = 250;
  
  // iOS风格：中心放大，其他淡出
  const timerScale = 1 + (animationProgress * 0.2);
  const uiOpacity = 1 - animationProgress;
  const blurAmount = animationProgress * 10;

  return (
    <div className="relative w-full h-full overflow-hidden font-light">
      <Background color={currentMode.themeColor} image={currentMode.bgImage} />
      
      {/* 背景模糊层 */}
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
            {/* 顶部栏 */}
            <div 
              className="pt-12 px-6 flex justify-between items-center text-white/80 relative z-40 transition-all duration-500"
              style={{ opacity: uiOpacity }}
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

            {/* 模式选择 */}
            <div 
              className="relative z-30 transition-all duration-500"
              style={{ opacity: uiOpacity }}
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

            {/* 主内容区域 */}
            <div className="flex-1 flex flex-col items-center justify-center">
                <div className="relative flex items-center justify-center min-h-[260px]">
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

                {/* 底部控制区域 */}
                <div 
                  className="pb-16 flex flex-col items-center justify-center w-full relative z-20 transition-all duration-500"
                  style={{ opacity: uiOpacity }}
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
                            onClick={startTimer}
                            className="w-20 h-20 bg-white rounded-full flex items-center justify-center transition-all duration-300 active:scale-95 group relative hover:scale-105"
                            style={{ 
                              boxShadow: `0 0 40px ${currentMode.themeColor}50`,
                              opacity: uiOpacity,
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
        <div className="absolute inset-0 z-20 flex flex-col h-full animate-fade-in bg-black/20">
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

      {appState === AppState.ALARM && (
        <div 
          className="absolute inset-0 z-30 flex flex-col items-center justify-between pb-16 pt-20 overflow-hidden"
          onTouchStart={handleAlarmTouchStart}
          onTouchMove={handleAlarmTouchMove}
          onTouchEnd={handleAlarmTouchEnd}
          onMouseDown={handleAlarmMouseDown}
          onMouseMove={handleAlarmMouseMove}
          onMouseUp={handleAlarmMouseUp}
        >
            <div className="absolute inset-0 z-[-1]">
                <img 
                    src="https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?q=80&w=2940&auto=format&fit=crop" 
                    className="w-full h-full object-cover opacity-60 scale-110"
                    alt="Morning"
                />
                <div className="absolute inset-0 bg-black/60" />
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
                <div className="absolute inset-0 border border-white/20 rounded-full animate-ping opacity-20 pointer-events-none" style={{ animationDuration: '3s' }} />
                <div className="absolute inset-4 border border-white/20 rounded-full animate-ping opacity-30 pointer-events-none" style={{ animationDelay: '0.5s', animationDuration: '3s' }} />
                
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

      {appState === AppState.SUMMARY && sessionStats && (
        <div className="absolute inset-0 z-40 bg-black/60 flex flex-col items-center justify-center p-6">
            <div className="w-full max-w-sm bg-[#2a2a35] rounded-3xl p-6 shadow-2xl relative overflow-hidden">
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

                    <button 
                        onClick={() => playAudio(globalRefreshMusic?.path)}
                        className="bg-[#3b3b47] rounded-xl p-4 flex items-center justify-between w-full hover:bg-[#4a4a58] transition-colors"
                    >
                        <div className="flex flex-col text-left">
                            <span className="text-gray-300 text-sm">来点提神醒脑白噪音</span>
                            {getMusicStatusText('refresh') && (
                                <span className="text-xs text-white/50 max-w-[200px] truncate">{getMusicStatusText('refresh')}</span>
                            )}
                        </div>
                        {playingAudioPath && playingAudioPath === globalRefreshMusic?.path ? (
                            <PlayingIcon />
                        ) : (
                            <Play className="w-4 h-4 text-white fill-current" />
                        )}
                    </button>
                </div>
            </div>

            <button onClick={() => {
                stopAllAudio();
                setAppState(AppState.IDLE);
            }} className="mt-8 p-4 rounded-full bg-white/10 hover:bg-white/20 transition-colors">
                <X className="w-6 h-6 text-white" />
            </button>
        </div>
      )}
    </div>
  );
}

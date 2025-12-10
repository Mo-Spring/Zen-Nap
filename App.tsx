import React, { useState, useEffect, useRef, useMemo } from 'react'; // 导入 useMemo
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

  // 动画效果
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
  
  // 核心改动 1: 处理滚轮选择，确保更新 customDuration
  const handleWheelChange = (newMinutes: number) => {
      // 仅在 IDLE 状态且当前模式为 'custom' 时更新 customDuration
      if (appState === AppState.IDLE && currentMode.id === 'custom') {
          setCustomDuration(newMinutes);
      }
  };


  const handleModeSelect = (index: number) => {
    if (appState !== AppState.IDLE || isAnimating) return;
    const newIndex = Math.max(0, Math.min(MODES.length - 1, index));
    setSelectedModeIndex(newIndex);
    
    if (MODES[newIndex].id === 'custom') {
        // 如果切换到自定义模式，保持当前 customDuration，而不是重置为 MODES[newIndex].durationMinutes
        // setCustomDuration(MODES[newIndex].durationMinutes); // 移除此行或确保它使用已有的 customDuration
        // 如果想让它在切换模式时保持自定义时间，则不需要动 customDuration
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

  // --- GESTURE HANDLERS ---
  const handleStopPressStart = () => {
    if (stopIntervalRef.current || isAnimating) return;
    const startTime = Date.now();
    const DURATION = 3000; // 3 seconds
    
    // Start tracking stop progress
    // 使用 window.setInterval 避免 TypeScript 报错 (在 React Native 环境中应使用 setTimeout)
    stopIntervalRef.current = window.setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / DURATION, 1);
        setStopProgress(progress);
        
        if (progress === 1) {
            stopTimer(); // Complete stop
        }
    }, 50) as unknown as number; // 强制类型转换，确保在浏览器环境中工作
  };

  const handleStopPressEnd = () => {
    if (stopIntervalRef.current) {
        clearInterval(stopIntervalRef.current);
        stopIntervalRef.current = null;
    }
    setStopProgress(0);
  };
  
  // Handlers for mode selection drag gesture
  const handleTouchStart = (e: React.TouchEvent) => {
    // 只有在 IDLE 状态且没有动画时才处理
    if (appState !== AppState.IDLE || isAnimating) return;
    touchStartX.current = e.touches[0].clientX;
    isDragging.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current === null || appState !== AppState.IDLE || isAnimating) return;
    const deltaX = e.touches[0].clientX - touchStartX.current;
    if (Math.abs(deltaX) > 10) { // Threshold for drag start
      isDragging.current = true;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || appState !== AppState.IDLE || isAnimating) return;
    
    // 检查是否是一次有效的滑动
    if (isDragging.current) {
      const deltaX = e.changedTouches[0].clientX - touchStartX.current;
      if (Math.abs(deltaX) > 50) { // 滑动阈值
        if (deltaX < 0) {
          // Swiped left (选择下一个模式)
          handleModeSelect(selectedModeIndex + 1);
        } else {
          // Swiped right (选择上一个模式)
          handleModeSelect(selectedModeIndex - 1);
        }
      }
    }
    touchStartX.current = null;
    isDragging.current = false;
  };

  // 闹钟页面手势处理 (仅保留触摸事件)
  const handleAlarmTouchStart = (e: React.TouchEvent) => {
    if (appState !== AppState.ALARM) return;
    dragStartY.current = e.touches[0].clientY;
  };

  const handleAlarmTouchMove = (e: React.TouchEvent) => {
    if (appState !== AppState.ALARM || dragStartY.current === null) return;
    const touch = e.touches[0];
    const screenH = window.innerHeight;
    const y = touch.clientY;
    
    // 计算从底部向上的滑动距离 (屏幕高度 - 当前Y坐标)
    const delta = screenH - y;
    
    // 如果滑动距离超过阈值，直接完成会话
    if (delta > 200) {
      completeSession();
      dragStartY.current = null; // 避免在 touchEnd 中重复处理
    }
    
    // 设置滑动效果，最大限制为 250px
    setSlideY(Math.min(delta, 250));
  };

  const handleAlarmTouchEnd = () => {
    if (appState === AppState.ALARM && slideY < 200) {
      // 如果滑动结束但未达到阈值，则将滑动效果复位
      setSlideY(0);
    }
    dragStartY.current = null;
  };

  // 获取唤醒时间字符串
  const getWakeUpTimeString = () => {
    const target = endTime || new Date(Date.now() + displayDuration * 60000);
    return target.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  };
  
  // 渲染计时器
  const { m, s } = useMemo(() => {
    const min = Math.floor(timeLeft / 60);
    const sec = timeLeft % 60;
    return { m: min, s: sec };
  }, [timeLeft]);
  
  const runningTimerSize = window.innerWidth * 0.7; // 屏幕宽度的 70%

  // UI 透明度（用于启动动画）
  const uiOpacity = 1 - animationProgress;

  return (
    <div 
      className="relative h-screen w-screen overflow-hidden text-white"
      // 顶级容器只保留触摸事件
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      // 移除 onMouseDown, onMouseUp, onMouseLeave
    >
      <Background color={currentMode.themeColor} image={currentMode.bgImage} />
      
      {/* 文件上传 input (隐藏) */}
      <input 
          ref={fileInputRef} 
          type="file" 
          accept="audio/*" 
          onChange={onFileChange} 
          style={{ display: 'none' }} 
      />
      {/* 音频播放器 (隐藏) */}
      <audio ref={audioRef} />

      {/* Settings Modal (内容省略) */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 bg-[#0B0D14]/90 backdrop-blur-md flex flex-col animate-fade-in">
          {/* ... Settings UI ... */}
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
                    <div className="text-xs text-white/40 mt-1">在结束前淡入唤醒音乐</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="bg-[#242630] rounded-lg px-2 py-1 min-w-[3.5rem] text-center border border-white/10">
                      <input 
                        type="number" 
                        value={painlessWakeUpDuration} 
                        onChange={(e) => setPainlessWakeUpDuration(Math.max(1, Number(e.target.value)))} 
                        className="bg-transparent text-white text-center w-full focus:outline-none" 
                      />
                    </div>
                    <span className="text-sm text-white/60">分钟</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mb-2">
              <div className="text-xs text-white/40 font-bold mb-3 uppercase tracking-wider pl-1">音乐轨道</div>
              <div className="bg-[#161821] rounded-xl mb-4 overflow-hidden border border-white/5">
                <div className="p-4 flex items-center justify-between">
                  <div>
                    <div className="text-base font-medium text-white/90">唤醒音乐</div>
                    <div className="text-xs text-white/40 mt-1 max-w-[150px] truncate">
                      {getMusicStatusText('wakeUp') || '未选择'}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {globalWakeUpMusic?.path && (
                      <button 
                        onClick={() => playAudio(globalWakeUpMusic.path)} 
                        className={`p-3 rounded-lg border transition-all ${playingAudioPath === globalWakeUpMusic.path ? 'bg-white/30 border-white/50 text-white' : 'bg-white/10 border-white/20 text-white hover:bg-white/20'}`}
                      >
                         {playingAudioPath === globalWakeUpMusic.path ? <PlayingIcon /> : <Music className="w-4 h-4" />}
                      </button>
                    )}
                    <button 
                      onClick={() => handleUploadClick('wakeUp')} 
                      className={`p-3 rounded-lg border transition-all ${globalWakeUpMusic ? 'bg-white/10 border-white/20 text-white' : 'bg-[#242630] border-white/10 text-white/50 hover:text-white'}`}
                    >
                      <Upload className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-[#161821] rounded-xl mb-4 overflow-hidden border border-white/5">
                <div className="p-4 flex items-center justify-between">
                  <div>
                    <div className="text-base font-medium text-white/90">提神音乐</div>
                    <div className="text-xs text-white/40 mt-1 max-w-[150px] truncate">
                      {getMusicStatusText('refresh') || '未选择'}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {globalRefreshMusic?.path && (
                      <button 
                        onClick={() => playAudio(globalRefreshMusic.path)} 
                        className={`p-3 rounded-lg border transition-all ${playingAudioPath === globalRefreshMusic.path ? 'bg-white/30 border-white/50 text-white' : 'bg-white/10 border-white/20 text-white hover:bg-white/20'}`}
                      >
                         {playingAudioPath === globalRefreshMusic.path ? <PlayingIcon /> : <Music className="w-4 h-4" />}
                      </button>
                    )}
                    <button 
                      onClick={() => handleUploadClick('refresh')} 
                      className={`p-3 rounded-lg border transition-all ${globalRefreshMusic ? 'bg-white/10 border-white/20 text-white' : 'bg-[#242630] border-white/10 text-white/50 hover:text-white'}`}
                    >
                      <Upload className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-2">
              <div className="text-xs text-white/40 font-bold mb-3 uppercase tracking-wider pl-1">模式指导音</div>
              <div className="bg-[#161821] rounded-xl overflow-hidden border border-white/5">
                {MODES.filter(m => m.id !== 'custom').map((mode, idx) => {
                  const trackName = getMusicStatusText('guide', mode.id);
                  return (
                    <div key={mode.id}>
                      <div className="p-4 flex items-center justify-between">
                        <div>
                          <div className="text-base font-medium text-white/90">{mode.name}</div>
                          <div className="text-xs text-white/40 mt-1 max-w-[150px] truncate">
                            {trackName || '未选择'}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {modeGuideMusic[mode.id]?.path && (
                            <button 
                              onClick={() => playAudio(modeGuideMusic[mode.id].path)} 
                              className={`p-3 rounded-lg border transition-all ${playingAudioPath === modeGuideMusic[mode.id].path ? 'bg-white/30 border-white/50 text-white' : 'bg-white/10 border-white/20 text-white hover:bg-white/20'}`}
                            >
                               {playingAudioPath === modeGuideMusic[mode.id].path ? <PlayingIcon /> : <Music className="w-4 h-4" />}
                            </button>
                          )}
                          <button 
                            onClick={() => handleUploadClick('guide', mode.id)} 
                            className={`p-3 rounded-lg border transition-all ${trackName ? 'bg-white/10 border-white/20 text-white' : 'bg-[#242630] border-white/10 text-white/50 hover:text-white'}`}
                          >
                            <Upload className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      {idx < MODES.filter(m => m.id !== 'custom').length - 1 && <div className="border-t border-white/5 mx-4" />}
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
                  className={` whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                    idx === selectedModeIndex ? 'bg-white/20 text-white backdrop-blur-md border border-white/30' : 'text-white/50 hover:text-white/80'
                  } `}
                  disabled={isAnimating}
                >
                  {mode.name}
                </button>
              ))}
            </div>
          </div>

          {/* 核心显示/滚轮区 */}
          <div 
            className="flex-1 flex flex-col items-center justify-center pt-8 relative z-20"
            // 模式滑动/滚轮选择区域只保留触摸事件
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            // 移除 onMouseDown, onMouseUp, onMouseLeave
          >
            {/* 模式图标 */}
            <div 
              className={`p-4 rounded-full ${currentMode.accentColor} mb-6 transition-all duration-500`}
              style={{ opacity: uiOpacity, transform: `scale(${1 - animationProgress * 0.2})` }}
            >
              {React.createElement(IconMap[currentMode.iconType], { className: 'w-8 h-8 text-white fill-current', strokeWidth: 0 })}
            </div>
            
            <div className="relative flex items-center justify-center w-full">
                {/* 核心改动 2: 使用 WheelPicker 替换静态显示，并绑定 handleWheelChange */}
                {currentMode.id === 'custom' ? (
                    <div 
                        className="flex-1 flex items-center justify-center relative z-20"
                        style={{ height: '320px', opacity: uiOpacity }}
                    >
                        <WheelPicker 
                            value={customDuration} // 使用 customDuration 作为当前值
                            min={1} 
                            max={60} 
                            onChange={handleWheelChange} // 绑定新的 handler
                        />
                        <div className="absolute right-[20%] top-1/2 -translate-y-1/2 text-5xl font-extralight text-white/50 pointer-events-none">
                            分钟
                        </div>
                    </div>
                ) : (
                    <div 
                        className="text-9xl font-extralight tabular-nums tracking-tighter text-white leading-none transition-opacity duration-300"
                        style={{ opacity: uiOpacity }}
                    >
                        {displayDuration.toString().padStart(2, '0')}
                    </div>
                )}
            </div>

            {/* 唤醒时间 */}
            <div 
              className="mt-6 text-white/50 text-sm transition-all duration-500"
              style={{ opacity: uiOpacity }}
            >
              预计 {getWakeUpTimeString()} 唤醒
            </div>

          </div>

          {/* 底部启动按钮 */}
          <div 
            className="pb-12 pt-6 flex flex-col items-center relative z-20 transition-all duration-500"
            style={{ 
              opacity: uiOpacity,
              transform: `translateY(${animationProgress * 50}px)`
            }}
          >
            <button 
              onClick={startTimer} 
              className="w-20 h-20 bg-white rounded-full flex items-center justify-center transition-all duration-300 active:scale-95 group relative hover:scale-105"
              style={{ boxShadow: `0 0 40px ${currentMode.themeColor}50`, opacity: uiOpacity, transform: `scale(${isAnimating ? 0.9 : 1})` }}
              disabled={isAnimating}
            >
              <Play className="w-8 h-8 transition-colors duration-300" style={{ color: currentMode.themeColor }} fill="currentColor" strokeWidth={0} />
            </button>
            <div className="mt-6 text-white/50 text-xs">开始小憩</div>
          </div>
        </div>
      )}

      {/* RUNNING State */}
      {appState === AppState.RUNNING && (
        <div className="absolute inset-0 z-20 flex flex-col h-full animate-fade-in bg-black/20">
          <div className="pt-12 px-6 flex justify-center items-center text-white/80">
            <div className="text-lg font-light tracking-wide opacity-80">{currentMode.name.split(' ')[0]}</div>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="relative flex items-center justify-center">
              <CircularTimer 
                progress={1 - (timeLeft / (displayDuration * 60))} 
                size={runningTimerSize} 
                color="white" 
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-7xl font-thin tabular-nums tracking-tighter text-white leading-none">
                  {m.toString().padStart(2, '0')}:{s.toString().padStart(2, '0')}
                </div>
              </div>
            </div>
            <div className="mt-8 text-white/50 text-sm">
              预计 {getWakeUpTimeString()} 唤醒
            </div>
          </div>

          <div className="pb-12 pt-6 flex flex-col items-center relative z-20">
            <button 
                // 只保留触摸事件
                onTouchStart={handleStopPressStart}
                onTouchEnd={handleStopPressEnd}
                // 移除 onMouseDown, onMouseUp
                className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center transition-all duration-300 active:scale-95 group relative overflow-hidden"
            >
                {/* 停止进度条 */}
                <div 
                    className="absolute inset-0 bg-white/50 transition-transform duration-50"
                    style={{ transform: `scaleX(${stopProgress})`, transformOrigin: 'left' }}
                />
                <X className="w-6 h-6 text-white relative z-10" strokeWidth={2} />
            </button>
            <div className="mt-6 text-white/50 text-xs">{stopProgress > 0 ? `按住 ${((1 - stopProgress) * 3).toFixed(1)}s 取消` : '长按停止'}</div>
          </div>
        </div>
      )}

      {/* ALARM State */}
      {appState === AppState.ALARM && (
        <div 
          className="absolute inset-0 z-20 flex flex-col h-full items-center justify-end bg-black/80 animate-fade-in"
          // 只保留触摸事件
          onTouchStart={handleAlarmTouchStart}
          onTouchMove={handleAlarmTouchMove}
          onTouchEnd={handleAlarmTouchEnd}
          // 移除 onMouseDown, onMouseMove, onMouseUp
        >
          <div className="absolute inset-0 z-0 flex flex-col items-center justify-center">
            <div className="text-7xl font-thin tabular-nums tracking-tighter text-white leading-none mb-6 opacity-30 pointer-events-none" style={{ animationDelay: '0.5s', animationDuration: '3s' }}>
                {getWakeUpTimeString()}
            </div>
            <div 
                className="text-8xl font-thin tabular-nums tracking-tighter text-white leading-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-30 pointer-events-none" 
                style={{ animationDelay: '0.5s', animationDuration: '3s' }}
            />
          </div>
          
          <div 
            className="w-full bg-[#161821] rounded-t-3xl shadow-2xl relative z-10 p-8 pt-12 transform transition-transform duration-100"
            style={{ transform: `translateY(${slideY}px)` }}
          >
            <div className="text-xl font-semibold text-white mb-2">时间到了！</div>
            <div className="text-sm text-white/60 mb-6">你完成了 {displayDuration} 分钟的午睡。</div>
            
            <div className="flex gap-4 mb-8 justify-center">
              <button onClick={handleSnooze} className="flex-1 px-4 py-4 rounded-xl bg-[#242630] text-white/90 hover:bg-[#3b3b47] transition-colors">
                再睡 {snoozeDuration} 分钟
              </button>
              <button onClick={completeSession} className="flex-1 px-4 py-4 rounded-xl bg-white text-black font-medium hover:bg-gray-200 transition-colors">
                我醒了
              </button>
            </div>
            
            <div className="text-center text-xs text-white/40 pt-4">
                向上滑动以停止闹钟
            </div>
            <ChevronUp className="w-6 h-6 text-white/60 mx-auto mt-2 animate-bounce-slow" />

          </div>
        </div>
      )}

      {/* SUMMARY State (内容省略) */}
      {appState === AppState.SUMMARY && sessionStats && (
        <div className="absolute inset-0 z-20 flex flex-col h-full items-center justify-start bg-black/80 animate-fade-in">
            <div className="pt-20 px-6 flex flex-col items-center text-white/80 w-full">
                <div className="text-3xl font-bold tracking-wide mb-2">午休总结</div>
                <div className="text-sm text-white/60 mb-10">一次完美的小憩</div>
            </div>

            <div className="flex flex-col items-center justify-center w-full px-6">
                <div className="bg-[#161821] rounded-xl mb-6 p-6 w-full max-w-sm border border-white/5">
                    <div className="text-xs text-white/40 font-bold mb-4 uppercase tracking-wider">会话详情</div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col">
                            <span className="text-sm text-white/60">模式</span>
                            <span className="text-xl font-semibold text-white">{currentMode.name.split(' ')[0]}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm text-white/60">时长</span>
                            <span className="text-xl font-semibold text-white">{sessionStats.durationSeconds / 60} 分钟</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm text-white/60">开始时间</span>
                            <span className="text-xl font-semibold text-white">{sessionStats.startTime.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm text-white/60">结束时间</span>
                            <span className="text-xl font-semibold text-white">{sessionStats.endTime.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col items-center w-full max-w-sm">
                    <button 
                        onClick={() => playAudio(globalRefreshMusic?.path)}
                        className="bg-[#3b3b47] rounded-xl p-4 flex items-center justify-between w-full hover:bg-[#4a4a58] transition-colors mb-4"
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
                    
                    <button onClick={() => {
                        stopAllAudio();
                        setAppState(AppState.IDLE);
                    }} className="mt-4 p-4 rounded-full bg-white/10 hover:bg-white/20 transition-colors">
                        <X className="w-6 h-6 text-white" />
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}

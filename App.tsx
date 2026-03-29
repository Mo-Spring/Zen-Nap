import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { Background } from './components/Background';
import { CircularTimer } from './components/CircularTimer';
import { WheelPicker } from './components/WheelPicker';
import { IconMap, SettingsIcon, ZenAppIcon } from './components/Icons';
import { AppState, NapMode, SessionStats } from './types';
import { Play, Music, X, Upload } from 'lucide-react';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { StatusBar, Style } from '@capacitor/status-bar';
import { LocalNotifications } from '@capacitor/local-notifications';
import { App as CapacitorApp } from '@capacitor/app';

// 原生闹钟频道插件（Java 端：plugins/alarm-channel/AlarmChannelPlugin.java）
interface AlarmChannelPlugin {
  createAlarmChannel(options: { channelId?: string; channelName?: string }): Promise<{ success: boolean }>;
}
const AlarmChannel = registerPlugin<AlarmChannelPlugin>('AlarmChannel');

// --- DATA ---
// Performance Optimization: Resized images to w=1080 for faster mobile loading
const MODES: NapMode[] = [
  {
    id: 'custom',
    name: '自定义',
    durationMinutes: 30,
    themeColor: '#94a3b8',
    accentColor: 'bg-slate-400',
    iconType: 'custom',
    bgImage: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?q=80&w=1080&auto=format&fit=crop'
  },
  {
    id: 'scientific',
    name: '科学小盹 10\'',
    durationMinutes: 10,
    themeColor: '#f472b6',
    accentColor: 'bg-pink-400',
    iconType: 'coffee',
    bgImage: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1080&auto=format&fit=crop'
  },
  {
    id: 'efficient',
    name: '高效午休 24\'',
    durationMinutes: 24,
    themeColor: '#4ade80',
    accentColor: 'bg-green-500',
    iconType: 'lightning',
    bgImage: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=1080&auto=format&fit=crop'
  },
  {
    id: 'travel',
    name: '差旅模式 40\'',
    durationMinutes: 40,
    themeColor: '#fbbf24',
    accentColor: 'bg-amber-400',
    iconType: 'plane',
    bgImage: 'https://images.unsplash.com/photo-1500964757637-c85e8a162699?q=80&w=1080&auto=format&fit=crop'
  },
  {
    id: 'complete',
    name: '完整午休 90\'',
    durationMinutes: 90,
    themeColor: '#3b82f6',
    accentColor: 'bg-blue-600',
    iconType: 'bed',
    bgImage: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?q=80&w=1080&auto=format&fit=crop'
  }
];

interface MusicTrack {
  name: string;
  path: string;
}

// Persisted Session Data Type
interface PersistedSession {
    startTime: number; // timestamp
    endTime: number;   // timestamp
    durationMinutes: number;
    modeIndex: number;
    isSnoozing: boolean;
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
  // 停止动画状态
  const [isStopping, setIsStopping] = useState(false);

  // Settings State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [snoozeDuration, setSnoozeDuration] = useState(5);
  // 贪睡状态
  const [isSnoozing, setIsSnoozing] = useState(false);

  // Music State
  const [globalWakeUpMusic, setGlobalWakeUpMusic] = useState<MusicTrack | null>(null);
  const [globalRefreshMusic, setGlobalRefreshMusic] = useState<MusicTrack | null>(null);
  const [modeGuideMusic, setModeGuideMusic] = useState<Record<string, MusicTrack>>({});
  
  // Audio Playback State
  const [playingAudioPath, setPlayingAudioPath] = useState<string | null>(null);
  
  // Timer State
  const [timeLeft, setTimeLeft] = useState(0);
  const [activeDuration, setActiveDuration] = useState(0); // 新增：当前活动的倒计时总时长（分钟），与选中的模式时长解耦
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [sessionStats, setSessionStats] = useState<SessionStats | null>(null);
  
  const [activeUploadContext, setActiveUploadContext] = useState<{
      field: 'wakeUp' | 'refresh' | 'guide';
      modeId?: string;
  } | null>(null);
  
  // Alarm Long Press State
  const [alarmStopProgress, setAlarmStopProgress] = useState(0);
  const alarmStopIntervalRef = useRef<number | null>(null);
  
  // Long Press to Stop State
  const [stopProgress, setStopProgress] = useState(0);
  
  // Indicator State for Mode Selection Animation
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, top: 0, width: 0, height: 0, opacity: 0 });
  
  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const intervalRef = useRef<any>(null); // Use any for NodeJS/Window timer type compatibility
  const stopIntervalRef = useRef<number | null>(null);
  const modeButtonsRef = useRef<(HTMLButtonElement | null)[]>([]);
  // Wake Lock Ref
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  
  // Gesture Refs (mode selector swipe)
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const isDragging = useRef(false);

  // State Refs for Event Listeners
  const appStateRef = useRef(appState);
  const isSettingsOpenRef = useRef(isSettingsOpen);
  
  useEffect(() => { appStateRef.current = appState; }, [appState]);
  useEffect(() => { isSettingsOpenRef.current = isSettingsOpen; }, [isSettingsOpen]);
  
  const currentMode = MODES[selectedModeIndex];
  const displayDuration = currentMode.id === 'custom' ? customDuration : currentMode.durationMinutes;

  // --- WAKE LOCK HANDLERS ---
  const requestWakeLock = async () => {
    if ('wakeLock' in navigator) {
      try {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
      } catch (err: any) {
        console.error(`${err.name}, ${err.message}`);
      }
    }
  };

  const releaseWakeLock = async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
      } catch (err: any) {
         console.error(`${err.name}, ${err.message}`);
      }
    }
  };

  // --- PERSISTENCE HELPERS ---
  const saveSessionToStorage = (end: Date, duration: number, modeIdx: number, snoozing: boolean) => {
      const sessionData: PersistedSession = {
          startTime: Date.now(),
          endTime: end.getTime(),
          durationMinutes: duration,
          modeIndex: modeIdx,
          isSnoozing: snoozing
      };
      localStorage.setItem('ACTIVE_NAP_SESSION', JSON.stringify(sessionData));
  };

  const clearSessionFromStorage = () => {
      localStorage.removeItem('ACTIVE_NAP_SESSION');
  };

  // --- AUDIO HANDLERS ---
  const playAudio = (trackPath: string | undefined, loop: boolean = false) => {
      if (!audioRef.current) return;

      if (!trackPath) {
          console.log("No audio track selected");
          return;
      }

      // 如果已经在播放这首歌
      if (playingAudioPath === trackPath && !audioRef.current.paused) {
          // 确保循环状态一致
          if (audioRef.current.loop !== loop) {
              audioRef.current.loop = loop;
          }
          return;
      }

      let audioSrc = trackPath;
      if (Capacitor.isNativePlatform()) {
          audioSrc = Capacitor.convertFileSrc(trackPath);
      }
      
      audioRef.current.src = audioSrc;
      audioRef.current.loop = loop; // 设置循环
      audioRef.current.load();
      
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise
            .then(() => {
                setPlayingAudioPath(trackPath);
            })
            .catch(e => {
                console.error("Error playing audio:", e);
                setPlayingAudioPath(null);
            });
      }
  };

  const stopAllAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.loop = false; // 重置循环状态
      audioRef.current.currentTime = 0;
      setPlayingAudioPath(null);
    }
  };

  // --- TIMER FUNCTIONS (Declared before effects) ---
  const finishTimer = async (isRestored = false) => {
    if (appState === AppState.ALARM && !isRestored) return;

    if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
    }
    if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
    }

    clearSessionFromStorage();
    await releaseWakeLock();

    if (Capacitor.isNativePlatform() && !isRestored) {
        try {
            await LocalNotifications.cancel({ notifications: [{ id: 1 }] });
        } catch (e) { console.error(e); }
        
        if ('vibrate' in navigator) {
            navigator.vibrate([1000, 500, 1000]);
        }
    }

    setAppState(AppState.ALARM);
    
    // 先停掉正在播放的引导音乐，再播放唤醒音乐
    stopAllAudio();
    
    if (globalWakeUpMusic?.path && !isRestored) {
      // App 在前台时：用媒体音量播放自定义唤醒音乐（循环）
      playAudio(globalWakeUpMusic.path, true);
    }
  };

  const stopTimer = async () => {
    if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
    }
    if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
    }
    if (stopIntervalRef.current) {
        cancelAnimationFrame(stopIntervalRef.current);
        stopIntervalRef.current = null;
    }

    clearSessionFromStorage();

    if (Capacitor.isNativePlatform()) {
        try {
            await LocalNotifications.cancel({ notifications: [{ id: 1 }] });
        } catch (e) {
            console.error("Failed to cancel notification", e);
        }
    }

    await releaseWakeLock();

    setStopProgress(0);
    setIsAnimating(true);
    setIsStopping(false);
    setIsSnoozing(false);
    
    setAppState(AppState.IDLE);
    setSessionStats(null);
    setStartTime(null);
    setEndTime(null);
    setActiveDuration(0);
    stopAllAudio();

    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            setIsAnimating(false);
        });
    });
  };

  // Keep a fresh ref to stopTimer for the event listener
  const stopTimerRef = useRef(stopTimer);
  useEffect(() => { stopTimerRef.current = stopTimer; }, [stopTimer]);

  // --- EFFECTS ---

  useEffect(() => {
    let backButtonListener: any;

    // 沉浸式状态栏设置
    if (Capacitor.isNativePlatform()) {
        const initNative = async () => {
            try {
                // 让 WebView 延伸到状态栏下方
                await StatusBar.setOverlaysWebView({ overlay: true });
                await StatusBar.setStyle({ style: Style.Dark }); 
                await StatusBar.setBackgroundColor({ color: '#00000000' });
                
                await LocalNotifications.requestPermissions();

                // 闹钟频道：通过原生插件创建，走闹钟音量通道
                try {
                    await AlarmChannel.createAlarmChannel({
                        channelId: 'zen_nap_alarm_channel',
                        channelName: '小憩闹钟',
                    });
                } catch (e) {
                    console.warn('Native alarm channel failed, using fallback', e);
                    // Fallback：用 Capacitor 创建普通频道（媒体音量）
                    await LocalNotifications.createChannel({
                        id: 'zen_nap_alarm_channel',
                        name: '小憩闹钟',
                        importance: 5,
                        visibility: 1,
                        sound: 'default',
                    });
                }

                // 媒体频道：App 内播放引导音乐/白噪音用
                await LocalNotifications.createChannel({
                    id: 'zen_nap_media_channel',
                    name: '小憩背景音乐',
                    importance: 3,
                    sound: undefined,
                });

                LocalNotifications.addListener('localNotificationActionPerformed', (notification) => {
                    console.log('Notification clicked', notification);
                    checkSessionState();
                });

                CapacitorApp.addListener('appStateChange', ({ isActive }: { isActive: boolean }) => {
                    if (isActive) {
                        checkSessionState();
                    }
                });

                // 处理物理返回键
                backButtonListener = await CapacitorApp.addListener('backButton', () => {
                    if (isSettingsOpenRef.current) {
                        setIsSettingsOpen(false);
                        return;
                    }
                    
                    // 总结页按下返回 -> 回到首页 (执行 stopTimer 逻辑来清理和重置)
                    if (appStateRef.current === AppState.SUMMARY) {
                        stopTimerRef.current();
                        return;
                    }
                    
                    // 首页、倒计时中、闹钟响铃中 -> 最小化应用 (后台运行)
                    if (
                        appStateRef.current === AppState.IDLE || 
                        appStateRef.current === AppState.RUNNING ||
                        appStateRef.current === AppState.ALARM
                    ) {
                        CapacitorApp.minimizeApp();
                        return;
                    }
                });

            } catch (err) {
                console.warn('Native init failed', err);
            }
        };
        initNative();
    }

    checkSessionState();

    return () => {
        if (backButtonListener) {
            backButtonListener.remove();
        }
    };
  }, []); 

  // 核心状态检查逻辑：用于恢复状态或触发闹钟
  const checkSessionState = () => {
    const savedSession = localStorage.getItem('ACTIVE_NAP_SESSION');
    if (!savedSession) return;

    try {
        const session: PersistedSession = JSON.parse(savedSession);
        const now = Date.now();
        
        setSelectedModeIndex(session.modeIndex);
        setActiveDuration(session.durationMinutes);
        setIsSnoozing(session.isSnoozing);
        setEndTime(new Date(session.endTime));
        setStartTime(new Date(session.startTime));
        
        if (now >= session.endTime) {
            console.log("Session expired while backgrounded/killed. Triggering ALARM.");
            finishTimer(true); 
        } else {
            console.log("Restoring RUNNING session.");
            setAppState(AppState.RUNNING);
            const remainingSec = Math.floor((session.endTime - now) / 1000);
            setTimeLeft(remainingSec);
            requestWakeLock();
        }
    } catch (e) {
        console.error("Failed to parse saved session", e);
        clearSessionFromStorage();
    }
  };

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
            if (settings.snoozeDuration) {
                setSnoozeDuration(Number(settings.snoozeDuration) || 5);
            }
        } catch (e) {
            console.error("Failed to parse settings from localStorage", e);
        }
    }
  }, []);

  useEffect(() => {
    const settings = {
        snoozeDuration,
        music: {
            wakeUp: globalWakeUpMusic,
            refresh: globalRefreshMusic,
            guides: modeGuideMusic,
        }
    };
    localStorage.setItem('zenNapSettings', JSON.stringify(settings));
  }, [globalWakeUpMusic, globalRefreshMusic, modeGuideMusic, snoozeDuration]);

  useLayoutEffect(() => {
      const btn = modeButtonsRef.current[selectedModeIndex];
      if (btn) {
          setIndicatorStyle({
              left: btn.offsetLeft,
              top: btn.offsetTop,
              width: btn.offsetWidth,
              height: btn.offsetHeight,
              opacity: 1
          });
      }
  }, [selectedModeIndex]);

  useEffect(() => {
    if (appState === AppState.RUNNING && startTime && activeDuration > 0) {
      
      const checkTimer = () => {
        if (!endTime) return; 
        
        const now = Date.now();
        const remainingSeconds = Math.floor((endTime.getTime() - now) / 1000);
        
        setTimeLeft(Math.max(0, remainingSeconds));
        
        if (remainingSeconds <= 0) {
          finishTimer();
        }
      };

      const loop = () => {
        checkTimer();
        if (appState === AppState.RUNNING) {
           animationFrameRef.current = requestAnimationFrame(loop);
        }
      };
      animationFrameRef.current = requestAnimationFrame(loop);

      intervalRef.current = setInterval(checkTimer, 1000);
    }
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [appState, startTime, endTime, activeDuration]); 

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
              } else if (activeUploadContext.field === 'guide') {
                  if (activeUploadContext.modeId === 'ALL') {
                      const newGuides: Record<string, MusicTrack> = {};
                      MODES.forEach(mode => {
                          newGuides[mode.id] = track;
                      });
                      setModeGuideMusic(newGuides);
                  } else if (activeUploadContext.modeId) {
                      setModeGuideMusic(prev => ({
                          ...prev,
                          [activeUploadContext.modeId!]: track
                      }));
                  }
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

  const startTimerInternal = async (durationMinutes: number) => {
    setActiveDuration(durationMinutes);
    const durationSec = durationMinutes * 60;
    
    setTimeLeft(durationSec);
    const now = new Date();
    const end = new Date(now.getTime() + durationSec * 1000);
    setStartTime(now);
    setEndTime(end);

    // 持久化保存状态
    saveSessionToStorage(end, durationMinutes, selectedModeIndex, isSnoozing);
    
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
    await requestWakeLock();

    // Schedule Native Notification
    if (Capacitor.isNativePlatform()) {
        try {
            await LocalNotifications.cancel({ notifications: [{ id: 1 }] });
            
            await LocalNotifications.schedule({
                notifications: [{
                    title: "小憩结束",
                    body: "时间到了，该起床了 ☀️",
                    id: 1,
                    // 使用 allowWhileIdle 确保在 Doze 模式下也能触发
                    schedule: { at: end, allowWhileIdle: true },
                    // 关键：sound 设为 'default' 确保使用频道的闹钟音频流
                    // allowWhileIdle + channel 的 USAGE_ALARM = 后台也能按闹钟音量响铃
                    sound: 'default',
                    actionTypeId: "NAP_FINISHED",
                    extra: {
                        modeId: currentMode.id
                    },
                    channelId: 'zen_nap_alarm_channel',
                    ongoing: true,
                    autoCancel: false,
                }]
            });
        } catch (e) {
            console.error("Failed to schedule notification", e);
        }
    }
  };

  const startTimer = () => {
    if (isAnimating || appState !== AppState.IDLE) return;
    
    // Warm-up audio: Only play/pause to unlock audio context IF NO MUSIC IS PLAYING.
    // If music is already playing (guide music), we let it continue playing during the nap.
    if (audioRef.current && audioRef.current.paused) {
        audioRef.current.play().then(() => {
            audioRef.current!.pause();
        }).catch(e => console.warn("Audio warm-up failed", e));
    }

    setIsAnimating(true);
    if (!isSnoozing) setIsSnoozing(false); 
    setTimeout(() => {
        startTimerInternal(displayDuration);
        setIsAnimating(false);
    }, 700);
  };

  const completeSession = () => {
    stopAllAudio();
    setAppState(AppState.SUMMARY);
  };

  const handleSnooze = () => {
    stopAllAudio();
    setIsSnoozing(true);
    startTimerInternal(snoozeDuration);
  };

  // --- GESTURE HANDLERS ---
  const handleStopPressStart = () => {
    if (stopIntervalRef.current || isAnimating || isStopping) return;
    const startTime = Date.now();
    const DURATION = 1500;

    const tick = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / DURATION, 1);
        setStopProgress(progress);

        if (progress < 1) {
            stopIntervalRef.current = requestAnimationFrame(tick);
        } else {
            stopIntervalRef.current = null;
            setIsStopping(true);
            setTimeout(() => {
                stopTimer();
            }, 500);
        }
    };

    stopIntervalRef.current = requestAnimationFrame(tick);
  };

  const handleStopPressEnd = () => {
    if (!isStopping && stopIntervalRef.current) {
        cancelAnimationFrame(stopIntervalRef.current);
        stopIntervalRef.current = null;
        setStopProgress(0);
    }
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

  const handleAlarmPressStart = () => {
    if (alarmStopIntervalRef.current) return;
    const startTime = Date.now();
    const DURATION = 1500;

    const tick = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / DURATION, 1);
        setAlarmStopProgress(progress);

        if (progress < 1) {
            alarmStopIntervalRef.current = requestAnimationFrame(tick);
        } else {
            alarmStopIntervalRef.current = null;
            completeSession();
        }
    };
    alarmStopIntervalRef.current = requestAnimationFrame(tick);
  };

  const handleAlarmPressEnd = () => {
    if (alarmStopIntervalRef.current) {
        cancelAnimationFrame(alarmStopIntervalRef.current);
        alarmStopIntervalRef.current = null;
        setAlarmStopProgress(0);
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

  const idleTimerSize = currentMode.id === 'custom' ? 260 : 230;
  const runningTimerSize = 250;
  
  const transitionClass = "transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]";
  const stopTransitionClass = "transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]";

  return (
    <div 
      className="relative w-full h-full font-light touch-none"
    >
      <Background activeModeId={currentMode.id} modes={MODES} />
      
      <div 
        className={`${transitionClass} fixed -inset-[200px] z-5 transform-gpu`}
        style={{ 
          backdropFilter: `blur(${isAnimating || appState === AppState.RUNNING ? 20 : 0}px)`,
          WebkitBackdropFilter: `blur(${isAnimating || appState === AppState.RUNNING ? 20 : 0}px)`,
          willChange: 'backdrop-filter'
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

      <div className={`fixed inset-0 z-50 bg-[#0B0D14] flex flex-col transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${isSettingsOpen ? 'translate-x-0' : 'translate-x-full'}`}>
            <div className="flex items-center justify-between px-6 pb-5 pt-12 border-b border-white/5 bg-[#0B0D14] shrink-0 z-20">
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
                            <div className="flex flex-col">
                                <span className="text-base font-medium text-white/90">唤醒音频</span>
                                <span className="text-xs text-white/40 mt-1">小憩结束时播放</span>
                                {getMusicStatusText('wakeUp') && (
                                    <span className="text-xs text-white/60 mt-1 max-w-[150px] truncate">{getMusicStatusText('wakeUp')}</span>
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
                    <div className="flex items-center justify-between mb-3 pl-1 pr-1">
                        <div className="text-xs text-white/40 font-bold uppercase tracking-wider">模式专属引导音乐</div>
                        <button 
                            onClick={() => handleUploadClick('guide', 'ALL')}
                            className="flex items-center gap-1 text-xs text-white/60 hover:text-white transition-colors bg-white/5 px-2 py-1 rounded-md border border-white/5"
                        >
                            <Upload className="w-3 h-3" />
                            <span>一键设置所有</span>
                        </button>
                    </div>
                    
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

      {appState === AppState.IDLE && (
        <div className="flex flex-col h-full relative z-10">
            <div 
              className={`pt-12 px-6 flex justify-between items-center text-white/80 relative z-40 ${transitionClass}`}
              style={{ 
                  transform: isAnimating ? 'translateY(-60px)' : 'translateY(0)',
                  opacity: isAnimating ? 0 : 1
              }}
            >
                <ZenAppIcon className="w-12 h-12 text-white/80" />
                <div className="text-lg tracking-wide font-medium">小憩</div>
                <button 
                    onClick={() => setIsSettingsOpen(true)}
                    className="p-1 rounded-full active:bg-white/10 transition-colors"
                    disabled={isAnimating}
                >
                    <SettingsIcon />
                </button>
            </div>

            <div 
              className={`relative z-30 ${transitionClass}`}
              style={{ 
                transform: isAnimating ? 'translateY(-80px)' : 'translateY(0)',
                opacity: isAnimating ? 0 : 1
              }}
            >
                <div 
                    ref={scrollContainerRef}
                    className="mt-2 pt-10 flex overflow-x-auto space-x-2 px-4 pb-4 no-scrollbar relative items-center"
                    style={{ maskImage: 'linear-gradient(to right, transparent, black 5%, black 95%, transparent)' }}
                >
                    <div 
                        className="absolute rounded-full bg-white/20 backdrop-blur-md border border-white/30 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] z-0 shadow-[0_0_15px_rgba(255,255,255,0.3)]"
                        style={{ 
                            left: indicatorStyle.left, 
                            top: indicatorStyle.top,
                            width: indicatorStyle.width,
                            height: indicatorStyle.height,
                            opacity: indicatorStyle.opacity,
                        }}
                    />

                    {MODES.map((mode, idx) => (
                        <button
                            key={mode.id}
                            ref={(el) => { modeButtonsRef.current[idx] = el; }}
                            onClick={() => handleModeSelect(idx)}
                            className={`
                                whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-colors duration-300 relative z-10
                                ${idx === selectedModeIndex ? 'text-white' : 'text-white/50 hover:text-white/80'}
                            `}
                            disabled={isAnimating}
                        >
                            {mode.name}
                        </button>
                    ))}
                </div>
            </div>

            <div 
              className="flex-1 flex flex-col items-center justify-center"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onMouseDown={handleMouseDown}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
            >
                <div className="relative flex items-center justify-center min-h-[260px]">
                    {currentMode.id !== 'custom' && (
                        <div 
                          className={`${transitionClass} ease-out`}
                          style={{ 
                              transform: isAnimating ? 'scale(1.25)' : 'scale(1)',
                              opacity: isAnimating ? 0 : 1
                          }}
                        >
                          <CircularTimer progress={0} size={idleTimerSize} showTicks={true} color="transparent" />
                        </div>
                    )}
                    
                    <div className={`${currentMode.id === 'custom' ? 'relative' : 'absolute inset-0'} flex flex-col items-center justify-center`}>
                        {currentMode.id === 'custom' ? (
                            <div 
                              className={`${transitionClass} ease-out`}
                              style={{ 
                                  transform: isAnimating ? 'scale(1.25)' : 'scale(1)',
                                  opacity: isAnimating ? 0 : 1
                              }}
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
                              className={`flex flex-col items-center justify-center select-none ${transitionClass} ease-out`}
                              style={{ 
                                  transform: isAnimating ? 'scale(1.25)' : 'scale(1)',
                                  opacity: isAnimating ? 0 : 1
                              }}
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

                <div 
                  className={`pb-16 flex flex-col items-center justify-center w-full relative z-20 ${transitionClass}`}
                  style={{ 
                      opacity: isAnimating ? 0 : 1,
                      transform: isAnimating ? 'translateY(40px)' : 'translateY(0)'
                  }}
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
                            className={`w-20 h-20 bg-white rounded-full flex items-center justify-center transition-all duration-300 active:scale-95 group relative hover:scale-105 ${isAnimating ? 'scale-75 opacity-0' : ''}`}
                            style={{ 
                              boxShadow: `0 0 40px ${currentMode.themeColor}50`,
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
        <div className={`absolute inset-0 z-20 flex flex-col h-full animate-fade-in ${stopTransitionClass}`}
             style={{
                 transform: isStopping ? 'scale(0.8)' : 'scale(1)',
                 opacity: isStopping ? 0 : 1
             }}
        >
            <div className="pt-12 px-6 flex justify-center items-center text-white/80">
                <div className="text-lg font-light tracking-wide opacity-80">
                    {isSnoozing ? '再睡一会' : currentMode.name.split(' ')[0]}
                </div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center">
                <div className="relative flex items-center justify-center">
                    <CircularTimer progress={1 - (timeLeft / (activeDuration * 60))} size={runningTimerSize} color="white" />
                    
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
        >
            <div className="absolute inset-0 z-[-1]">
                <img 
                    src="https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?q=80&w=1080&auto=format&fit=crop" 
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
                    <div className="text-xs text-white/60">点击再眯一会儿</div>
                </div>
            </div>

            <div className="flex flex-col items-center w-full relative pb-8 z-10">
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
                            strokeDashoffset={2 * Math.PI * 42 * (1 - alarmStopProgress)}
                            strokeLinecap="round"
                        />
                    </svg>

                    <button 
                        onMouseDown={handleAlarmPressStart}
                        onMouseUp={handleAlarmPressEnd}
                        onMouseLeave={handleAlarmPressEnd}
                        onTouchStart={handleAlarmPressStart}
                        onTouchEnd={handleAlarmPressEnd}
                        className="w-16 h-16 rounded-full border border-white/30 flex items-center justify-center text-white/80 backdrop-blur-md active:bg-white/10 transition-colors z-10"
                    >
                        <div className="w-3 h-3 bg-white rounded-[1px]" />
                    </button>
                </div>
                <div className="mt-4 text-white/40 text-xs tracking-wider">长按停止唤醒</div>
            </div>
        </div>
      )}

      {appState === AppState.SUMMARY && sessionStats && (
        <div className="absolute inset-0 z-40 bg-black/60 flex flex-col items-center justify-center p-6">
            <div className="w-full max-w-sm bg-[#2a2a35] rounded-3xl p-6 shadow-2xl relative overflow-hidden">
                
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

            <button onClick={stopTimer} className="mt-8 p-4 rounded-full bg-white/10 hover:bg-white/20 transition-colors">
                <X className="w-6 h-6 text-white" />
            </button>
        </div>
      )}
    </div>
  );
}

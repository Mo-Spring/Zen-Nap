import React, { useState, useEffect, useRef } from 'react';
import { AppState, NapMode, SessionStats, MusicTrack } from './types';
import { MODES } from './constants';
import CircularTimer from './components/CircularTimer';
import Background from './components/Background';
import WheelPicker from './components/WheelPicker';
import {
  SettingsIcon,
  StatsIcon,
  BackIcon,
  InfoIcon,
  IconMap
} from './components/Icons';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { LocalNotifications } from '@capacitor/local-notifications';

const App: React.FC = () => {
  // ========== 状态管理 ==========
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [selectedModeIndex, setSelectedModeIndex] = useState<number>(2);
  const [customDuration, setCustomDuration] = useState<number>(30);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [painlessWakeUpDuration, setPainlessWakeUpDuration] = useState<number>(10);
  const [snoozeDuration, setSnoozeDuration] = useState<number>(5);
  const [globalWakeUpMusic, setGlobalWakeUpMusic] = useState<MusicTrack | null>(null);
  const [globalRefreshMusic, setGlobalRefreshMusic] = useState<MusicTrack | null>(null);
  const [modeGuideMusic, setModeGuideMusic] = useState<Record<string, MusicTrack>>({});
  const [playingAudioPath, setPlayingAudioPath] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [activeUploadContext, setActiveUploadContext] = useState<{ field: string; modeId?: string } | null>(null);
  const [slideY, setSlideY] = useState<number>(0);
  const [stopProgress, setStopProgress] = useState<number>(0);

  // ========== Refs ==========
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const stopIntervalRef = useRef<number | null>(null);
  const dragStartY = useRef<number | null>(null);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const isDragging = useRef<boolean>(false);

  // ========== 初始化通知 ==========
  useEffect(() => {
    const initNotifications = async () => {
      await LocalNotifications.requestPermissions();
      await LocalNotifications.cancel({ notifications: [{ id: 1 }] });
    };
    initNotifications();

    return () => {
      LocalNotifications.removeAllListeners();
    };
  }, []);

  // ========== 加载设置 ==========
  useEffect(() => {
    const saved = localStorage.getItem('zenNapSettings');
    if (saved) {
      try {
        const settings = JSON.parse(saved);
        if (settings.globalWakeUpMusic) {
          setGlobalWakeUpMusic(settings.globalWakeUpMusic);
        }
        if (settings.globalRefreshMusic) {
          setGlobalRefreshMusic(settings.globalRefreshMusic);
        }
        if (settings.modeGuideMusic) {
          setModeGuideMusic(settings.modeGuideMusic);
        }
        if (settings.painlessWakeUpDuration !== undefined) {
          setPainlessWakeUpDuration(settings.painlessWakeUpDuration);
        }
        if (settings.snoozeDuration !== undefined) {
          setSnoozeDuration(settings.snoozeDuration);
        }
      } catch (e) {
        console.error('Failed to parse settings', e);
      }
    }
  }, []);

  // ========== 保存设置 ==========
  useEffect(() => {
    const settings = {
      globalWakeUpMusic,
      globalRefreshMusic,
      modeGuideMusic,
      painlessWakeUpDuration,
      snoozeDuration
    };
    localStorage.setItem('zenNapSettings', JSON.stringify(settings));
  }, [globalWakeUpMusic, globalRefreshMusic, modeGuideMusic, painlessWakeUpDuration, snoozeDuration]);

  // ========== 计时器循环 ==========
  useEffect(() => {
    if (appState !== AppState.RUNNING || !startTime) return;

    const updateTimer = () => {
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

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [appState, startTime, displayDuration]);

  // ========== 启动动画 ==========
  useEffect(() => {
    if (!isAnimating) return;

    let start: number | null = null;
    const duration = 800;

    const animate = (timestamp: number) => {
      if (!start) start = timestamp;
      const elapsed = timestamp - start;
      const progress = Math.min(elapsed / duration, 1);
      setAnimationProgress(progress);

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        setIsAnimating(false);
        startTimerInternal();
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isAnimating]);

  // ========== 工具函数 ==========
  const getWakeUpTimeString = (): string => {
    if (!endTime) return '';
    return endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatTime = (seconds: number): { m: number; s: number } => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return { m, s };
  };

  const playAudio = async (trackPath: string | undefined) => {
    if (!trackPath || playingAudioPath === trackPath) return;

    try {
      stopAllAudio();
      setPlayingAudioPath(trackPath);

      let src = trackPath;
      // Capacitor file path conversion
      if (trackPath.startsWith('file://') || trackPath.includes('/Documents/')) {
        src = Capacitor.convertFileSrc(trackPath);
      }

      if (audioRef.current) {
        audioRef.current.src = src;
        await audioRef.current.play();
      }
    } catch (error) {
      console.error('Audio playback failed:', error);
      setPlayingAudioPath(null);
    }
  };

  const stopAllAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setPlayingAudioPath(null);
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const handleUploadClick = (field: string, modeId?: string) => {
    setActiveUploadContext({ field, modeId });
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !activeUploadContext) return;

    const file = files[0];
    const base64String = await fileToBase64(file);
    const fileName = `${Date.now()}_${file.name}`;
    
    try {
      const result = await Filesystem.writeFile({
        path: fileName,
        data: base64String.split(',')[1],
        directory: Directory.Documents,
        encoding: Encoding.UTF8
      });

      const filePath = result.uri;
      const newTrack: MusicTrack = { name: file.name, path: filePath };

      const { field, modeId } = activeUploadContext;
      if (field === 'wakeUp') {
        setGlobalWakeUpMusic(newTrack);
      } else if (field === 'refresh') {
        setGlobalRefreshMusic(newTrack);
      } else if (field === 'guide' && modeId) {
        setModeGuideMusic(prev => ({ ...prev, [modeId]: newTrack }));
      }
    } catch (error) {
      console.error('File write failed:', error);
    }

    setActiveUploadContext(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const getMusicStatusText = (field: string, modeId?: string): string => {
    if (field === 'wakeUp') {
      return globalWakeUpMusic ? globalWakeUpMusic.name : '未设置';
    } else if (field === 'refresh') {
      return globalRefreshMusic ? globalRefreshMusic.name : '未设置';
    } else if (field === 'guide' && modeId) {
      return modeGuideMusic[modeId] ? modeGuideMusic[modeId].name : '未设置';
    }
    return '未设置';
  };

  // ========== 核心计时逻辑 ==========
  const startTimer = () => {
    setIsAnimating(true);
  };

  const startTimerInternal = () => {
    const now = new Date();
    const totalSeconds = displayDuration * 60;
    const endTime = new Date(now.getTime() + totalSeconds * 1000);

    // 🚨 新增：预约系统通知（锁屏也能响）
    LocalNotifications.schedule({
      notifications: [{
        id: 1,
        title: 'Zen Nap Timer',
        body: '小憩时间到！该起床啦～',
        schedule: { at: endTime },
        sound: 'beep',
        channelId: 'nap-channel'
      }]
    });

    setStartTime(now);
    setEndTime(endTime);
    setTimeLeft(totalSeconds);
    setSessionStats({
      startTime: now,
      endTime: endTime,
      totalSeconds: totalSeconds,
    });
    setAppState(AppState.RUNNING);
  };

  const stopTimer = () => {
    LocalNotifications.cancel({ notifications: [{ id: 1 }] }); // 🚨 取消通知
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (stopIntervalRef.current) {
      clearInterval(stopIntervalRef.current);
    }
    stopAllAudio();
    setAppState(AppState.IDLE);
    setTimeLeft(0);
    setStartTime(null);
    setEndTime(null);
    setStopProgress(0);
  };

  const finishTimer = () => {
    LocalNotifications.cancel({ notifications: [{ id: 1 }] }); // 🚨 安全取消
    setAppState(AppState.ALARM);
    playAudio(globalWakeUpMusic?.path);
  };

  const completeSession = () => {
    LocalNotifications.cancel({ notifications: [{ id: 1 }] }); // 🚨 取消通知
    setAppState(AppState.SUMMARY);
    playAudio(globalRefreshMusic?.path);
  };

  const handleSnooze = () => {
    const now = new Date();
    const totalSeconds = snoozeDuration * 60;
    const endTime = new Date(now.getTime() + totalSeconds * 1000);

    // 🚨 重新预约通知
    LocalNotifications.schedule({
      notifications: [{
        id: 1,
        title: 'Zen Nap Timer',
        body: '再睡一会时间到！',
        schedule: { at: endTime },
        sound: 'beep',
        channelId: 'nap-channel'
      }]
    });

    setStartTime(now);
    setEndTime(endTime);
    setTimeLeft(totalSeconds);
    setSessionStats({
      startTime: now,
      endTime: endTime,
      totalSeconds: totalSeconds,
    });
    setAppState(AppState.RUNNING);
  };

  // ========== 交互处理 ==========
  const handleModeSelect = (index: number) => {
    setSelectedModeIndex(index);
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const itemWidth = container.scrollWidth / MODES.length;
      const targetScroll = itemWidth * index - container.clientWidth / 2 + itemWidth / 2;
      container.scrollTo({ left: targetScroll, behavior: 'smooth' });
    }
  };

  const handleStopPressStart = () => {
    setStopProgress(0);
    const interval = setInterval(() => {
      setStopProgress(prev => {
        if (prev >= 1) {
          if (interval) clearInterval(interval);
          stopTimer();
          return 1;
        }
        return prev + 0.01;
      });
    }, 30);
    stopIntervalRef.current = interval;
  };

  const handleStopPressEnd = () => {
    if (stopIntervalRef.current) {
      clearInterval(stopIntervalRef.current);
      stopIntervalRef.current = null;
    }
    setStopProgress(0);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    isDragging.current = true;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current || touchStartX.current === null) return;
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!isDragging.current || touchStartX.current === null || touchEndX.current === null) return;
    
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > 50) {
      if (diff > 0 && selectedModeIndex < MODES.length - 1) {
        handleModeSelect(selectedModeIndex + 1);
      } else if (diff < 0 && selectedModeIndex > 0) {
        handleModeSelect(selectedModeIndex - 1);
      }
    }
    
    isDragging.current = false;
    touchStartX.current = null;
    touchEndX.current = null;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    touchStartX.current = e.clientX;
    isDragging.current = true;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current || touchStartX.current === null) return;
    touchEndX.current = e.clientX;
  };

  const handleMouseUp = () => {
    if (!isDragging.current || touchStartX.current === null || touchEndX.current === null) return;
    
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > 50) {
      if (diff > 0 && selectedModeIndex < MODES.length - 1) {
        handleModeSelect(selectedModeIndex + 1);
      } else if (diff < 0 && selectedModeIndex > 0) {
        handleModeSelect(selectedModeIndex - 1);
      }
    }
    
    isDragging.current = false;
    touchStartX.current = null;
    touchEndX.current = null;
  };

  const handleAlarmTouchStart = (e: React.TouchEvent) => {
    dragStartY.current = e.touches[0].clientY;
  };

  const handleAlarmTouchMove = (e: React.TouchEvent) => {
    if (dragStartY.current !== null) {
      const currentY = e.touches[0].clientY;
      const deltaY = currentY - dragStartY.current;
      if (deltaY > 0) {
        setSlideY(Math.min(deltaY, 300));
      }
    }
  };

  const handleAlarmTouchEnd = () => {
    if (slideY > 200) {
      completeSession();
    } else {
      setSlideY(0);
    }
    dragStartY.current = null;
  };

  const handleAlarmMouseDown = (e: React.MouseEvent) => {
    dragStartY.current = e.clientY;
  };

  const handleAlarmMouseMove = (e: React.MouseEvent) => {
    if (dragStartY.current !== null) {
      const currentY = e.clientY;
      const deltaY = currentY - dragStartY.current;
      if (deltaY > 0) {
        setSlideY(Math.min(deltaY, 300));
      }
    }
  };

  const handleAlarmMouseUp = () => {
    if (slideY > 200) {
      completeSession();
    } else {
      setSlideY(0);
    }
    dragStartY.current = null;
  };

  // ========== 渲染逻辑 ==========
  const displayDuration = selectedModeIndex === 4 ? customDuration : MODES[selectedModeIndex].durationMinutes;
  const currentMode = selectedModeIndex === 4 ? { ...MODES[4], durationMinutes: customDuration } : MODES[selectedModeIndex];
  const { m, s } = formatTime(timeLeft);

  return (
    <>
      {/* 音频元素 */}
      <audio ref={audioRef} />
      <input
        type="file"
        ref={fileInputRef}
        onChange={onFileChange}
        accept="audio/*"
        className="hidden"
      />

      {/* 背景 */}
      <Background image={currentMode.bgImage} color={currentMode.themeColor} />

      {/* 主界面 */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-6 text-white">
        {appState === AppState.IDLE && (
          <div className="w-full max-w-md">
            {/* 模式选择 */}
            <div
              ref={scrollContainerRef}
              className="flex overflow-x-auto no-scrollbar pb-4 mb-8 hide-scroll"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              {MODES.map((mode, index) => (
                <button
                  key={mode.id}
                  onClick={() => handleModeSelect(index)}
                  className={`flex-shrink-0 mx-2 px-4 py-3 rounded-2xl transition-all ${
                    index === selectedModeIndex
                      ? 'bg-white/20 backdrop-blur-sm scale-105'
                      : 'bg-white/10 hover:bg-white/15'
                  }`}
                >
                  <div className="flex flex-col items-center">
                    {React.createElement(IconMap[mode.iconType], { size: 24, strokeWidth: 1.5 })}
                    <span className="mt-1 text-sm font-medium">{mode.name}</span>
                  </div>
                </button>
              ))}
            </div>

            {/* 自定义时长 */}
            {selectedModeIndex === 4 && (
              <div className="mb-8">
                <WheelPicker
                  value={customDuration}
                  onChange={setCustomDuration}
                  min={1}
                  max={120}
                />
              </div>
            )}

            {/* 开始按钮 */}
            <button
              onClick={startTimer}
              className="w-full py-4 text-xl font-bold bg-white/20 backdrop-blur-sm rounded-2xl hover:bg-white/30 transition-colors"
            >
              开始小憩 ({displayDuration} 分钟)
            </button>

            {/* 底部按钮 */}
            <div className="flex justify-between mt-6">
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="p-3 bg-white/10 backdrop-blur-sm rounded-xl"
              >
                <SettingsIcon />
              </button>
              <button className="p-3 bg-white/10 backdrop-blur-sm rounded-xl">
                <StatsIcon />
              </button>
            </div>
          </div>
        )}

        {appState === AppState.RUNNING && (
          <div className="w-full max-w-md flex flex-col items-center">
            <CircularTimer
              progress={1 - timeLeft / (displayDuration * 60)}
              duration={displayDuration * 60}
              size={300}
            />
            <div className="mt-6 text-5xl font-mono font-bold">
              {String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
            </div>
            <div className="mt-2 text-lg opacity-80">
              预计唤醒时间: {getWakeUpTimeString()}
            </div>
            <button
              onTouchStart={handleStopPressStart}
              onTouchEnd={handleStopPressEnd}
              onMouseDown={handleStopPressStart}
              onMouseUp={handleStopPressEnd}
              onMouseLeave={handleStopPressEnd}
              className="mt-8 w-24 h-24 rounded-full bg-red-500/20 backdrop-blur-sm flex items-center justify-center"
              style={{ 
                background: `conic-gradient(from 0deg, rgba(239,68,68,0.5) ${stopProgress * 360}deg, transparent ${stopProgress * 360}deg)`
              }}
            >
              <div className="text-xs text-center">长按<br/>停止</div>
            </button>
          </div>
        )}

        {appState === AppState.ALARM && (
          <div
            className="w-full max-w-md flex flex-col items-center"
            onTouchStart={handleAlarmTouchStart}
            onTouchMove={handleAlarmTouchMove}
            onTouchEnd={handleAlarmTouchEnd}
            onMouseDown={handleAlarmMouseDown}
            onMouseMove={handleAlarmMouseMove}
            onMouseUp={handleAlarmMouseUp}
            onMouseLeave={handleAlarmMouseUp}
            style={{ transform: `translateY(${slideY}px)` }}
          >
            <div className="text-4xl font-bold mb-4">时间到！</div>
            <button
              onClick={handleSnooze}
              className="py-3 px-6 bg-white/20 backdrop-blur-sm rounded-xl mb-6"
            >
              再睡 {snoozeDuration} 分钟
            </button>
            <div className="text-sm opacity-70">上滑关闭</div>
          </div>
        )}

        {appState === AppState.SUMMARY && (
          <div className="w-full max-w-md text-center">
            <div className="text-3xl font-bold mb-2">小憩完成！</div>
            <div className="text-lg opacity-80 mb-6">
              本次小憩时长: {displayDuration} 分钟
            </div>
            <button
              onClick={() => setAppState(AppState.IDLE)}
              className="py-3 px-6 bg-white/20 backdrop-blur-sm rounded-xl"
            >
              返回
            </button>
          </div>
        )}
      </div>

      {/* 设置面板 */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-20 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 w-full max-w-md border border-white/20">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">设置</h2>
              <button onClick={() => setIsSettingsOpen(false)}>
                <BackIcon />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="font-medium mb-3">通用设置</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span>唤醒音乐</span>
                    <button
                      onClick={() => handleUploadClick('wakeUp')}
                      className="text-sm bg-white/20 px-3 py-1 rounded-lg"
                    >
                      {getMusicStatusText('wakeUp')}
                    </button>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>提神音乐</span>
                    <button
                      onClick={() => handleUploadClick('refresh')}
                      className="text-sm bg-white/20 px-3 py-1 rounded-lg"
                    >
                      {getMusicStatusText('refresh')}
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-medium mb-3">模式专属引导音乐</h3>
                <div className="space-y-3">
                  {MODES.slice(0, 4).map(mode => (
                    <div key={mode.id} className="flex justify-between items-center">
                      <span>{mode.name}</span>
                      <button
                        onClick={() => handleUploadClick('guide', mode.id)}
                        className="text-sm bg-white/20 px-3 py-1 rounded-lg"
                      >
                        {getMusicStatusText('guide', mode.id)}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default App;

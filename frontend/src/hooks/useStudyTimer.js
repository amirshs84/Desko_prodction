import { useState, useEffect, useRef } from 'react';

/**
 * Custom hook for managing study timer with WakeLock and visibility-based controls
 * @param {number} initialSeconds - Starting seconds for the timer
 * @returns {Object} Timer state and control functions
 */
export const useStudyTimer = (initialSeconds = 0) => {
  // State to hold the current elapsed time in seconds
  const [seconds, setSeconds] = useState(initialSeconds);
  
  // State to track if the timer is currently running (active)
  const [isActive, setIsActive] = useState(false);
  
  // State to track if the timer is paused
  const [isPaused, setIsPaused] = useState(false);
  
  // State to track if focus was lost (tab switch/minimize)
  const [focusLost, setFocusLost] = useState(false);

  // Flag to track if state has been restored from localStorage
  const [isRestored, setIsRestored] = useState(false);

  // Refs to hold mutable values that don't trigger re-renders
  const wakeLockRef = useRef(null);
  const intervalRef = useRef(null);
  
  // Timestamps
  const currentSegmentStartRef = useRef(null); // When the *current* running segment started (for calculating elapsed)
  const accumulatedTimeRef = useRef(0); // Time accumulated from previous segments
  const sessionStartTimeRef = useRef(null); // The wall-clock time when the session FIRST started

  // Initialize state from localStorage on mount
  useEffect(() => {
    try {
      const savedState = localStorage.getItem('timerState');
      if (savedState) {
        const state = JSON.parse(savedState);
        
        // Restore refs
        accumulatedTimeRef.current = state.accumulatedTime || 0;
        sessionStartTimeRef.current = state.sessionStartTime || null;
        
        // Restore active/paused states
        if (state.isActive) {
          setIsActive(true);
          
          if (state.isPaused) {
             setIsPaused(true);
             // If paused, the displayed seconds is just the accumulated time
             setSeconds(accumulatedTimeRef.current);
          } else {
             // If running, calculate elapsed time since the current segment start
             const now = Date.now();
             const segmentStart = state.currentSegmentStart;
             
             if (segmentStart && !isNaN(segmentStart)) {
                currentSegmentStartRef.current = segmentStart;
                const currentSegmentDuration = Math.floor((now - segmentStart) / 1000);
                setSeconds(accumulatedTimeRef.current + currentSegmentDuration);
             } else {
                // Fallback if segment start is missing but state says running
                setSeconds(accumulatedTimeRef.current);
             }
             requestWakeLock();
          }
        }
      }
    } catch (e) {
      console.error("Failed to restore timer state:", e);
      setSeconds(initialSeconds);
    } finally {
      setIsRestored(true);
    }
  }, []);

  // Persist state to localStorage whenever significant state changes
  useEffect(() => {
    if (!isRestored) return;

    if (isActive) {
      const stateToSave = {
        isActive,
        isPaused,
        currentSegmentStart: currentSegmentStartRef.current,
        accumulatedTime: accumulatedTimeRef.current,
        sessionStartTime: sessionStartTimeRef.current,
        lastUpdate: Date.now()
      };
      localStorage.setItem('timerState', JSON.stringify(stateToSave));
    } else {
      // Only remove if we are fully restored and explicitly inactive (stopped)
      localStorage.removeItem('timerState');
    }
  }, [isActive, isPaused, isRestored]);

  /**
   * WakeLock Logic
   */
  const requestWakeLock = async () => {
    if ('wakeLock' in navigator && !wakeLockRef.current) {
      try {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
        console.log('Wake Lock acquired');
        
        wakeLockRef.current.addEventListener('release', () => {
          console.log('Wake Lock released');
          wakeLockRef.current = null;
        });
      } catch (error) {
        console.warn('Wake Lock request failed:', error);
      }
    }
  };

  const releaseWakeLock = async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
      } catch (error) {
        console.warn('Wake Lock release failed:', error);
      }
    }
  };

  const syncSecondsFromWallClock = () => {
    const start = currentSegmentStartRef.current;
    if (start == null || !Number.isFinite(start)) return;
    setSeconds(
      accumulatedTimeRef.current + Math.floor((Date.now() - start) / 1000),
    );
  };

  /**
   * اندروید: پلاگین StudyTimerLifecycle — فقط خروج به اپ دیگر قطع می‌کند؛
   * خواب صفحه با پاور leftApp حساب نمی‌شود.
   * iOS و سایر پلتفرم‌های نیتیو: appStateChange.
   * وب: visibilitychange.
   */
  useEffect(() => {
    let cleanupFn = null;
    let cancelled = false;

    const finalize = () => {
      cleanupFn?.();
      cleanupFn = null;
    };

    const attachOrDrop = (remove) => {
      if (cancelled) {
        remove?.();
        return;
      }
      cleanupFn = remove;
    };

    const setupAndroidTimerLifecycle = async () => {
      try {
        const { Capacitor } = await import('@capacitor/core');
        if (!Capacitor.isPluginAvailable('StudyTimerLifecycle')) {
          await setupNativeDefaultListener();
          return;
        }
        const { StudyTimerLifecycle } = await import('../plugins/studyTimerLifecycle');
        const handle = await StudyTimerLifecycle.addListener(
          'timerFocusPolicy',
          async (evt) => {
            const kind = evt?.kind;
            if (kind === 'leftApp' && isActive && !isPaused) {
              pause();
              setFocusLost(true);
            } else if (kind === 'active' && isActive && !isPaused) {
              syncSecondsFromWallClock();
              await requestWakeLock();
            }
          },
        );
        attachOrDrop(() => handle.remove());
      } catch {
        await setupNativeDefaultListener();
      }
    };

    const setupNativeDefaultListener = async () => {
      try {
        const { App: CapApp } = await import('@capacitor/app');
        const handle = await CapApp.addListener('appStateChange', async (state) => {
          if (!state.isActive && isActive && !isPaused) {
            pause();
            setFocusLost(true);
          } else if (state.isActive && isActive && !isPaused) {
            syncSecondsFromWallClock();
            await requestWakeLock();
          }
        });
        attachOrDrop(() => handle.remove());
      } catch {
        setupWebListener();
      }
    };

    const setupWebListener = () => {
      const handleVisibilityChange = async () => {
        if (document.visibilityState === 'hidden' && isActive && !isPaused) {
          pause();
          setFocusLost(true);
        } else if (document.visibilityState === 'visible' && isActive && !isPaused) {
          syncSecondsFromWallClock();
          await requestWakeLock();
        }
      };
      document.addEventListener('visibilitychange', handleVisibilityChange);
      attachOrDrop(() => document.removeEventListener('visibilitychange', handleVisibilityChange));
    };

    const isNativeCap = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
    const plat = window.Capacitor?.getPlatform?.() ?? '';

    if (!isNativeCap) {
      setupWebListener();
    } else if (plat === 'android') {
      void setupAndroidTimerLifecycle();
    } else {
      void setupNativeDefaultListener();
    }

    return () => {
      cancelled = true;
      finalize();
    };
  }, [isActive, isPaused]);

  /**
   * Timer Tick Logic
   */
  useEffect(() => {
    if (isActive && !isPaused) {
      intervalRef.current = setInterval(() => {
        const now = Date.now();
        const start = currentSegmentStartRef.current;
        if (start) {
          const currentSegment = Math.floor((now - start) / 1000);
          setSeconds(accumulatedTimeRef.current + currentSegment);
        }
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isActive, isPaused]);

  /**
   * Controls
   */
  const start = () => {
    if (isActive && !isPaused) return;

    const now = Date.now();
    
    // If this is the very first start (not a resume), set the session start time
    if (!isActive && accumulatedTimeRef.current === 0) {
        sessionStartTimeRef.current = now;
    }

    currentSegmentStartRef.current = now;
    setIsActive(true);
    setIsPaused(false);
    setFocusLost(false);
    requestWakeLock();
  };

  const pause = () => {
    if (!isActive || isPaused) return;

    const now = Date.now();
    const start = currentSegmentStartRef.current;
    if (start) {
        // Add the duration of the current segment to accumulated time
        accumulatedTimeRef.current += Math.floor((now - start) / 1000);
    }
    
    setIsPaused(true);
    currentSegmentStartRef.current = null;
    
    // Update display one last time
    setSeconds(accumulatedTimeRef.current);
    
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  const resume = () => {
    if (!isActive || !isPaused) return;

    const now = Date.now();
    currentSegmentStartRef.current = now;
    setIsPaused(false);
    setFocusLost(false);
    requestWakeLock();
  };

  const stop = () => {
    setIsActive(false);
    setIsPaused(false);
    setFocusLost(false);
    accumulatedTimeRef.current = 0;
    currentSegmentStartRef.current = null;
    sessionStartTimeRef.current = null;
    setSeconds(0);
    releaseWakeLock();
    if (intervalRef.current) clearInterval(intervalRef.current);
    localStorage.removeItem('timerState');
  };

  const reset = () => {
    stop();
    setSeconds(initialSeconds);
  };

  return {
    seconds,
    isActive,
    isPaused,
    focusLost,
    sessionStartTime: sessionStartTimeRef.current, // Expose this for the UI
    start,
    pause,
    resume,
    stop,
    reset,
  };
};

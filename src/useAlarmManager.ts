import { useState, useEffect, useRef, useCallback } from 'react';
import { Alarm } from './types';
import { RINGTONES, globalAudioContext } from './RingtoneGenerator';

type AlarmState = 'idle' | 'ramping' | 'hold' | 'ringtone';

export function useAlarmManager(alarms: Alarm[]) {
  const [activeAlarm, setActiveAlarm] = useState<Alarm | null>(null);
  const [alarmState, setAlarmState] = useState<AlarmState>('idle');
  
  const startTimeRef = useRef<number>(0);
  const stopAudioRef = useRef<(() => void) | null>(null);
  
  const tickRef = useRef<number | null>(null);

  // Check for alarm to trigger
  useEffect(() => {
    if (activeAlarm) return; // Already ringing
    
    const interval = setInterval(() => {
      const now = new Date();
      const currentHours = now.getHours().toString().padStart(2, '0');
      const currentMinutes = now.getMinutes().toString().padStart(2, '0');
      const currentTimeStr = `${currentHours}:${currentMinutes}`;
      
      const triggered = alarms.find(a => a.enabled && a.time === currentTimeStr);
      if (triggered) {
        // Wait! We only want to trigger once per minute. 
        // We can track last triggered time to avoid re-triggering.
        try {
          const lastTriggered = localStorage.getItem('lastTriggeredTime');
          const triggerKey = `${triggered.id}-${now.toDateString()}-${currentTimeStr}`;
          if (lastTriggered !== triggerKey) {
            localStorage.setItem('lastTriggeredTime', triggerKey);
            startAlarm(triggered);
          }
        } catch (e) {
          // Fallback if localStorage is unavailable
          startAlarm(triggered);
        }
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [alarms, activeAlarm]);

  const startAlarm = useCallback((alarm: Alarm) => {
    setActiveAlarm(alarm);
    setAlarmState('ramping');
    startTimeRef.current = Date.now();
    
    if (globalAudioContext && globalAudioContext.state === 'suspended') {
      globalAudioContext.resume();
    }
  }, []);

  const stopAlarm = useCallback(() => {
    setActiveAlarm(null);
    setAlarmState('idle');
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
    if (stopAudioRef.current) {
      stopAudioRef.current();
      stopAudioRef.current = null;
    }
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(0); // Stop vibration
    }
  }, []);

  const snoozeAlarm = useCallback(() => {
    if (!activeAlarm) return;
    
    const now = new Date();
    now.setMinutes(now.getMinutes() + 5);
    const newHours = now.getHours().toString().padStart(2, '0');
    const newMinutes = now.getMinutes().toString().padStart(2, '0');
    
    // Instead of mutating the original, we should ideally trigger a callback to update it,
    // but returning a modified copy to the parent is better.
    // For now, we return the id and new time so the parent can handle it.
    const snoozedAlarmId = activeAlarm.id;
    const snoozedTime = `${newHours}:${newMinutes}`;
    
    stopAlarm();
    
    return { snoozedAlarmId, snoozedTime };
  }, [activeAlarm, stopAlarm]);

  // Main alarm loop
  useEffect(() => {
    if (!activeAlarm) return;

    tickRef.current = window.setInterval(() => {
      const now = Date.now();
      const elapsedMs = now - startTimeRef.current;
      
      const rampMs = activeAlarm.rampDurationMinutes * 60 * 1000;
      const holdMs = activeAlarm.pauseDurationSeconds * 1000;
      
      let currentIntensity = 0; // 0 to 1
      let currentState: AlarmState = 'ramping';

      if (elapsedMs < rampMs) {
        // Ramping phase
        const progress = rampMs > 0 ? elapsedMs / rampMs : 1;
        const minI = activeAlarm.minVibration / 100;
        const maxI = activeAlarm.maxVibration / 100;
        currentIntensity = minI + (maxI - minI) * progress;
      } else if (elapsedMs < rampMs + holdMs) {
        // Hold phase
        currentState = 'hold';
        currentIntensity = activeAlarm.maxVibration / 100;
      } else {
        // Ringtone phase
        currentState = 'ringtone';
        currentIntensity = activeAlarm.maxVibration / 100;
      }

      setAlarmState(currentState);

      // Handle Vibration (Intensity is simulated by duty cycle)
      // Cycle is 1000ms
      const vTime = Math.max(0, Math.min(1000, Math.floor(currentIntensity * 1000)));
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        if (vTime > 0) {
          navigator.vibrate([vTime, 1000 - vTime]);
        } else {
          navigator.vibrate(0);
        }
      }

      // Handle Audio
      if (currentState === 'ringtone' && !stopAudioRef.current) {
        const ringtoneDef = RINGTONES.find(r => r.id === activeAlarm.ringtone) || RINGTONES[0];
        if (globalAudioContext) {
           stopAudioRef.current = ringtoneDef.play(globalAudioContext);
        }
      }
      
    }, 1000);

    return () => {
      if (tickRef.current) {
        clearInterval(tickRef.current);
      }
    };
  }, [activeAlarm]);

  return { activeAlarm, alarmState, stopAlarm, snoozeAlarm, startAlarm };
}

import { useState, useEffect, useRef } from 'react';
import { motion, useMotionValue, useTransform } from 'motion/react';
import { Bell, Plus, Settings, ChevronRight, X, Play, Clock, Pause, Moon } from 'lucide-react';
import { Alarm } from './types';
import { useAlarmManager } from './useAlarmManager';
import { RINGTONES, initAudioContext } from './RingtoneGenerator';

const DEFAULT_ALARM: Omit<Alarm, 'id'> = {
  time: '07:00',
  enabled: true,
  minVibration: 0,
  maxVibration: 100,
  rampDurationMinutes: 1,
  pauseDurationSeconds: 20,
  ringtone: 'beep',
};

export default function App() {
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [editingAlarm, setEditingAlarm] = useState<Alarm | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  const { activeAlarm, alarmState, stopAlarm, snoozeAlarm, startAlarm } = useAlarmManager(alarms);

  useEffect(() => {
    const saved = localStorage.getItem('gentle-alarms');
    if (saved) {
      setAlarms(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    if (alarms.length > 0) {
      localStorage.setItem('gentle-alarms', JSON.stringify(alarms));
    }
  }, [alarms]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let wakeLock: any = null;
    
    const requestWakeLock = async () => {
      if ('wakeLock' in navigator && permissionsGranted && document.visibilityState === 'visible') {
        try {
          wakeLock = await (navigator as any).wakeLock.request('screen');
        } catch (err) {
          console.log(err);
        }
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        requestWakeLock();
      }
    };

    if (permissionsGranted) {
      document.addEventListener('visibilitychange', handleVisibilityChange);
      requestWakeLock();
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLock) {
        wakeLock.release().catch(() => {});
      }
    };
  }, [permissionsGranted]);

  const saveAlarm = (alarm: Alarm) => {
    if (editingAlarm) {
      setAlarms(alarms.map(a => a.id === alarm.id ? alarm : a));
      setEditingAlarm(null);
    } else {
      setAlarms([...alarms, alarm]);
      setShowAdd(false);
    }
  };

  const deleteAlarm = (id: string) => {
    setAlarms(alarms.filter(a => a.id !== id));
    setEditingAlarm(null);
  };

  const toggleAlarm = (id: string) => {
    setAlarms(alarms.map(a => a.id === id ? { ...a, enabled: !a.enabled } : a));
  };

  const handleSnooze = () => {
    const res = snoozeAlarm();
    if (res) {
      setAlarms(alarms.map(a => a.id === res.snoozedAlarmId ? { ...a, time: res.snoozedTime, enabled: true } : a));
    }
  };

  const requestPermissions = async () => {
    // Audio context requires user interaction to start
    const ctx = initAudioContext();
    await ctx.resume();
    // Vibration permission isn't explicitly promptable, calling it works.
    navigator.vibrate(100);
    setPermissionsGranted(true);
  };

  if (!permissionsGranted) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-[#E5E5E5] flex flex-col items-center justify-center p-6 text-center font-sans">
        <Moon className="w-16 h-16 text-amber-500 mb-6" />
        <h1 className="text-4xl font-light tracking-tight italic font-serif mb-4">Gentle Wake</h1>
        <p className="text-white/60 mb-8 max-w-sm uppercase tracking-widest text-[10px] leading-relaxed">
          Please grant permission to use vibration and audio to ensure your alarms work correctly. 
          Place your phone under your pillow after setting an alarm.
        </p>
        <button 
          onClick={requestPermissions}
          className="bg-transparent border border-white/20 hover:bg-white hover:text-black text-[#E5E5E5] px-12 py-4 rounded-full text-xs uppercase tracking-widest transition-colors w-full max-w-xs"
        >
          Enable & Start
        </button>
        <p className="text-white/20 mt-8 max-w-xs uppercase tracking-widest text-[8px] leading-relaxed">
          Note: iOS devices do not support web vibration. The alarm will still play audio.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#E5E5E5] font-sans overflow-hidden relative selection:bg-amber-500/30">
      {/* Main View */}
      <div className="p-6 pb-24 h-screen overflow-y-auto">
        <div className="flex justify-between items-end border-b border-white/10 pb-6 mb-8">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-[0.2em] text-amber-500 font-bold mb-1">Gentle Wake v1.0</span>
            <h1 className="text-4xl font-light tracking-tight italic font-serif">Alarms</h1>
          </div>
          <button 
            onClick={() => setShowAdd(true)}
            className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center hover:bg-white/10 border border-white/10 transition-colors"
          >
            <Plus className="w-6 h-6 text-amber-500" />
          </button>
        </div>

        {alarms.length === 0 ? (
          <div className="text-center mt-24 text-white/40">
            <Bell className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p className="text-xs uppercase tracking-widest">No alarms set</p>
          </div>
        ) : (
          <div className="space-y-4">
            {alarms.map(alarm => (
              <div 
                key={alarm.id} 
                className="bg-white/5 rounded-2xl p-6 flex items-center justify-between cursor-pointer border border-white/10 hover:bg-white/10 transition-colors"
                onClick={() => setEditingAlarm(alarm)}
              >
                <div>
                  <div className={`text-5xl font-thin tracking-tighter mb-2 ${alarm.enabled ? 'text-white' : 'text-white/40'}`}>
                    {alarm.time}
                  </div>
                  <div className="text-white/60 text-sm flex items-center gap-2 italic font-serif">
                    <Settings className="w-3 h-3" />
                    <span>{RINGTONES.find(r => r.id === alarm.ringtone)?.name}</span>
                  </div>
                </div>
                
                <div onClick={(e) => e.stopPropagation()}>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={alarm.enabled}
                      onChange={() => toggleAlarm(alarm.id)}
                    />
                    <div className="w-14 h-8 bg-white/10 border border-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[3px] after:left-[4px] after:bg-white/60 peer-checked:after:bg-black after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-amber-500"></div>
                  </label>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Editor Overlay */}
      {(showAdd || editingAlarm) && (
        <AlarmEditor 
          alarm={editingAlarm} 
          onSave={saveAlarm} 
          onClose={() => { setShowAdd(false); setEditingAlarm(null); }} 
          onDelete={editingAlarm ? () => deleteAlarm(editingAlarm.id) : undefined}
        />
      )}

      {/* Active Alarm Overlay */}
      {activeAlarm && (
        <ActiveAlarmView 
          alarm={activeAlarm} 
          state={alarmState} 
          currentTime={currentTime}
          onStop={stopAlarm} 
          onSnooze={handleSnooze} 
        />
      )}
    </div>
  );
}

function AlarmEditor({ alarm, onSave, onClose, onDelete }: { alarm: Alarm | null, onSave: (a: Alarm) => void, onClose: () => void, onDelete?: () => void }) {
  const [formData, setFormData] = useState<Alarm>(alarm || {
    id: Date.now().toString(),
    ...DEFAULT_ALARM
  });

  const [testActive, setTestActive] = useState(false);
  const stopAudioRef = useRef<(() => void) | null>(null);
  const vibrationSupported = 'vibrate' in navigator;

  useEffect(() => {
    return () => {
      if (stopAudioRef.current) {
        stopAudioRef.current();
      }
    };
  }, []);

  const playPreview = (ringtoneId: string, duration = 2000) => {
    if (stopAudioRef.current) {
      stopAudioRef.current();
      stopAudioRef.current = null;
    }
    const ctx = initAudioContext();
    const rt = RINGTONES.find(r => r.id === ringtoneId);
    if (rt) {
      stopAudioRef.current = rt.play(ctx);
      setTimeout(() => {
        if (stopAudioRef.current) {
          stopAudioRef.current();
          stopAudioRef.current = null;
        }
      }, duration);
    }
  };

  return (
    <motion.div 
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed inset-0 bg-[#0A0A0A] z-40 overflow-y-auto"
    >
      <div className="p-6 max-w-md mx-auto">
        <div className="flex justify-between items-center border-b border-white/10 pb-6 mb-8 mt-2">
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors p-2 -ml-2">
            <X className="w-6 h-6" />
          </button>
          <h2 className="text-2xl font-light italic font-serif">{alarm ? 'Edit Profile' : 'New Profile'}</h2>
          <button onClick={() => onSave(formData)} className="text-[10px] uppercase tracking-widest text-amber-500 font-bold p-2 -mr-2 hover:text-amber-400">
            Save
          </button>
        </div>

        <div className="space-y-12">
          {/* Time Picker (Simple native for now) */}
          <div className="flex justify-center relative">
            <div className="absolute -left-4 top-4 w-1 h-16 bg-amber-500/20 hidden md:block"></div>
            <input 
              type="time" 
              value={formData.time}
              onChange={e => setFormData({ ...formData, time: e.target.value })}
              className="bg-transparent text-8xl font-thin tracking-tighter text-center outline-none [&::-webkit-calendar-picker-indicator]:hidden text-white"
            />
          </div>

          <div className="bg-white/5 rounded-2xl p-6 border border-white/10 flex flex-col gap-8">
            <div className="space-y-6">
              <div className="flex justify-between items-end mb-4">
                <h3 className="text-xs uppercase tracking-widest text-amber-500 font-bold">Vibration Gradient</h3>
                <span className="text-[10px] text-white/30 tracking-widest uppercase">Modal: Progressive</span>
              </div>
            
              <div>
                <div className="flex justify-between text-[11px] mb-2 uppercase text-white/60">
                  <span>Intensity Range</span>
                  <span>{formData.minVibration}% — {formData.maxVibration}%</span>
                </div>
                <div className="flex gap-4 items-center">
                  <input 
                    type="range" min="0" max="100" 
                    value={formData.minVibration} 
                    onChange={e => setFormData({ ...formData, minVibration: parseInt(e.target.value) })}
                    className="w-full accent-amber-500"
                  />
                  <input 
                    type="range" min="0" max="100" 
                    value={formData.maxVibration} 
                    onChange={e => setFormData({ ...formData, maxVibration: Math.max(formData.minVibration, parseInt(e.target.value)) })}
                    className="w-full accent-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                <div>
                  <label className="text-[10px] uppercase text-white/40 block mb-2 tracking-widest">Ramp Duration</label>
                  <input 
                    type="range" min="1" max="10" step="1"
                    value={formData.rampDurationMinutes} 
                    onChange={e => setFormData({ ...formData, rampDurationMinutes: parseInt(e.target.value) })}
                    className="w-full accent-amber-500 mb-2"
                  />
                  <div className="text-xl font-light">{formData.rampDurationMinutes}.0m</div>
                </div>
                <div>
                  <label className="text-[10px] uppercase text-white/40 block mb-2 tracking-widest">Peak Sustain</label>
                  <input 
                    type="range" min="0" max="60" step="5"
                    value={formData.pauseDurationSeconds} 
                    onChange={e => setFormData({ ...formData, pauseDurationSeconds: parseInt(e.target.value) })}
                    className="w-full accent-amber-500 mb-2"
                  />
                  <div className="text-xl font-light">{formData.pauseDurationSeconds}.0s</div>
                </div>
              </div>
              
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => {
                    if (testActive) {
                      navigator.vibrate(0);
                      setTestActive(false);
                    } else {
                      if (vibrationSupported) {
                        navigator.vibrate([200, 100, 300, 100, 500, 150, 800]); 
                      }
                      setTestActive(true);
                      setTimeout(() => { 
                        if (vibrationSupported) navigator.vibrate(0); 
                        setTestActive(false); 
                      }, 3000);
                    }
                  }}
                  className={`w-full py-3 rounded-full text-xs uppercase tracking-widest font-bold flex justify-center items-center gap-2 transition-all duration-75 ${testActive ? 'bg-amber-500 text-black translate-x-[1px] translate-y-[1px]' : 'bg-transparent border border-white/20 text-[#E5E5E5] hover:bg-white hover:text-black'}`}
                >
                  {testActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  {testActive ? 'Vibrating...' : 'Test Signature'}
                </button>
                <div className="text-[9px] text-white/40 text-center uppercase tracking-widest leading-relaxed">
                  {!vibrationSupported ? (
                    <span className="text-red-400">Web Haptics not supported on this browser.</span>
                  ) : (
                    <span>Note: Web haptics only work on Android. Apple blocks vibration on all iOS browsers.</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white/5 rounded-2xl p-6 border border-white/10 flex flex-col gap-6">
            <h3 className="text-xs uppercase tracking-widest text-amber-500 font-bold">Tone Signature</h3>
            
            <div className="grid grid-cols-1 gap-2">
              {RINGTONES.map((rt) => (
                <div 
                  key={rt.id}
                  onClick={() => {
                    setFormData({ ...formData, ringtone: rt.id });
                    playPreview(rt.id, 2000);
                  }}
                  className={`p-4 rounded flex justify-between items-center cursor-pointer border ${formData.ringtone === rt.id ? 'bg-white/10 border-amber-500/50' : 'bg-white/5 border-transparent'} transition-colors`}
                >
                  <span className="text-sm italic font-serif">{rt.name}</span>
                  {formData.ringtone === rt.id && <span className="text-[10px] bg-amber-500 text-black px-2 py-0.5 font-bold uppercase tracking-widest">Active</span>}
                </div>
              ))}
            </div>
          </div>

          {onDelete && (
            <button 
              onClick={onDelete}
              className="w-full py-4 text-xs uppercase tracking-widest font-bold text-[#E5E5E5] bg-red-900/20 border border-red-900/50 rounded-full hover:bg-red-900/40 transition-colors mb-8"
            >
              Terminate Alarm
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function ActiveAlarmView({ alarm, state, currentTime, onStop, onSnooze }: { alarm: Alarm, state: string, currentTime: Date, onStop: () => void, onSnooze: () => void }) {
  const x = useMotionValue(0);
  const opacity = useTransform(x, [0, 150], [1, 0]);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const timeStr = `${currentTime.getHours().toString().padStart(2, '0')}:${currentTime.getMinutes().toString().padStart(2, '0')}`;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 bg-[#0A0A0A] flex flex-col items-center justify-between py-24 px-8 text-[#E5E5E5]"
    >
      <div className="w-full text-center mt-12 relative flex flex-col items-center">
        <div className="absolute -left-4 top-0 w-1 h-32 bg-amber-500/20 hidden md:block"></div>
        <motion.div 
          animate={state === 'ramping' || state === 'hold' ? { x: [-2, 2, -2, 2, 0], y: [-1, 1, -1, 1, 0] } : { scale: [1, 1.02, 1] }}
          transition={state === 'ramping' || state === 'hold' ? { repeat: Infinity, duration: 0.2, ease: "linear" } : { repeat: Infinity, duration: 2, ease: "easeInOut" }}
          className={`text-[120px] leading-none font-thin tracking-tighter text-white select-none mb-6 ${state === 'ramping' || state === 'hold' ? 'text-amber-500' : ''}`}
        >
          {timeStr}
        </motion.div>
        <p className="text-lg text-white/40 tracking-wide italic font-serif">
          Profile Status: {state === 'ramping' ? 'Progressive Haptics' : state === 'hold' ? 'Peak Sustain' : 'Tone Signature Active'}
        </p>
      </div>

      <div className="w-full max-w-sm flex flex-col items-center gap-12">
        <div ref={containerRef} className="relative w-full h-24 bg-white/5 rounded-full border border-white/10 flex items-center px-4 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 to-transparent w-1/2 pointer-events-none"></div>
          <motion.div 
            className="z-10 w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-2xl cursor-grab active:cursor-grabbing shrink-0"
            drag="x"
            dragConstraints={containerRef}
            dragElastic={0.1}
            style={{ x }}
            onDragEnd={(e, info) => {
              if (info.offset.x > 150) {
                onStop();
              }
            }}
          >
            <ChevronRight className="w-8 h-8 text-black" />
          </motion.div>
          <motion.div 
            style={{ opacity }}
            className="absolute inset-0 flex items-center justify-center text-sm uppercase tracking-[0.3em] font-medium text-white/40 animate-pulse pointer-events-none pl-16"
          >
            Slide to Terminate
          </motion.div>
        </div>

        <button 
          onClick={onSnooze}
          className="px-12 py-3 bg-transparent border border-white/20 rounded-full text-xs uppercase tracking-widest hover:bg-white hover:text-black transition-colors"
        >
          Snooze (5:00)
        </button>
      </div>
    </motion.div>
  );
}

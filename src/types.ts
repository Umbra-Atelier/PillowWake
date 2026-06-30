export interface Alarm {
  id: string;
  time: string; // 'HH:mm'
  enabled: boolean;
  minVibration: number; // 0 to 100
  maxVibration: number; // 0 to 100
  rampDurationMinutes: number; // minutes
  pauseDurationSeconds: number; // seconds
  ringtone: string; // id of ringtone
}

export interface Ringtone {
  id: string;
  name: string;
  play: (audioCtx: AudioContext) => () => void; // returns a stop function
}

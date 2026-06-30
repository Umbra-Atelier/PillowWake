import { Ringtone } from './types';

// Simple tone generator
const playTone = (audioCtx: AudioContext, frequency: number, type: OscillatorType, startTime: number, duration: number) => {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  
  osc.type = type;
  osc.frequency.value = frequency;
  
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  
  // Envelope
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(1, startTime + 0.05);
  gain.gain.setValueAtTime(1, startTime + duration - 0.05);
  gain.gain.linearRampToValueAtTime(0, startTime + duration);
  
  osc.start(startTime);
  osc.stop(startTime + duration);
  
  return { osc, gain };
};

export const RINGTONES: Ringtone[] = [
  {
    id: 'beep',
    name: 'Classic Beep',
    play: (audioCtx) => {
      let active = true;
      let nextStartTime = audioCtx.currentTime;
      
      const scheduleNext = () => {
        if (!active) return;
        
        // 4 beeps
        for (let i = 0; i < 4; i++) {
          playTone(audioCtx, 880, 'square', nextStartTime + i * 0.2, 0.1);
        }
        
        nextStartTime += 1.5; // Next pattern in 1.5 seconds
        
        setTimeout(scheduleNext, (nextStartTime - audioCtx.currentTime - 0.5) * 1000);
      };
      
      scheduleNext();
      
      return () => {
        active = false;
      };
    }
  },
  {
    id: 'chimes',
    name: 'Gentle Chimes',
    play: (audioCtx) => {
      let active = true;
      let nextStartTime = audioCtx.currentTime;
      
      const scheduleNext = () => {
        if (!active) return;
        
        // C E G
        playTone(audioCtx, 523.25, 'sine', nextStartTime, 0.5);
        playTone(audioCtx, 659.25, 'sine', nextStartTime + 0.3, 0.5);
        playTone(audioCtx, 783.99, 'sine', nextStartTime + 0.6, 1.0);
        
        nextStartTime += 3.0; 
        
        setTimeout(scheduleNext, (nextStartTime - audioCtx.currentTime - 0.5) * 1000);
      };
      
      scheduleNext();
      
      return () => {
        active = false;
      };
    }
  },
  {
    id: 'reveille',
    name: 'Wake Up Call',
    play: (audioCtx) => {
       let active = true;
      let nextStartTime = audioCtx.currentTime;
      
      const scheduleNext = () => {
        if (!active) return;
        
        // Simple bugle-like pattern
        playTone(audioCtx, 392.00, 'triangle', nextStartTime, 0.2); // G4
        playTone(audioCtx, 523.25, 'triangle', nextStartTime + 0.3, 0.2); // C5
        playTone(audioCtx, 659.25, 'triangle', nextStartTime + 0.6, 0.2); // E5
        playTone(audioCtx, 523.25, 'triangle', nextStartTime + 0.9, 0.4); // C5
        
        nextStartTime += 2.0; 
        
        setTimeout(scheduleNext, (nextStartTime - audioCtx.currentTime - 0.5) * 1000);
      };
      
      scheduleNext();
      
      return () => {
        active = false;
      };
    }
  }
];

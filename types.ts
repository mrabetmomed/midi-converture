export interface MidiNote {
  pitch: number;    // MIDI note number (0-127)
  velocity: number; // 0-127
  startTime: number; // In seconds (for playback) or ticks (for file)
  duration: number;  // In seconds
}

export interface ProcessingOptions {
  threshold: number; // Brightness threshold (0-255)
  timeScale: number; // Duration per pixel in seconds
  pitchMin: number;  // Lowest MIDI note
  pitchMax: number;  // Highest MIDI note
}

export enum PlayerState {
  STOPPED = 'STOPPED',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED'
}
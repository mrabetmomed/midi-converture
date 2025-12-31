import { MidiNote } from '../types';

// Helper to write variable-length quantity
function writeVarInt(value: number): number[] {
  if (value === 0) return [0];
  const bytes = [];
  let v = value;
  while (v > 0) {
    bytes.unshift(v & 0x7F);
    v >>= 7;
  }
  for (let i = 0; i < bytes.length - 1; i++) {
    bytes[i] |= 0x80;
  }
  return bytes;
}

// Helper to write string as bytes
function writeString(str: string): number[] {
  return str.split('').map(c => c.charCodeAt(0));
}

// Helper to write 32-bit int
function writeUInt32(value: number): number[] {
  return [
    (value >> 24) & 0xFF,
    (value >> 16) & 0xFF,
    (value >> 8) & 0xFF,
    value & 0xFF
  ];
}

// Helper to write 16-bit int
function writeUInt16(value: number): number[] {
  return [
    (value >> 8) & 0xFF,
    value & 0xFF
  ];
}

export const generateMidiFile = (notes: MidiNote[], bpm: number = 120): Uint8Array => {
  const TICKS_PER_BEAT = 480; // Standard resolution
  const SECONDS_PER_MINUTE = 60;
  // Calculate ticks per second: (Ticks/Beat * Beats/Minute) / 60
  const ticksPerSecond = (TICKS_PER_BEAT * bpm) / SECONDS_PER_MINUTE;

  // Convert notes to MIDI events (Note On / Note Off)
  interface MidiEvent {
    tick: number;
    type: 'on' | 'off';
    pitch: number;
    velocity: number;
  }

  const events: MidiEvent[] = [];

  notes.forEach(note => {
    const startTick = Math.floor(note.startTime * ticksPerSecond);
    const endTick = Math.floor((note.startTime + note.duration) * ticksPerSecond);

    events.push({
      tick: startTick,
      type: 'on',
      pitch: Math.floor(note.pitch),
      velocity: Math.floor(note.velocity)
    });

    events.push({
      tick: endTick,
      type: 'off',
      pitch: Math.floor(note.pitch),
      velocity: 0
    });
  });

  // Sort events by time
  events.sort((a, b) => a.tick - b.tick);

  // Build Track Data
  const trackBytes: number[] = [];
  let lastTick = 0;

  events.forEach(event => {
    const delta = event.tick - lastTick;
    lastTick = event.tick;

    trackBytes.push(...writeVarInt(delta));

    if (event.type === 'on') {
      trackBytes.push(0x90); // Note On channel 0
      trackBytes.push(event.pitch);
      trackBytes.push(event.velocity);
    } else {
      trackBytes.push(0x80); // Note Off channel 0
      trackBytes.push(event.pitch);
      trackBytes.push(0); // Velocity 0
    }
  });

  // End of Track event
  trackBytes.push(0x00, 0xFF, 0x2F, 0x00);

  // Build Full MIDI File
  const header: number[] = [
    ...writeString('MThd'),
    ...writeUInt32(6),    // Header length
    ...writeUInt16(0),    // Format 0 (single track)
    ...writeUInt16(1),    // Number of tracks
    ...writeUInt16(TICKS_PER_BEAT)
  ];

  const trackHeader: number[] = [
    ...writeString('MTrk'),
    ...writeUInt32(trackBytes.length)
  ];

  const fileData = [...header, ...trackHeader, ...trackBytes];
  return new Uint8Array(fileData);
};
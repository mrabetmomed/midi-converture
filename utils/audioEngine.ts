import { MidiNote, PlayerState } from '../types';

class AudioEngine {
  private ctx: AudioContext | null = null;
  private activeOscillators: Map<number, { osc: OscillatorNode, gain: GainNode }> = new Map();
  private isRunning: boolean = false;
  private scheduledEvents: ReturnType<typeof setTimeout>[] = [];

  private getContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return this.ctx;
  }

  // Convert MIDI note number to frequency
  private midiToFreq(note: number): number {
    return 440 * Math.pow(2, (note - 69) / 12);
  }

  public async play(notes: MidiNote[], onComplete: () => void) {
    this.stop(); // Clear previous
    const ctx = this.getContext();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    this.isRunning = true;
    const now = ctx.currentTime;
    
    // Find the end time to trigger onComplete
    let maxTime = 0;

    // Schedule all notes
    // Note: For very long sequences, this should be done in chunks (lookahead),
    // but for this scope, scheduling all at once is acceptable for reasonably sized images.
    notes.forEach(note => {
      const startTime = now + note.startTime;
      const endTime = startTime + note.duration;
      
      if (endTime > maxTime) maxTime = endTime;

      // Schedule Note On
      const startTimeout = setTimeout(() => {
        if (!this.isRunning) return;
        this.playNote(note.pitch, note.velocity, note.duration);
      }, note.startTime * 1000);

      this.scheduledEvents.push(startTimeout);
    });

    // Schedule cleanup
    const endTimeout = setTimeout(() => {
      if (this.isRunning) {
        onComplete();
        this.isRunning = false;
      }
    }, maxTime * 1000 + 100); // Small buffer
    
    this.scheduledEvents.push(endTimeout);
  }

  private playNote(pitch: number, velocity: number, duration: number) {
    if (!this.ctx) return;
    
    const freq = this.midiToFreq(pitch);
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    // Simple synth sound: Sawtooth with envelope
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

    // Velocity to Gain (0-127 -> 0.0 - 0.3 to avoid clipping with polyphony)
    const volume = (velocity / 127) * 0.15; 

    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(volume, this.ctx.currentTime + 0.01); // Attack
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration); // Decay

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(this.ctx.currentTime);
    osc.stop(this.ctx.currentTime + duration);
    
    // Store for explicit stop if needed (though we rely on scheduled stop mostly)
    // Using a random ID or just fire-and-forget for this simple engine
  }

  public stop() {
    this.isRunning = false;
    // Cancel all JS timeouts
    this.scheduledEvents.forEach(id => clearTimeout(id));
    this.scheduledEvents = [];
    
    // In a more complex engine we would iterate active nodes and stop them,
    // but since we schedule audio nodes to stop automatically, we mainly need to stop scheduling new ones.
    // If we wanted instant silence, we'd track all active nodes.
    if (this.ctx) {
        // Quick way to silence: suspend context or disconnect destination
        // Re-creating context is safer for a clean slate in simple apps
        this.ctx.suspend();
        this.ctx = null;
    }
  }
}

export const audioEngine = new AudioEngine();
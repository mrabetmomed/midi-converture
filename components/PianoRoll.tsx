import React, { useEffect, useRef } from 'react';
import { MidiNote } from '../types';

interface PianoRollProps {
  notes: MidiNote[];
  width: number;
  height: number;
  currentTime: number;
  totalDuration: number;
}

const PianoRoll: React.FC<PianoRollProps> = ({ notes, width, height, currentTime, totalDuration }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.fillStyle = '#1e293b'; // Slate-800
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Dimensions
    // We map the normalized Note data back to canvas coordinates
    // Time X -> Canvas Width
    // Pitch Y -> Canvas Height
    
    // Scale factors
    // If totalDuration is 0 (empty), avoid div/0
    const timeToX = totalDuration > 0 ? canvas.width / totalDuration : 0;
    const pitchHeight = canvas.height / 128; // 128 MIDI notes

    // Draw Grid (Optional, simple horizontal lines for octaves)
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    for(let i=0; i<128; i+=12) {
       const y = canvas.height - (i * pitchHeight);
       ctx.beginPath();
       ctx.moveTo(0, y);
       ctx.lineTo(canvas.width, y);
       ctx.stroke();
    }

    // Draw Notes
    notes.forEach(note => {
      const x = note.startTime * timeToX;
      const w = Math.max(1, note.duration * timeToX);
      // Invert pitch for Y: High pitch is low Y value
      const y = canvas.height - ((note.pitch + 1) * pitchHeight);
      const h = pitchHeight;

      // Color based on velocity
      const alpha = note.velocity / 127;
      ctx.fillStyle = `rgba(56, 189, 248, ${0.5 + alpha * 0.5})`; // Sky-400 base
      
      ctx.fillRect(x, y, w, h);
    });

    // Draw Playhead
    if (totalDuration > 0) {
        const playheadX = currentTime * timeToX;
        ctx.strokeStyle = '#ef4444'; // Red-500
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(playheadX, 0);
        ctx.lineTo(playheadX, canvas.height);
        ctx.stroke();
    }

  }, [notes, width, height, currentTime, totalDuration]);

  return (
    <div className="w-full h-64 bg-slate-800 rounded-lg overflow-hidden border border-slate-700 shadow-inner relative">
       <canvas 
         ref={canvasRef}
         width={800} // Internal resolution
         height={400} 
         className="w-full h-full object-cover"
       />
    </div>
  );
};

export default PianoRoll;
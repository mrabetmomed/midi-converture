import { MidiNote, ProcessingOptions } from '../types';

export const processImage = async (
  imageSrc: string,
  options: ProcessingOptions
): Promise<{ notes: MidiNote[], width: number, height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }

      // Resize logic: Fixed height helps map to MIDI pitches consistently
      // 128 pixels high = 1 pixel per MIDI note
      const targetHeight = 128; 
      const scaleFactor = targetHeight / img.height;
      const targetWidth = Math.floor(img.width * scaleFactor);

      canvas.width = targetWidth;
      canvas.height = targetHeight;

      // Draw image
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

      const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
      const data = imageData.data;
      const notes: MidiNote[] = [];

      // Scan columns (Time)
      for (let x = 0; x < targetWidth; x++) {
        // Scan rows (Pitch)
        // Y=0 is top (High pitch usually? Or Low? Standard piano roll: Bottom is low)
        // Let's map Y=Height (bottom) to pitch 0, Y=0 (top) to pitch 127
        for (let y = 0; y < targetHeight; y++) {
          const index = (y * targetWidth + x) * 4;
          const r = data[index];
          const g = data[index + 1];
          const b = data[index + 2];
          // const a = data[index + 3];

          // Calculate brightness (grayscale)
          const brightness = 0.299 * r + 0.587 * g + 0.114 * b;

          if (brightness > options.threshold) {
            // Map Y to Pitch
            // Invert Y: Bottom (127) is Low Pitch (0), Top (0) is High Pitch (127)
            const pitch = Math.floor(127 - (y / targetHeight) * 127);
            
            // Constrain pitch if needed
            if (pitch >= options.pitchMin && pitch <= options.pitchMax) {
              
              // Velocity based on brightness
              const velocity = Math.floor((brightness / 255) * 127);

              // Check if we can extend the previous note (legato/duration)
              // This is a simplified "pixel = 1 unit" approach.
              // A real robust system would coalesce adjacent horizontal pixels.
              
              // Simple coalescing: Check if there is an active note at this pitch ending at this x time
              const prevNote = notes.find(n => 
                n.pitch === pitch && 
                Math.abs((n.startTime + n.duration) - (x * options.timeScale)) < 0.001
              );

              if (prevNote) {
                // Extend duration
                prevNote.duration += options.timeScale;
                // Average velocity? Or keep initial? Let's keep initial attack.
              } else {
                // New Note
                notes.push({
                  pitch,
                  velocity,
                  startTime: x * options.timeScale,
                  duration: options.timeScale
                });
              }
            }
          }
        }
      }

      resolve({ notes, width: targetWidth, height: targetHeight });
    };
    img.onerror = (e) => reject(e);
    img.src = imageSrc;
  });
};
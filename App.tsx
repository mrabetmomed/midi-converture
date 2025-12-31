import React, { useState, useRef, useEffect } from 'react';
import { Upload, Play, Square, Download, Music, Settings, Info } from 'lucide-react';
import { MidiNote, ProcessingOptions, PlayerState } from './types';
import { processImage } from './utils/imageProcessor';
import { generateMidiFile } from './utils/midiEncoder';
import { audioEngine } from './utils/audioEngine';
import PianoRoll from './components/PianoRoll';

const DEFAULT_OPTIONS: ProcessingOptions = {
  threshold: 100,
  timeScale: 0.1, // 100ms per pixel column
  pitchMin: 21,   // A0 (Piano bottom)
  pitchMax: 108   // C8 (Piano top)
};

const App: React.FC = () => {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [notes, setNotes] = useState<MidiNote[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [playerState, setPlayerState] = useState<PlayerState>(PlayerState.STOPPED);
  const [currentTime, setCurrentTime] = useState(0);
  const [options, setOptions] = useState<ProcessingOptions>(DEFAULT_OPTIONS);
  
  // Stats
  const [imgDims, setImgDims] = useState({ w: 0, h: 0 });

  const playbackInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      const url = URL.createObjectURL(file);
      setImageSrc(url);
      
      // Stop any current playback
      stopPlayback();
      setNotes([]);
    }
  };

  useEffect(() => {
    if (imageSrc) {
      runProcessing();
    }
  }, [imageSrc]); // Auto-process on new image

  // Re-process when options change, but only if we have an image
  useEffect(() => {
      if(imageSrc && notes.length > 0) {
          // Debounce could be good here, but for now direct call
          // runProcessing(); 
          // Actually, let's make it manual via "Update" button if options change to avoid heavy recalc
      }
  }, [options]);

  const runProcessing = async () => {
    if (!imageSrc) return;
    setIsProcessing(true);
    try {
      const result = await processImage(imageSrc, options);
      setNotes(result.notes);
      setImgDims({ w: result.width, h: result.height });
    } catch (err) {
      console.error(err);
      alert("Error processing image");
    } finally {
      setIsProcessing(false);
    }
  };

  const togglePlayback = () => {
    if (playerState === PlayerState.PLAYING) {
      stopPlayback();
    } else {
      startPlayback();
    }
  };

  const startPlayback = async () => {
    if (notes.length === 0) return;
    
    setPlayerState(PlayerState.PLAYING);
    setCurrentTime(0);

    const startTime = Date.now();
    
    // UI Timer
    playbackInterval.current = setInterval(() => {
        const delta = (Date.now() - startTime) / 1000;
        setCurrentTime(delta);
    }, 50);

    // Audio Engine
    await audioEngine.play(notes, () => {
      stopPlayback();
    });
  };

  const stopPlayback = () => {
    audioEngine.stop();
    if (playbackInterval.current) {
        clearInterval(playbackInterval.current);
    }
    setPlayerState(PlayerState.STOPPED);
    setCurrentTime(0);
  };

  const downloadMidi = () => {
    if (notes.length === 0) return;
    const midiData = generateMidiFile(notes);
    const blob = new Blob([midiData], { type: 'audio/midi' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pixel_synth_output.mid';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const totalDuration = notes.length > 0 
    ? Math.max(...notes.map(n => n.startTime + n.duration)) 
    : 0;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 md:p-8 flex flex-col items-center">
      
      {/* Header */}
      <header className="mb-8 text-center max-w-2xl">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent mb-2">
          PixelSynth
        </h1>
        <p className="text-slate-400">
          Turn your images into MIDI melodies. Upload a PNG and hear the pixels.
        </p>
      </header>

      {/* Main Container */}
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Col: Upload & Preview */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Upload className="w-5 h-5 text-cyan-400" /> Source Image
            </h2>
            
            <div className="relative group w-full aspect-square bg-slate-900 rounded-xl border-2 border-dashed border-slate-600 flex flex-col items-center justify-center overflow-hidden transition-colors hover:border-cyan-400">
              {imageSrc ? (
                <img src={imageSrc} alt="Source" className="w-full h-full object-contain" />
              ) : (
                <div className="text-center p-4">
                  <p className="text-slate-500 mb-2">Drag & Drop PNG</p>
                  <span className="text-xs text-slate-600">or click to browse</span>
                </div>
              )}
              <input 
                type="file" 
                accept="image/png, image/jpeg" 
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </div>

            {imageSrc && (
                <div className="mt-4 flex flex-col gap-2">
                    <div className="flex justify-between text-xs text-slate-400">
                        <span>Original Size</span>
                        <span>{imageFile?.size ? (imageFile.size / 1024).toFixed(1) : 0} KB</span>
                    </div>
                     <div className="flex justify-between text-xs text-slate-400">
                        <span>Processed Grid</span>
                        <span>{imgDims.w} x {imgDims.h} px</span>
                    </div>
                </div>
            )}
          </div>

          <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl">
             <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Settings className="w-5 h-5 text-cyan-400" /> Settings
            </h2>
            <div className="space-y-4">
                <div>
                    <label className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1 block">Brightness Threshold</label>
                    <input 
                        type="range" min="0" max="255" 
                        value={options.threshold}
                        onChange={(e) => setOptions({...options, threshold: parseInt(e.target.value)})}
                        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                    />
                    <div className="flex justify-between text-xs text-slate-500 mt-1">
                        <span>All pixels</span>
                        <span>{options.threshold}</span>
                        <span>Bright only</span>
                    </div>
                </div>
                <div>
                    <label className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1 block">Time Scale (Speed)</label>
                     <input 
                        type="range" min="0.05" max="0.5" step="0.01"
                        value={options.timeScale}
                        onChange={(e) => setOptions({...options, timeScale: parseFloat(e.target.value)})}
                        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                    />
                    <div className="text-right text-xs text-slate-500 mt-1">
                        {options.timeScale}s per pixel
                    </div>
                </div>
                <button 
                    onClick={runProcessing}
                    className="w-full py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-medium transition-colors border border-slate-600"
                >
                    Reprocess Image
                </button>
            </div>
          </div>
        </div>

        {/* Right Col: Visualization & Playback */}
        <div className="lg:col-span-2 space-y-6">
             <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl h-full flex flex-col">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                        <Music className="w-5 h-5 text-cyan-400" /> Midi Visualization
                    </h2>
                     <div className="text-sm text-slate-400 font-mono">
                        {notes.length} notes generated
                    </div>
                </div>

                <div className="flex-grow mb-6">
                    {notes.length > 0 ? (
                        <PianoRoll 
                            notes={notes} 
                            width={imgDims.w} 
                            height={imgDims.h}
                            currentTime={currentTime}
                            totalDuration={totalDuration}
                        />
                    ) : (
                        <div className="w-full h-64 bg-slate-900 rounded-lg border border-slate-700 flex items-center justify-center text-slate-600">
                             {isProcessing ? 'Processing...' : 'No note data available'}
                        </div>
                    )}
                </div>

                <div className="flex gap-4 items-center bg-slate-900 p-4 rounded-xl border border-slate-700">
                    <button 
                        onClick={togglePlayback}
                        disabled={notes.length === 0}
                        className={`p-4 rounded-full transition-all transform active:scale-95 ${
                            notes.length === 0 ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 
                            playerState === PlayerState.PLAYING 
                                ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/30' 
                                : 'bg-cyan-500 hover:bg-cyan-600 text-white shadow-lg shadow-cyan-500/30'
                        }`}
                    >
                        {playerState === PlayerState.PLAYING ? <Square className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current pl-1" />}
                    </button>
                    
                    <div className="flex-grow">
                        <div className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Playback Progress</div>
                        <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                             <div 
                                className="bg-cyan-500 h-full transition-all duration-100 ease-linear"
                                style={{ width: `${totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0}%`}}
                             />
                        </div>
                        <div className="flex justify-between text-xs text-slate-500 mt-1 font-mono">
                            <span>{currentTime.toFixed(1)}s</span>
                            <span>{totalDuration.toFixed(1)}s</span>
                        </div>
                    </div>

                    <div className="h-10 w-px bg-slate-700 mx-2"></div>

                    <button 
                        onClick={downloadMidi}
                        disabled={notes.length === 0}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                            notes.length === 0 
                            ? 'bg-slate-800 text-slate-600 cursor-not-allowed' 
                            : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                        }`}
                    >
                        <Download className="w-4 h-4" />
                        <span>Export MIDI</span>
                    </button>
                </div>
             </div>
             
             {/* Info Box */}
             <div className="bg-blue-900/20 border border-blue-500/30 p-4 rounded-xl flex gap-3 items-start">
                <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                <div className="text-sm text-blue-200">
                    <p className="font-semibold mb-1">How it works</p>
                    <p className="opacity-80">
                        The app scans the image from left to right. The vertical position of pixels determines the pitch (Top=High, Bottom=Low). Brightness determines the velocity (loudness).
                    </p>
                </div>
             </div>
        </div>

      </div>
    </div>
  );
};

export default App;
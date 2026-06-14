'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface AudioTabProps {
  numCannons: number;
  gridColumns: number;
  send: (msg: Record<string, unknown>) => void;
}

interface AudioState {
  playing: boolean;
  fileName: string | null;
  duration: number;
  currentTime: number;
  bpm: number | null;
}

export function AudioTab({ numCannons, gridColumns, send }: AudioTabProps) {
  const [audioState, setAudioState] = useState<AudioState>({
    playing: false,
    fileName: null,
    duration: 0,
    currentTime: 0,
    bpm: null
  });
  const [dragOver, setDragOver] = useState(false);
  const [mode, setMode] = useState<'spectrum' | 'energy' | 'beat'>('spectrum');
  const [sensitivity, setSensitivity] = useState(70);

  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const animFrameRef = useRef<number>(0);
  const startTimeRef = useRef(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const stopPlayback = useCallback(() => {
    if (sourceRef.current) {
      try { sourceRef.current.stop(); } catch { /* already stopped */ }
      sourceRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = 0;
    }
    setAudioState((s) => ({ ...s, playing: false, currentTime: 0 }));
  }, []);

  const processAudioFrame = useCallback(() => {
    if (!analyserRef.current) return;

    const analyser = analyserRef.current;
    const bufLen = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufLen);
    analyser.getByteFrequencyData(dataArray);

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const w = canvas.width;
        const h = canvas.height;
        ctx.fillStyle = '#0a0a0f';
        ctx.fillRect(0, 0, w, h);

        const barWidth = w / bufLen * 2.5;
        let x = 0;
        for (let i = 0; i < bufLen; i++) {
          const v = dataArray[i] / 255;
          const barH = v * h;
          const hue = (i / bufLen) * 300;
          ctx.fillStyle = `hsl(${hue}, 80%, ${30 + v * 40}%)`;
          ctx.fillRect(x, h - barH, barWidth - 1, barH);
          x += barWidth;
          if (x > w) break;
        }
      }
    }

    const sens = sensitivity / 100;
    const rows = Math.ceil(numCannons / gridColumns);

    if (mode === 'spectrum') {
      for (let col = 0; col < gridColumns; col++) {
        const bandStart = Math.floor((col / gridColumns) * bufLen);
        const bandEnd = Math.floor(((col + 1) / gridColumns) * bufLen);
        let bandEnergy = 0;
        for (let i = bandStart; i < bandEnd; i++) {
          bandEnergy += dataArray[i];
        }
        bandEnergy = (bandEnergy / (bandEnd - bandStart)) / 255;

        const hue = (col / gridColumns) * 300;
        for (let row = 0; row < rows; row++) {
          const idx = row * gridColumns + col;
          if (idx >= numCannons) continue;
          const rowThreshold = 1 - (row + 1) / rows;
          const bright = bandEnergy * sens > rowThreshold ? 60 + bandEnergy * 40 : 5;
          send({ type: 'cannon', index: idx, h: hue, s: 85, b: bright });
        }
      }
    } else if (mode === 'energy') {
      let totalEnergy = 0;
      for (let i = 0; i < bufLen; i++) totalEnergy += dataArray[i];
      totalEnergy = (totalEnergy / bufLen) / 255;

      let lowEnergy = 0;
      const lowBins = Math.floor(bufLen * 0.15);
      for (let i = 0; i < lowBins; i++) lowEnergy += dataArray[i];
      lowEnergy = (lowEnergy / lowBins) / 255;

      const hue = lowEnergy * 240;
      const bright = 20 + totalEnergy * sens * 80;

      for (let i = 0; i < numCannons; i++) {
        send({ type: 'cannon', index: i, h: hue, s: 80, b: bright });
      }
    } else if (mode === 'beat') {
      let totalEnergy = 0;
      for (let i = 0; i < bufLen; i++) totalEnergy += dataArray[i];
      totalEnergy = totalEnergy / bufLen / 255;

      const threshold = 0.35 * sens;
      const isBeat = totalEnergy > threshold;

      for (let col = 0; col < gridColumns; col++) {
        const bandStart = Math.floor((col / gridColumns) * bufLen);
        const bandEnd = Math.floor(((col + 1) / gridColumns) * bufLen);
        let bandVal = 0;
        for (let i = bandStart; i < bandEnd; i++) bandVal += dataArray[i];
        bandVal = (bandVal / (bandEnd - bandStart)) / 255;

        for (let row = 0; row < rows; row++) {
          const idx = row * gridColumns + col;
          if (idx >= numCannons) continue;
          const hue = isBeat ? 0 + col * 30 : 220;
          const bright = isBeat ? 70 + bandVal * 30 : 10 + bandVal * 20;
          send({ type: 'cannon', index: idx, h: hue % 360, s: 90, b: bright });
        }
      }
    }

    if (audioContextRef.current) {
      setAudioState((s) => ({
        ...s,
        currentTime: audioContextRef.current!.currentTime - startTimeRef.current
      }));
    }

    animFrameRef.current = requestAnimationFrame(processAudioFrame);
  }, [mode, sensitivity, numCannons, gridColumns, send]);

  const startPlayback = useCallback(() => {
    if (!audioBufferRef.current || !audioContextRef.current) return;

    stopPlayback();

    const ctx = audioContextRef.current;
    const source = ctx.createBufferSource();
    source.buffer = audioBufferRef.current;

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    analyser.connect(ctx.destination);

    analyserRef.current = analyser;
    sourceRef.current = source;
    startTimeRef.current = ctx.currentTime;

    source.onended = () => {
      setAudioState((s) => ({ ...s, playing: false, currentTime: 0 }));
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = 0;
      }
    };

    source.start();
    setAudioState((s) => ({ ...s, playing: true, currentTime: 0 }));
    animFrameRef.current = requestAnimationFrame(processAudioFrame);
  }, [stopPlayback, processAudioFrame]);

  const detectBPM = useCallback((buffer: AudioBuffer): number | null => {
    const data = buffer.getChannelData(0);
    const sampleRate = buffer.sampleRate;
    const windowSize = Math.floor(sampleRate * 0.05);
    const energies: number[] = [];

    for (let i = 0; i < data.length - windowSize; i += windowSize) {
      let energy = 0;
      for (let j = 0; j < windowSize; j++) {
        energy += data[i + j] * data[i + j];
      }
      energies.push(energy / windowSize);
    }

    const peaks: number[] = [];
    const avgEnergy = energies.reduce((a, b) => a + b, 0) / energies.length;
    for (let i = 1; i < energies.length - 1; i++) {
      if (energies[i] > avgEnergy * 1.5 && energies[i] > energies[i - 1] && energies[i] > energies[i + 1]) {
        peaks.push(i);
      }
    }

    if (peaks.length < 4) return null;

    const intervals: number[] = [];
    for (let i = 1; i < peaks.length; i++) {
      intervals.push((peaks[i] - peaks[i - 1]) * 0.05);
    }

    intervals.sort((a, b) => a - b);
    const median = intervals[Math.floor(intervals.length / 2)];
    if (median <= 0) return null;

    const bpm = Math.round(60 / median);
    if (bpm < 60) return bpm * 2;
    if (bpm > 200) return Math.round(bpm / 2);
    return bpm;
  }, []);

  const loadFile = useCallback(async (file: File) => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }

    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
    audioBufferRef.current = audioBuffer;

    const bpm = detectBPM(audioBuffer);

    setAudioState({
      playing: false,
      fileName: file.name,
      duration: audioBuffer.duration,
      currentTime: 0,
      bpm
    });
  }, [detectBPM]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('audio/')) {
      loadFile(file);
    }
  }, [loadFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) loadFile(file);
  }, [loadFile]);

  useEffect(() => {
    return () => {
      stopPlayback();
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [stopPlayback]);

  const formatTime = (s: number) => {
    const min = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
          dragOver
            ? 'border-accent bg-accent/10 scale-[1.02]'
            : audioState.fileName
              ? 'border-success/50 bg-success/5'
              : 'border-border hover:border-text-2'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={handleFileInput}
        />
        {audioState.fileName ? (
          <div>
            <p className="text-sm font-medium">{audioState.fileName}</p>
            <p className="text-xs text-text-2 mt-1">
              {formatTime(audioState.duration)}
              {audioState.bpm && ` · ~${audioState.bpm} BPM`}
            </p>
          </div>
        ) : (
          <div>
            <p className="text-sm text-text-2">Drop audio file here</p>
            <p className="text-xs text-text-2/60 mt-1">MP3, WAV, OGG, FLAC</p>
          </div>
        )}
      </div>

      {/* Transport controls */}
      {audioState.fileName && (
        <div className="flex items-center gap-3">
          <button
            onClick={audioState.playing ? stopPlayback : startPlayback}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              audioState.playing
                ? 'bg-danger/20 text-danger border border-danger/40 hover:bg-danger/30'
                : 'bg-accent/20 text-accent border border-accent/40 hover:bg-accent/30'
            }`}
          >
            {audioState.playing ? '■ Stop' : '▶ Play'}
          </button>
          <span className="text-xs font-mono text-text-2">
            {formatTime(audioState.currentTime)} / {formatTime(audioState.duration)}
          </span>
          {audioState.bpm && (
            <span className="text-xs font-mono text-accent ml-auto">
              ~{audioState.bpm} BPM
            </span>
          )}
        </div>
      )}

      {/* Visualization canvas */}
      <canvas
        ref={canvasRef}
        width={400}
        height={100}
        className="w-full h-24 rounded-lg bg-bg"
      />

      {/* Mode selector */}
      <div className="flex gap-2">
        {(['spectrum', 'energy', 'beat'] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`px-3 py-1.5 rounded-full text-xs capitalize border transition-all ${
              mode === m
                ? 'border-accent text-white ring-1 ring-accent'
                : 'border-border text-text-2 hover:border-text-2'
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      {/* Sensitivity */}
      <div className="flex items-center gap-3">
        <label className="text-xs text-text-2 min-w-20">Sensitivity</label>
        <input
          type="range"
          className="flex-1"
          min={10}
          max={100}
          value={sensitivity}
          onChange={(e) => setSensitivity(Number(e.target.value))}
        />
        <span className="text-xs text-text-2 min-w-8 text-right font-mono">{sensitivity}%</span>
      </div>

      {/* Mode descriptions */}
      <p className="text-xs text-text-2/60">
        {mode === 'spectrum' && 'Frequency bands map to columns, amplitude controls brightness per row.'}
        {mode === 'energy' && 'Overall energy maps to brightness, bass frequencies shift the hue.'}
        {mode === 'beat' && 'Beat detection flashes the grid on transients with frequency-based coloring.'}
      </p>
    </div>
  );
}

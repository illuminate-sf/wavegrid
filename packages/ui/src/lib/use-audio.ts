'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type AudioMode = 'spectrum' | 'energy' | 'beat';
export type BlendMode = 'replace' | 'multiply' | 'additive';

export interface AudioEngineState {
  playing: boolean;
  fileName: string | null;
  duration: number;
  currentTime: number;
  bpm: number | null;
}

export interface AudioEngine {
  state: AudioEngineState;
  mode: AudioMode;
  blend: BlendMode;
  sensitivity: number;
  loop: boolean;
  setMode: (m: AudioMode) => void;
  setBlend: (b: BlendMode) => void;
  setSensitivity: (s: number) => void;
  setLoop: (v: boolean) => void;
  loadFile: (file: File) => Promise<void>;
  play: () => void;
  stop: () => void;
  seek: (time: number) => void;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}

export function useAudio(
  numCannons: number,
  gridColumns: number,
  setZone: (zone: number, r: number, g: number, b: number) => Promise<void>
): AudioEngine {
  const [audioState, setAudioState] = useState<AudioEngineState>({
    playing: false,
    fileName: null,
    duration: 0,
    currentTime: 0,
    bpm: null
  });
  const [mode, setMode] = useState<AudioMode>('spectrum');
  const [blend, setBlend] = useState<BlendMode>('replace');
  const [sensitivity, setSensitivity] = useState(70);
  const [loop, setLoop] = useState(true);

  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const animFrameRef = useRef<number>(0);
  const startTimeRef = useRef(0);
  const offsetRef = useRef(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const setZoneRef = useRef(setZone);
  const modeRef = useRef(mode);
  const sensitivityRef = useRef(sensitivity);
  const loopRef = useRef(loop);
  const numCannonsRef = useRef(numCannons);
  const gridColumnsRef = useRef(gridColumns);

  useEffect(() => { setZoneRef.current = setZone; }, [setZone]);
  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { sensitivityRef.current = sensitivity; }, [sensitivity]);
  useEffect(() => { loopRef.current = loop; }, [loop]);
  useEffect(() => { numCannonsRef.current = numCannons; }, [numCannons]);
  useEffect(() => { gridColumnsRef.current = gridColumns; }, [gridColumns]);

  // HSB to RGB helper
  const hsbRgb = useCallback((h: number, s: number, b: number): [number, number, number] => {
    h = ((h % 360) + 360) % 360;
    s = Math.max(0, Math.min(100, s)) / 100;
    b = Math.max(0, Math.min(100, b)) / 100;
    const c = b * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = b - c;
    let r = 0, g = 0, bl = 0;
    if (h < 60)        { r = c; g = x; }
    else if (h < 120)  { r = x; g = c; }
    else if (h < 180)  { g = c; bl = x; }
    else if (h < 240)  { g = x; bl = c; }
    else if (h < 300)  { r = x; bl = c; }
    else               { r = c; bl = x; }
    return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((bl + m) * 255)];
  }, []);

  const processFrame = useCallback(() => {
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

    const sens = sensitivityRef.current / 100;
    const nc = numCannonsRef.current;
    const gc = gridColumnsRef.current;
    const rows = Math.ceil(nc / gc);
    const m = modeRef.current;

    if (m === 'spectrum') {
      for (let col = 0; col < gc; col++) {
        const bandStart = Math.floor((col / gc) * bufLen);
        const bandEnd = Math.floor(((col + 1) / gc) * bufLen);
        let bandEnergy = 0;
        for (let i = bandStart; i < bandEnd; i++) bandEnergy += dataArray[i];
        bandEnergy = (bandEnergy / (bandEnd - bandStart)) / 255;
        const hue = (col / gc) * 300;

        for (let row = 0; row < rows; row++) {
          const idx = row * gc + col;
          if (idx >= nc) continue;
          const rowThreshold = 1 - (row + 1) / rows;
          const bright = bandEnergy * sens > rowThreshold ? 60 + bandEnergy * 40 : 5;
          const [r, g, b] = hsbRgb(hue, 85, bright);
          setZoneRef.current(idx, r, g, b);
        }
      }
    } else if (m === 'energy') {
      let totalEnergy = 0;
      for (let i = 0; i < bufLen; i++) totalEnergy += dataArray[i];
      totalEnergy = (totalEnergy / bufLen) / 255;
      let lowEnergy = 0;
      const lowBins = Math.floor(bufLen * 0.15);
      for (let i = 0; i < lowBins; i++) lowEnergy += dataArray[i];
      lowEnergy = (lowEnergy / lowBins) / 255;
      const hue = lowEnergy * 240;
      const bright = 20 + totalEnergy * sens * 80;
      const [r, g, b] = hsbRgb(hue, 80, bright);
      for (let i = 0; i < nc; i++) setZoneRef.current(i, r, g, b);
    } else if (m === 'beat') {
      let totalEnergy = 0;
      for (let i = 0; i < bufLen; i++) totalEnergy += dataArray[i];
      totalEnergy = totalEnergy / bufLen / 255;
      const threshold = 0.35 * sens;
      const isBeat = totalEnergy > threshold;

      for (let col = 0; col < gc; col++) {
        const bandStart = Math.floor((col / gc) * bufLen);
        const bandEnd = Math.floor(((col + 1) / gc) * bufLen);
        let bandVal = 0;
        for (let i = bandStart; i < bandEnd; i++) bandVal += dataArray[i];
        bandVal = (bandVal / (bandEnd - bandStart)) / 255;

        for (let row = 0; row < rows; row++) {
          const idx = row * gc + col;
          if (idx >= nc) continue;
          const hue = isBeat ? col * 30 : 220;
          const bright = isBeat ? 70 + bandVal * 30 : 10 + bandVal * 20;
          const [r, g, b] = hsbRgb(hue % 360, 90, bright);
          setZoneRef.current(idx, r, g, b);
        }
      }
    }

    if (audioContextRef.current) {
      const elapsed = audioContextRef.current.currentTime - startTimeRef.current + offsetRef.current;
      const dur = audioBufferRef.current?.duration || 1;
      setAudioState((s) => ({
        ...s,
        currentTime: Math.min(elapsed, dur)
      }));
    }

    animFrameRef.current = requestAnimationFrame(processFrame);
  }, [hsbRgb]);

  const stopPlayback = useCallback(() => {
    if (sourceRef.current) {
      try {
        sourceRef.current.onended = null;
        sourceRef.current.stop();
      } catch { /* already stopped */ }
      sourceRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = 0;
    }
    offsetRef.current = 0;
    setAudioState((s) => ({ ...s, playing: false, currentTime: 0 }));
  }, []);

  const startPlaybackAt = useCallback((offset: number) => {
    if (!audioBufferRef.current || !audioContextRef.current) return;

    if (sourceRef.current) {
      try {
        sourceRef.current.onended = null;
        sourceRef.current.stop();
      } catch { /* already stopped */ }
      sourceRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = 0;
    }

    const ctx = audioContextRef.current;
    const source = ctx.createBufferSource();
    source.buffer = audioBufferRef.current;
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    analyser.connect(ctx.destination);
    analyserRef.current = analyser;
    sourceRef.current = source;
    offsetRef.current = offset;
    startTimeRef.current = ctx.currentTime;

    source.onended = () => {
      if (loopRef.current && audioBufferRef.current) {
        startPlaybackAt(0);
      } else {
        setAudioState((s) => ({ ...s, playing: false, currentTime: 0 }));
        if (animFrameRef.current) {
          cancelAnimationFrame(animFrameRef.current);
          animFrameRef.current = 0;
        }
      }
    };

    const dur = audioBufferRef.current.duration;
    const clampedOffset = Math.min(offset, dur - 0.01);
    source.start(0, clampedOffset, dur - clampedOffset);
    setAudioState((s) => ({ ...s, playing: true, currentTime: clampedOffset }));
    animFrameRef.current = requestAnimationFrame(processFrame);
  }, [processFrame]);

  const startPlayback = useCallback(() => {
    startPlaybackAt(0);
  }, [startPlaybackAt]);

  const seek = useCallback((time: number) => {
    if (!audioBufferRef.current) return;
    const wasPlaying = !!sourceRef.current;
    if (wasPlaying) {
      startPlaybackAt(time);
    } else {
      offsetRef.current = time;
      setAudioState((s) => ({ ...s, currentTime: time }));
    }
  }, [startPlaybackAt]);

  const detectBPM = useCallback((buffer: AudioBuffer): number | null => {
    const data = buffer.getChannelData(0);
    const sampleRate = buffer.sampleRate;
    const windowSize = Math.floor(sampleRate * 0.05);
    const energies: number[] = [];
    for (let i = 0; i < data.length - windowSize; i += windowSize) {
      let energy = 0;
      for (let j = 0; j < windowSize; j++) energy += data[i + j] * data[i + j];
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
    for (let i = 1; i < peaks.length; i++) intervals.push((peaks[i] - peaks[i - 1]) * 0.05);
    intervals.sort((a, b) => a - b);
    const median = intervals[Math.floor(intervals.length / 2)];
    if (median <= 0) return null;
    const bpm = Math.round(60 / median);
    if (bpm < 60) return bpm * 2;
    if (bpm > 200) return Math.round(bpm / 2);
    return bpm;
  }, []);

  const loadFile = useCallback(async (file: File) => {
    if (!audioContextRef.current) audioContextRef.current = new AudioContext();
    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
    audioBufferRef.current = audioBuffer;
    const bpm = detectBPM(audioBuffer);
    setAudioState({ playing: false, fileName: file.name, duration: audioBuffer.duration, currentTime: 0, bpm });
  }, [detectBPM]);

  useEffect(() => {
    return () => {
      stopPlayback();
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, [stopPlayback]);

  return {
    state: audioState,
    mode,
    blend,
    sensitivity,
    loop,
    setMode,
    setBlend,
    setSensitivity,
    setLoop,
    loadFile,
    play: startPlayback,
    stop: stopPlayback,
    seek,
    canvasRef
  };
}

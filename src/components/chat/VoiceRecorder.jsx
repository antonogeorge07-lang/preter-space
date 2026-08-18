import { db } from '@/lib/db';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Square, X, Loader2, Play, Pause, Languages, Globe } from 'lucide-react';

import { detectLanguage, translateText } from '@/lib/translation';

const BAR_COUNT = 24;

export default function VoiceRecorder({ isOpen, onClose, onVoiceNoteReady, targetLanguage }) {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showTranslated, setShowTranslated] = useState(true);
  const [levels, setLevels] = useState(() => new Array(BAR_COUNT).fill(0));
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const chunksRef = useRef([]);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const rafRef = useRef(null);

  const stopVisualizer = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    analyserRef.current = null;
    setLevels(new Array(BAR_COUNT).fill(0));
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      if (audioContextRef.current) audioContextRef.current.close().catch(() => {});
    };
  }, []);

  const startRecording = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;

    // Web Audio graph: raw PCM access for the live waveform visualizer.
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        audioContextRef.current = new AudioContextClass();
      }
      await audioContextRef.current.resume().catch(() => {});
      const source = audioContextRef.current.createMediaStreamSource(stream);
      const analyser = audioContextRef.current.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.75;
      source.connect(analyser);
      analyserRef.current = analyser;

      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        const node = analyserRef.current;
        if (!node) return;
        node.getByteFrequencyData(data);
        const bucket = Math.max(1, Math.floor(data.length / BAR_COUNT));
        const next = new Array(BAR_COUNT).fill(0).map((_, i) => {
          let sum = 0;
          for (let j = 0; j < bucket; j++) sum += data[i * bucket + j] || 0;
          return Math.min(1, sum / bucket / 180);
        });
        setLevels(next);
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    }

    const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
    mediaRecorderRef.current = recorder;
    chunksRef.current = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
      setAudioBlob(blob);
      const localUrl = URL.createObjectURL(blob);
      setAudioUrl(localUrl);

      // Decode to a raw PCM buffer so duration is exact even when the
      // MediaRecorder container reports none.
      try {
        const ctx = audioContextRef.current;
        if (ctx && ctx.state !== 'closed') {
          const decoded = await ctx.decodeAudioData(await blob.arrayBuffer());
          if (Number.isFinite(decoded.duration) && decoded.duration > 0) {
            setDuration(Math.max(1, Math.round(decoded.duration)));
          }
        }
      } catch {
        /* decoding is best-effort - keep the timer-based duration */
      }
    };

    recorder.start(100);
    setIsRecording(true);
    setAudioBlob(null);
    setAudioUrl(null);
    setDuration(0);
    timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      streamRef.current?.getTracks().forEach(t => t.stop());
      clearInterval(timerRef.current);
      stopVisualizer();
      setIsRecording(false);
    }
  }, [isRecording, stopVisualizer]);

  const togglePlayback = useCallback(() => {
    if (!audioUrl) return;
    const audio = new Audio(audioUrl);
    setIsPlaying(true);
    audio.onended = () => setIsPlaying(false);
    audio.play();
  }, [audioUrl]);

  const processAndSend = useCallback(async () => {
    if (!audioBlob || isProcessing) return;
    setIsProcessing(true);

    const file = new File([audioBlob], 'voice-note.webm', { type: 'audio/webm' });
    const { file_url } = await db.integrations.Core.UploadFile({ file });

    const transcript = await db.integrations.Core.TranscribeAudio({ audio_url: file_url });

    const originalLang = await detectLanguage(transcript);
    const translatedTranscript = originalLang !== targetLanguage
      ? await translateText(transcript, targetLanguage)
      : transcript;

    setIsProcessing(false);
    onVoiceNoteReady({
      audioBlob,
      audioUrl: file_url,
      transcript,
      translatedTranscript,
      originalLanguage: originalLang,
      targetLanguage,
    });
    onClose();
  }, [audioBlob, isProcessing, targetLanguage, onVoiceNoteReady, onClose]);

  const handleReset = useCallback(() => {
    setAudioBlob(null);
    setAudioUrl(null);
    setDuration(0);
    setIsPlaying(false);
  }, []);

  const formatTime = (s) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="relative w-80 p-6 rounded-3xl shadow-2xl"
            style={{ background: 'var(--surface-bg)', border: '1px solid var(--surface-border)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'var(--accent-pink)' }}>
                  <Mic className="w-5 h-5" style={{ color: 'var(--primary)' }} />
                </div>
                <div>
                  <p className="font-semibold text-sm font-heading" style={{ color: 'var(--foreground)' }}>Voice Note</p>
                  <p className="text-xs flex items-center gap-1" style={{ color: 'var(--muted)' }}>
                    <Globe className="w-3 h-3" /> Auto-interpreted
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setShowTranslated(!showTranslated)}
                  className="text-xs px-3 py-1.5 rounded-2xl flex items-center gap-1 transition-all"
                  style={{ background: 'var(--glass-bg-subtle)', color: 'var(--primary)', border: '1px solid var(--card-border)' }}
                >
                  <Languages className="w-3.5 h-3.5" />
                  {showTranslated ? "Original" : "Interpreted"}
                </button>
                <button
                  onClick={onClose}
                  disabled={isProcessing}
                  className="p-2 rounded-xl transition-colors disabled:opacity-30 hover:bg-black/5"
                >
                  <X className="w-4 h-4" style={{ color: 'var(--muted)' }} />
                </button>
              </div>
            </div>

            {/* Waveform / Recording Area */}
            <div className="h-20 rounded-2xl flex items-center justify-center mb-5 relative overflow-hidden"
              style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
              {isProcessing ? (
                <div className="flex items-center gap-2" style={{ color: 'var(--primary)' }}>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Processing...</span>
                </div>
              ) : isRecording ? (
                <div className="flex items-end gap-1 h-14">
                  {levels.map((level, i) => (
                    <div
                      key={i}
                      className="w-1 rounded-full transition-[height] duration-75"
                      style={{ background: 'var(--primary)', height: `${4 + level * 48}px` }}
                    />
                  ))}
                </div>
              ) : audioUrl ? (
                <div className="text-center">
                  <div className="text-sm mb-1" style={{ color: 'var(--muted)' }}>Ready to play · {formatTime(duration)}</div>
                  <button
                    onClick={togglePlayback}
                    className="flex items-center gap-2 transition-all"
                    style={{ color: 'var(--primary)' }}
                  >
                    {isPlaying ? <Pause className="w-7 h-7" /> : <Play className="w-7 h-7 ml-0.5" />}
                    <span className="font-medium text-sm">Play</span>
                  </button>
                </div>
              ) : (
                <p className="text-sm" style={{ color: 'var(--muted)', opacity: 0.6 }}>Record a voice note</p>
              )}
            </div>

            {/* Controls */}
            <div className="flex gap-3">
              {!isRecording ? (
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={startRecording}
                  disabled={isProcessing}
                  className="flex-1 h-12 text-white rounded-2xl font-medium text-sm flex items-center justify-center gap-2 shadow-lg transition-all disabled:opacity-50"
                  style={{ background: 'var(--primary)' }}
                >
                  <Mic className="w-4 h-4" />
                  {audioBlob ? 'RECORD AGAIN' : 'RECORD'}
                </motion.button>
              ) : (
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={stopRecording}
                  className="flex-1 h-12 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-2xl font-medium text-sm flex items-center justify-center gap-2 shadow-lg transition-all"
                >
                  <Square className="w-4 h-4" />
                  STOP ({formatTime(duration)})
                </motion.button>
              )}

              {audioUrl && (
                <>
                  <button
                    onClick={handleReset}
                    disabled={isProcessing}
                    className="px-5 h-12 rounded-2xl text-sm transition-all disabled:opacity-50"
                    style={{ border: '1px solid var(--card-border)', color: 'var(--primary)', background: 'var(--card-bg)' }}
                  >
                    New
                  </button>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={processAndSend}
                    disabled={isProcessing}
                    className="px-5 h-12 text-white rounded-2xl font-medium text-sm shadow-lg transition-all disabled:opacity-50"
                    style={{ background: 'var(--primary)' }}
                  >
                    Send
                  </motion.button>
                </>
              )}
            </div>

            <p className="text-center text-[10px] mt-4" style={{ color: 'var(--muted)', opacity: 0.6 }}>
              Your voice will be automatically transcribed and interpreted
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
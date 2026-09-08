import { useCallback, useEffect, useRef, useState } from "react";

export function useScaleAudio(identity: string, instrument: "xylophone" | "piano") {
  const context = useRef<AudioContext | null>(null);
  const voices = useRef<OscillatorNode[]>([]);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const generation = useRef(0);
  const [playingMidi, setPlayingMidi] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState("");
  const [volume, setVolume] = useState(0.35);
  const stop = useCallback(() => {
    generation.current++;
    for (const timer of timers.current) clearTimeout(timer);
    timers.current = [];
    for (const voice of voices.current) { try { voice.stop(); } catch { /* Already ended. */ } }
    voices.current = [];
    setPlaying(false);
    setPlayingMidi(null);
  }, []);

  useEffect(() => {
    const onHidden = () => { if (document.hidden) stop(); };
    document.addEventListener("visibilitychange", onHidden);
    return () => { document.removeEventListener("visibilitychange", onHidden); stop(); };
  }, [identity, stop]);
  useEffect(() => () => { void context.current?.close(); }, []);

  async function play(midis: number[], bpm = 90) {
    stop();
    const request = generation.current;
    setError("");
    try {
      if (!context.current) context.current = new AudioContext();
      const audio = context.current;
      await audio.resume();
      if (generation.current !== request) return;
      const beat = 60 / Math.min(180, Math.max(40, bpm));
      const start = audio.currentTime + 0.025;
      const duration = Math.min(0.8, beat * 0.95);
      setPlaying(true);
      midis.forEach((midi, index) => {
        const when = start + index * beat;
        const frequency = 440 * 2 ** ((midi - 69) / 12);
        // A quiet synthesized teaching tone; no samples or microphone required.
        [1, instrument === "xylophone" ? 4 : 2].forEach((partial, harmonic) => {
          const oscillator = audio.createOscillator();
          const gain = audio.createGain();
          oscillator.frequency.value = frequency * partial;
          gain.gain.setValueAtTime(0, when);
          gain.gain.linearRampToValueAtTime(volume * (harmonic ? 0.08 : 0.3), when + 0.008);
          gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
          oscillator.connect(gain); gain.connect(audio.destination);
          oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); voices.current = voices.current.filter((v) => v !== oscillator); };
          oscillator.start(when); oscillator.stop(when + duration + 0.02);
          voices.current.push(oscillator);
        });
        timers.current.push(setTimeout(() => setPlayingMidi(midi), (0.025 + index * beat) * 1000));
      });
      timers.current.push(setTimeout(() => { setPlaying(false); setPlayingMidi(null); }, (0.025 + (midis.length - 1) * beat + duration) * 1000));
    } catch {
      stop();
      setError("Sound could not start. Try Play again or use a browser with audio enabled.");
    }
  }
  return { play, stop, playing, playingMidi, error, volume, setVolume };
}

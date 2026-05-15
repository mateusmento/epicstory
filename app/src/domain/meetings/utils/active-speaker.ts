export type SpeakerId = string; // e.g. remoteId or "local"

export type ActiveSpeakerSource = {
  id: SpeakerId;
  stream: MediaStream | null | undefined;
};

export type ActiveSpeakerDetectorOptions = {
  /**
   * Analysis rate. We keep it low to reduce CPU while staying responsive.
   * 8–12 Hz is usually enough for UI switching.
   */
  tickMs?: number;
  /**
   * Frames required above threshold to transition into "speaking".
   */
  startDebounceFrames?: number;
  /**
   * Frames required below threshold to transition out of "speaking".
   * Usually larger than start debounce to avoid chattering.
   */
  stopDebounceFrames?: number;
  /**
   * Relative threshold above baseline noise floor to be considered speaking.
   * Higher = less sensitive (fewer false positives).
   */
  relativeThreshold?: number;
  /**
   * Minimum absolute RMS threshold to avoid promoting near-silence.
   */
  absoluteThreshold?: number;
  /**
   * Cooldown between changing active speaker to prevent flicker.
   */
  switchCooldownMs?: number;
};

type SourceState = {
  id: SpeakerId;
  stream: MediaStream | null;
  audioContext: AudioContext;
  analyser: AnalyserNode;
  sourceNode: MediaStreamAudioSourceNode;
  /**
   * Some TS/DOM typings can be strict about the backing buffer type for analyser methods.
   * We allocate an explicit `ArrayBuffer` when creating this `Uint8Array` (see `buildState`).
   */
  buffer: Uint8Array;

  // Dynamic baseline / smoothing.
  baseline: number;
  levelEma: number;

  // Hysteresis state.
  isSpeaking: boolean;
  aboveFrames: number;
  belowFrames: number;

  lastTalkStartAt: number;
};

export type ActiveSpeakerSnapshot = {
  speakingIds: Set<SpeakerId>;
  newestSpeakerId: SpeakerId | null;
};

export type ActiveSpeakerDetector = {
  setSources: (sources: ActiveSpeakerSource[]) => void;
  resume: () => Promise<void>;
  stop: () => void;
  getSnapshot: () => ActiveSpeakerSnapshot;
};

function hasUsableAudio(stream: MediaStream | null | undefined) {
  const t = stream?.getAudioTracks?.() ?? [];
  return t.length > 0;
}

function rmsFromTimeDomainBytes(buf: ArrayLike<number>) {
  // buf is 0..255 where 128 is "center".
  let sumSq = 0;
  for (let i = 0; i < buf.length; i++) {
    const v = (buf[i] - 128) / 128; // approx -1..1
    sumSq += v * v;
  }
  return Math.sqrt(sumSq / buf.length);
}

export function createActiveSpeakerDetector(
  onChange: (snapshot: ActiveSpeakerSnapshot) => void,
  opts: ActiveSpeakerDetectorOptions = {},
): ActiveSpeakerDetector {
  const tickMs = opts.tickMs ?? 100; // ~10Hz
  const startDebounceFrames = opts.startDebounceFrames ?? 2; // ~200ms
  const stopDebounceFrames = opts.stopDebounceFrames ?? 6; // ~600ms
  const relativeThreshold = opts.relativeThreshold ?? 2.5;
  const absoluteThreshold = opts.absoluteThreshold ?? 0.015;
  const switchCooldownMs = opts.switchCooldownMs ?? 1200;

  const states = new Map<SpeakerId, SourceState>();
  let interval: number | null = null;

  let newestSpeakerId: SpeakerId | null = null;
  let lastSwitchAt = 0;

  function buildState(id: SpeakerId, stream: MediaStream) {
    // Using a dedicated AudioContext per detector keeps lifecycle simple.
    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.2;

    const sourceNode = audioContext.createMediaStreamSource(stream);
    sourceNode.connect(analyser);

    // Force an `ArrayBuffer`-backed typed array (not SharedArrayBuffer) for stricter DOM typings.
    const buffer = new Uint8Array(new ArrayBuffer(analyser.fftSize));
    const now = Date.now();

    const s: SourceState = {
      id,
      stream,
      audioContext,
      analyser,
      sourceNode,
      buffer,
      baseline: 0.005,
      levelEma: 0,
      isSpeaking: false,
      aboveFrames: 0,
      belowFrames: 0,
      lastTalkStartAt: now,
    };
    return s;
  }

  function destroyState(s: SourceState) {
    try {
      s.sourceNode.disconnect();
    } catch {
      // Best-effort cleanup (node may already be disconnected).
    }
    try {
      s.analyser.disconnect();
    } catch {
      // Best-effort cleanup (node may already be disconnected).
    }
    try {
      s.audioContext.close();
    } catch {
      // Best-effort cleanup (context may already be closed).
    }
  }

  function computeSnapshot(): ActiveSpeakerSnapshot {
    const speakingIds = new Set<SpeakerId>();
    for (const [id, s] of states) {
      if (s.isSpeaking) speakingIds.add(id);
    }
    return { speakingIds, newestSpeakerId };
  }

  function tick() {
    let changed = false;

    for (const s of states.values()) {
      // If a track was removed mid-call, analysis becomes meaningless.
      if (!hasUsableAudio(s.stream)) continue;

      // TypeScript DOM typings can disagree about the underlying buffer type
      // (`ArrayBuffer` vs `ArrayBufferLike`). The runtime API only needs a Uint8Array.
      s.analyser.getByteTimeDomainData(s.buffer as any);
      const rms = rmsFromTimeDomainBytes(s.buffer);

      // Update baseline noise floor (slow), biased toward lower levels.
      // If rms is lower than baseline, adapt faster; if higher, adapt slower.
      const baselineAlpha = rms < s.baseline ? 0.08 : 0.015;
      s.baseline = s.baseline + baselineAlpha * (rms - s.baseline);

      // Smooth level to reduce jitter.
      s.levelEma = s.levelEma + 0.3 * (rms - s.levelEma);

      const enterThreshold = Math.max(absoluteThreshold, s.baseline * relativeThreshold);
      const exitThreshold = enterThreshold * 0.7; // hysteresis

      const above = s.levelEma >= enterThreshold;
      const below = s.levelEma <= exitThreshold;

      if (!s.isSpeaking) {
        s.aboveFrames = above ? s.aboveFrames + 1 : 0;
        if (s.aboveFrames >= startDebounceFrames) {
          s.isSpeaking = true;
          s.aboveFrames = 0;
          s.belowFrames = 0;
          s.lastTalkStartAt = Date.now();

          // Newest-speaker selection with cooldown to avoid flicker.
          const now = s.lastTalkStartAt;
          if (now - lastSwitchAt >= switchCooldownMs) {
            newestSpeakerId = s.id;
            lastSwitchAt = now;
            changed = true;
          } else {
            // Still considered a change (speaking set) for UI rings.
            changed = true;
          }
        }
      } else {
        s.belowFrames = below ? s.belowFrames + 1 : 0;
        if (s.belowFrames >= stopDebounceFrames) {
          s.isSpeaking = false;
          s.belowFrames = 0;
          s.aboveFrames = 0;
          changed = true;
        }
      }
    }

    if (changed) onChange(computeSnapshot());
  }

  function ensureRunning() {
    if (interval != null) return;
    interval = window.setInterval(tick, tickMs);
  }

  function stop() {
    if (interval != null) {
      window.clearInterval(interval);
      interval = null;
    }
    for (const s of states.values()) destroyState(s);
    states.clear();
    newestSpeakerId = null;
  }

  function setSources(sources: ActiveSpeakerSource[]) {
    const nextIds = new Set(sources.map((s) => s.id));

    // Remove missing sources.
    for (const [id, s] of states) {
      if (!nextIds.has(id)) {
        destroyState(s);
        states.delete(id);
      }
    }

    // Add/update sources.
    for (const src of sources) {
      const stream = src.stream ?? null;
      if (!stream || !hasUsableAudio(stream)) {
        // If we had a state for it, keep it but mark as non-speaking quickly.
        const existing = states.get(src.id);
        if (existing) {
          existing.stream = stream;
          existing.isSpeaking = false;
          existing.aboveFrames = 0;
          existing.belowFrames = 0;
        }
        continue;
      }

      const existing = states.get(src.id);
      if (!existing) {
        states.set(src.id, buildState(src.id, stream));
        continue;
      }

      // If the underlying stream instance changed, rebuild the nodes.
      if (existing.stream !== stream) {
        destroyState(existing);
        states.set(src.id, buildState(src.id, stream));
      }
    }

    if (states.size > 0) ensureRunning();
  }

  async function resume() {
    // Some browsers start AudioContext in 'suspended' until a gesture.
    await Promise.all(
      Array.from(states.values()).map(async (s) => {
        if (s.audioContext.state === "suspended") {
          try {
            await s.audioContext.resume();
          } catch {
            // Ignore: resume can fail if browser blocks audio until a later gesture.
          }
        }
      }),
    );
  }

  return {
    setSources,
    resume,
    stop,
    getSnapshot: computeSnapshot,
  };
}

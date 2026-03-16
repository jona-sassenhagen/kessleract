const TRACKS = [
  {
    title: "Apogee",
    file: "./music/Kessleract+OST+-+Apogee.MP3",
  },
  {
    title: "Dark Side Passage",
    file: "./music/Kessleract+OST+-+Dark+Side+Passage.MP3",
  },
  {
    title: "Debris Forecast",
    file: "./music/Kessleract+OST+-+Debris+Forecast.MP3",
  },
  {
    title: "Low Earth Window",
    file: "./music/Kessleract+OST+-+Low+Earth+Window.MP3",
  },
];

const STORAGE_KEY = "kessleract-soundtrack-muted";

function readStoredMutePreference() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "true";
  } catch (_error) {
    return false;
  }
}

function storeMutePreference(muted) {
  try {
    window.localStorage.setItem(STORAGE_KEY, muted ? "true" : "false");
  } catch (_error) {
    // Ignore storage failures.
  }
}

class SoundtrackController {
  constructor() {
    this.tracks = TRACKS.map((track, index) => ({
      ...track,
      index,
    }));
    this.audio = null;
    this.currentTrackIndex = 0;
    this.userUnlocked = false;
    this.muted = readStoredMutePreference();
    this.onTrackChange = null;
    this.onMuteChange = null;
    this.onReadyChange = null;
    this.boundUnlock = () => {
      this.ensurePlayback();
    };
  }

  init() {
    if (!this.tracks.length) {
      return;
    }
    this.audio = new Audio(this.tracks[this.currentTrackIndex].file);
    this.audio.preload = "auto";
    this.audio.loop = false;
    this.audio.volume = 0.45;
    this.audio.muted = this.muted;
    this.audio.addEventListener("ended", () => {
      this.nextTrack(true);
    });
    this.audio.addEventListener("play", () => {
      this.userUnlocked = true;
      this.emitReady();
    });
    this.audio.addEventListener("pause", () => {
      this.emitReady();
    });
    window.addEventListener("pointerdown", this.boundUnlock, { passive: true });
    window.addEventListener("keydown", this.boundUnlock, { passive: true });
    this.emitTrack();
    this.emitMute();
    this.emitReady();
  }

  emitTrack() {
    if (typeof this.onTrackChange === "function") {
      this.onTrackChange(this.currentTrack());
    }
  }

  emitMute() {
    if (typeof this.onMuteChange === "function") {
      this.onMuteChange(this.muted);
    }
  }

  emitReady() {
    if (typeof this.onReadyChange === "function") {
      this.onReadyChange({
        userUnlocked: this.userUnlocked,
        playing: Boolean(this.audio && !this.audio.paused),
      });
    }
  }

  currentTrack() {
    return this.tracks[this.currentTrackIndex] || null;
  }

  ensurePlayback() {
    if (!this.audio || this.muted) {
      this.emitReady();
      return;
    }
    const playPromise = this.audio.play();
    if (playPromise && typeof playPromise.then === "function") {
      playPromise
        .then(() => {
          this.userUnlocked = true;
          this.emitReady();
        })
        .catch(() => {
          this.emitReady();
        });
    }
  }

  setMuted(muted) {
    this.muted = Boolean(muted);
    storeMutePreference(this.muted);
    if (this.audio) {
      this.audio.muted = this.muted;
      if (!this.muted) {
        this.ensurePlayback();
      }
    }
    this.emitMute();
    this.emitReady();
  }

  toggleMuted() {
    this.setMuted(!this.muted);
  }

  setTrack(index, { autoplay = true } = {}) {
    if (!this.audio || !this.tracks.length) {
      return;
    }
    const normalized = ((index % this.tracks.length) + this.tracks.length) % this.tracks.length;
    this.currentTrackIndex = normalized;
    const wasPlaying = !this.audio.paused;
    this.audio.src = this.tracks[this.currentTrackIndex].file;
    this.audio.load();
    this.emitTrack();
    if (autoplay && !this.muted && (this.userUnlocked || wasPlaying)) {
      this.ensurePlayback();
    } else {
      this.emitReady();
    }
  }

  nextTrack(autoplay = true) {
    this.setTrack(this.currentTrackIndex + 1, { autoplay });
  }
}

export const soundtrack = new SoundtrackController();

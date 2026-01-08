export interface Track {
    id: string;
    title: string;
    reciterName: string;
    src: string;
    surahNumber?: number;
    ayahStart?: number;
    ayahEnd?: number;
    reciterId?: string;
    sectionSlug?: string;
}

export interface PlayerState {
    currentTrack: Track | null;
    isPlaying: boolean;
    queue: Track[];
    volume: number;
    isExpanded: boolean;
    sleepTimer: number | null; // بالدقائق
    playbackRate: number; // سرعة التشغيل (0.5 - 2)
    repeatMode: 'off' | 'one' | 'all';
    shuffle: boolean;
    isMinimized: boolean;
    activeDownloads: string[]; // URLs of tracks currently being downloaded
    analyserNode: AnalyserNode | null;
}

export type Action =
    | { type: "PLAY_TRACK"; payload: Track }
    | { type: "TOGGLE_PLAY_PAUSE" }
    | { type: "SET_IS_PLAYING"; payload: boolean }
    | { type: "SET_VOLUME"; payload: number }
    | { type: "TOGGLE_EXPAND" }
    | { type: "TOGGLE_MINIMIZED" }
    | { type: "ADD_TO_QUEUE"; payload: Track }
    | { type: "SET_QUEUE"; payload: Track[] }
    | { type: "CLEAR_QUEUE" }
    | { type: "REMOVE_FROM_QUEUE"; payload: number }
    | { type: "NEXT_TRACK" }
    | { type: "PREV_TRACK" }
    | { type: "STOP_PLAYER" }
    | { type: "SET_SLEEP_TIMER"; payload: number | null }
    | { type: "CLEAR_SLEEP_TIMER" }
    | { type: "SET_PLAYBACK_RATE"; payload: number }
    | { type: "SET_REPEAT_MODE"; payload: 'off' | 'one' | 'all' }
    | { type: "TOGGLE_SHUFFLE" }
    | { type: "START_DOWNLOAD"; payload: string }
    | { type: "COMPLETE_DOWNLOAD"; payload: string }
    | { type: "SET_ANALYSER"; payload: AnalyserNode | null }
    | { type: "HYDRATE_STATE"; payload: Partial<PlayerState> };


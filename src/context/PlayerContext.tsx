"use client";

import React, { createContext, useContext, useReducer, ReactNode, useEffect } from "react";
import { Track, PlayerState, Action } from "@/types/player";

const initialState: PlayerState = {
    currentTrack: null,
    isPlaying: false,
    queue: [],
    volume: 1,
    isExpanded: false,
    sleepTimer: null,
    playbackRate: 1,
    repeatMode: 'off',
    shuffle: false,
    isMinimized: false,
    activeDownloads: [],
    analyserNode: null,
};

function playerReducer(state: PlayerState, action: Action): PlayerState {
    switch (action.type) {
        case "PLAY_TRACK":
            // If playing the same track, just toggle? No, usually 'play' means start over or resume.
            // But if it's a new track:
            return {
                ...state,
                currentTrack: action.payload,
                isPlaying: true,
            };
        case "TOGGLE_PLAY_PAUSE":
            return {
                ...state,
                isPlaying: !state.isPlaying,
            };
        case "SET_IS_PLAYING":
            return {
                ...state,
                isPlaying: action.payload,
            };
        case "SET_VOLUME":
            return {
                ...state,
                volume: action.payload,
            };
        case "TOGGLE_EXPAND":
            return {
                ...state,
                isExpanded: !state.isExpanded,
            };
        case "TOGGLE_MINIMIZED":
            return {
                ...state,
                isMinimized: !state.isMinimized,
                isExpanded: false, // Close expanded view if minimizing
            };
        case "ADD_TO_QUEUE":
            // Check if track already exists in queue
            const trackExists = state.queue.some(track => track.id === action.payload.id);
            if (trackExists) {
                return state; // Don't add duplicate
            }
            return {
                ...state,
                queue: [...state.queue, action.payload],
            };
        case "SET_QUEUE":
            return {
                ...state,
                queue: action.payload,
            };
        case "CLEAR_QUEUE":
            return {
                ...state,
                queue: []
            };
        case "REMOVE_FROM_QUEUE":
            const filteredQueue = [...state.queue];
            filteredQueue.splice(action.payload, 1);
            return {
                ...state,
                queue: filteredQueue
            };
        case "NEXT_TRACK":
            if (!state.currentTrack || state.queue.length === 0) return state;
            const currentIndex = state.queue.findIndex(t => t.id === state.currentTrack?.id);

            // Repeat One - replay same track by cloning it to trigger AudioPlayer useEffect
            if (state.repeatMode === 'one') {
                return {
                    ...state,
                    currentTrack: { ...state.currentTrack },
                    isPlaying: true
                };
            }

            // Normal or Repeat All logic
            if (currentIndex === -1 || currentIndex === state.queue.length - 1) {
                // End of queue
                if (state.repeatMode === 'all') {
                    // Go back to first track
                    return {
                        ...state,
                        currentTrack: state.queue[0],
                        isPlaying: true
                    };
                }
                // No repeat - stop playback
                return {
                    ...state,
                    isPlaying: false
                };
            }

            // Play next track
            return {
                ...state,
                currentTrack: state.queue[currentIndex + 1],
                isPlaying: true
            };
        case "PREV_TRACK":
            if (!state.currentTrack || state.queue.length === 0) return state;
            const prevIndex = state.queue.findIndex(t => t.id === state.currentTrack?.id);

            if (prevIndex <= 0) {
                // If it's the first track, just restart it
                return {
                    ...state,
                    currentTrack: { ...state.currentTrack },
                    isPlaying: true
                };
            }

            return {
                ...state,
                currentTrack: state.queue[prevIndex - 1],
                isPlaying: true
            };
        case "STOP_PLAYER":
            return {
                ...state,
                currentTrack: null,
                isPlaying: false,
                queue: [] // Optional: clear queue on stop? Let's say yes for now to fully "close" it.
            };
        case "SET_SLEEP_TIMER":
            return {
                ...state,
                sleepTimer: action.payload
            };
        case "CLEAR_SLEEP_TIMER":
            return {
                ...state,
                sleepTimer: null
            };
        case "SET_PLAYBACK_RATE":
            return {
                ...state,
                playbackRate: action.payload
            };
        case "SET_REPEAT_MODE":
            return {
                ...state,
                repeatMode: action.payload
            };
        case "TOGGLE_SHUFFLE":
            return {
                ...state,
                shuffle: !state.shuffle,
                // Optionally shuffle the queue when enabled
                queue: !state.shuffle && state.queue.length > 0
                    ? [...state.queue].sort(() => Math.random() - 0.5)
                    : state.queue
            };
        case "START_DOWNLOAD":
            return {
                ...state,
                activeDownloads: [...state.activeDownloads, action.payload]
            };
        case "COMPLETE_DOWNLOAD":
            return {
                ...state,
                activeDownloads: state.activeDownloads.filter(url => url !== action.payload)
            };
        case "SET_ANALYSER":
            return {
                ...state,
                analyserNode: action.payload
            };
        case "HYDRATE_STATE":
            return {
                ...state,
                ...action.payload,
                isPlaying: false, // Don't autoplay on refresh
                analyserNode: null // Don't persist analyser
            };
        default:
            return state;
    }
}

export const PlayerContext = createContext<{
    state: PlayerState;
    dispatch: React.Dispatch<Action>;
} | null>(null);

const STORAGE_KEY = "quran_player_state";

export function PlayerProvider({ children }: { children: ReactNode }) {
    const [state, dispatch] = useReducer(playerReducer, initialState);

    // Initial load
    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                dispatch({ type: "HYDRATE_STATE", payload: parsed });
            } catch (e) {
                console.error("Failed to parse player state", e);
            }
        }
    }, []);

    // Save changes
    useEffect(() => {
        const stateToSave = {
            currentTrack: state.currentTrack,
            queue: state.queue,
            volume: state.volume,
            isMinimized: state.isMinimized,
            repeatMode: state.repeatMode,
            shuffle: state.shuffle,
            playbackRate: state.playbackRate
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    }, [state.currentTrack, state.queue, state.volume, state.isMinimized, state.repeatMode, state.shuffle, state.playbackRate]);

    return (
        <PlayerContext.Provider value={{ state, dispatch }}>
            {children}
        </PlayerContext.Provider>
    );
}



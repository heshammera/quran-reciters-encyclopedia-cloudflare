"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePlayer } from "@/hooks/usePlayer";
import { formatTime } from "@/lib/utils";
import { useLeanMode } from "@/context/LeanModeContext";
import { addToHistory } from "@/lib/history-utils";

import PlayerQueue from "./PlayerQueue";
import DownloadButton from "../offline/DownloadButton";

export default function AudioPlayer() {
    const { state, dispatch } = usePlayer();
    const { currentTrack, isPlaying, volume, sleepTimer, playbackRate, repeatMode, shuffle, isMinimized } = state;
    const { isLean } = useLeanMode();
    const audioRef = useRef<HTMLAudioElement>(null);

    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const [showQueue, setShowQueue] = useState(false);
    const [showSleepMenu, setShowSleepMenu] = useState(false);
    const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

            switch (e.code) {
                case "Space":
                    e.preventDefault();
                    if (currentTrack) dispatch({ type: "TOGGLE_PLAY_PAUSE" });
                    break;
                case "ArrowRight":
                    if (audioRef.current) audioRef.current.currentTime += 5;
                    break;
                case "ArrowLeft":
                    if (audioRef.current) audioRef.current.currentTime -= 5;
                    break;
                case "Escape":
                    if (showQueue) setShowQueue(false);
                    else dispatch({ type: "STOP_PLAYER" });
                    break;
                case "KeyQ": // 'Q' to toggle queue
                    setShowQueue(prev => !prev);
                    break;
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [currentTrack, dispatch, showQueue]);

    // Unified Playback Control
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio || !currentTrack) return;

        const handlePlayback = async () => {
            // Normalize URLs to avoid redundant loads
            // Using a try-catch for URL construction to handle relative paths safely
            let normalizedTarget = currentTrack.src;
            try {
                normalizedTarget = new URL(currentTrack.src, window.location.origin).href;
            } catch (e) { }

            const normalizedCurrent = audio.src ? new URL(audio.src, window.location.origin).href : '';

            // 1. Update Source if different
            if (normalizedCurrent !== normalizedTarget) {
                audio.src = currentTrack.src;
                audio.load(); // Force load new source
            } else if (isPlaying && audio.ended) {
                // If same source but ended, reset to start
                audio.currentTime = 0;
            }

            // 2. Manage Playback State
            if (isPlaying) {
                try {
                    await audio.play();
                } catch (err: any) {
                    if (err.name !== "AbortError") {
                        console.error("Audio playback error:", err);
                    }
                }
            } else {
                audio.pause();
            }
        };

        handlePlayback();
    }, [currentTrack?.id, isPlaying]); // Depend on ID to catch same-src replay attempts

    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = volume;
        }
    }, [volume])

    // Apply Playback Rate
    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.playbackRate = playbackRate;
        }
    }, [playbackRate]);

    const handleTimeUpdate = () => {
        if (audioRef.current) {
            setProgress(audioRef.current.currentTime);
            setDuration(audioRef.current.duration || 0);
        }
    };

    const handleEnded = () => {
        dispatch({ type: "NEXT_TRACK" });
    };

    const togglePlay = () => {
        dispatch({ type: "TOGGLE_PLAY_PAUSE" });
    };

    // Load volume from preferences on mount
    useEffect(() => {
        const loadPrefs = async () => {
            const { getUserPreferences } = await import("@/app/actions/user-preferences");
            const prefs = await getUserPreferences();
            if (prefs?.audio_volume !== undefined) {
                dispatch({ type: "SET_VOLUME", payload: prefs.audio_volume });
            }
        };
        loadPrefs();
    }, [dispatch]);

    // Sleep Timer Logic
    useEffect(() => {
        if (!sleepTimer) {
            setTimeRemaining(null);
            return;
        }

        const endTime = Date.now() + sleepTimer * 60 * 1000;
        setTimeRemaining(sleepTimer);

        const interval = setInterval(() => {
            const remaining = Math.ceil((endTime - Date.now()) / 1000 / 60);
            if (remaining <= 0) {
                dispatch({ type: "STOP_PLAYER" });
                dispatch({ type: "CLEAR_SLEEP_TIMER" });
                clearInterval(interval);
            } else {
                setTimeRemaining(remaining);
            }
        }, 1000 * 30); // Update every 30 seconds

        return () => clearInterval(interval);
    }, [sleepTimer, dispatch]);

    // Add to History when track starts playing
    useEffect(() => {
        if (currentTrack && isPlaying) {
            addToHistory({
                trackId: currentTrack.id,
                title: currentTrack.title,
                reciterName: currentTrack.reciterName,
                surahNumber: currentTrack.surahNumber
            });
        }
    }, [currentTrack?.id, isPlaying]);

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const time = Number(e.target.value);
        if (audioRef.current) {
            audioRef.current.currentTime = time;
            setProgress(time);
        }
    }

    if (!currentTrack) return null;

    const audioElement = (
        <audio
            ref={audioRef}
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleEnded}
            onLoadedMetadata={handleTimeUpdate}
        />
    );

    if (isMinimized) {
        return (
            <>
                {audioElement}
                <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 z-50 md:w-auto md:min-w-[300px] pointer-events-none flex justify-center md:justify-end">
                    <div className="pointer-events-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 p-2 flex items-center gap-3 w-full md:w-auto relative overflow-hidden transition-all duration-300 group">
                        {/* Progress Bar Background */}
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-100 dark:bg-slate-800">
                            <div
                                className="h-full bg-emerald-500 transition-all duration-300"
                                style={{ width: `${(progress / duration) * 100}%` }}
                            />
                        </div>

                        {/* Icon */}
                        <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                            </svg>
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0 pr-2">
                            <h3 className="font-bold text-xs truncate text-slate-900 dark:text-slate-100">{currentTrack.title}</h3>
                            <p className="text-[10px] text-slate-500 truncate">{currentTrack.reciterName}</p>
                        </div>

                        {/* Controls */}
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => dispatch({ type: "TOGGLE_PLAY_PAUSE" })}
                                className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
                            >
                                {isPlaying ? (
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6" />
                                    </svg>
                                ) : (
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                    </svg>
                                )}
                            </button>

                            <button
                                onClick={() => dispatch({ type: "TOGGLE_MINIMIZED" })}
                                className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
                                title="توسيع المشغل"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                </svg>
                            </button>

                            <button
                                onClick={() => dispatch({ type: "STOP_PLAYER" })}
                                className="p-1.5 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </>
        );
    }

    return (
        <div className={`fixed bottom-0 left-0 right-0 z-50 transition-colors duration-300 ${isLean
            ? "bg-slate-900 border-t border-slate-700 text-white"
            : "bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]"
            }`}>

            {/* Queue UI Popup */}
            {showQueue && (
                <div className="container mx-auto px-4 relative">
                    <div className="absolute bottom-0 right-0 left-0">
                        <PlayerQueue />
                    </div>
                </div>
            )}

            {audioElement}

            {/* Progress Bar (at very top) */}
            <div className={`w-full h-1 cursor-pointer group ${isLean ? "bg-slate-800" : "bg-slate-200 dark:bg-slate-800"}`}>
                <div
                    className="h-full bg-emerald-500 relative transition-all duration-100 ease-linear"
                    style={{ width: `${(progress / duration) * 100}%` }}
                >
                    {!isLean && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-emerald-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                </div>
                {/* Invisible Range Input for Interaction */}
                <input
                    type="range"
                    min={0}
                    max={duration || 100}
                    value={progress}
                    onChange={handleSeek}
                    className="absolute top-0 w-full h-1 opacity-0 cursor-pointer z-10"
                />
            </div>

            <div className="container mx-auto px-4 py-3 flex flex-col md:flex-row items-center justify-between gap-2 md:gap-4">

                {/* Track Info & Main Controls Wrapper for Mobile */}
                <div className="flex flex-col md:flex-row items-center w-full md:w-auto gap-3 md:gap-4 flex-1">

                    {/* Track Info */}
                    <div className="flex items-center gap-3 w-full md:w-1/3 min-w-0">
                        <div className={`hidden lg:flex w-10 h-10 rounded-lg items-center justify-center font-bold text-xs shrink-0 ${isLean ? "bg-slate-800 text-emerald-400" : "bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400"
                            }`}>
                            {currentTrack.surahNumber || "🔊"}
                        </div>
                        <div className="min-w-0 overflow-hidden">
                            <h4 className={`font-bold truncate text-xs md:text-base ${isLean ? "text-white" : "text-slate-900 dark:text-white"}`}>
                                {currentTrack.title}
                            </h4>
                            <p className={`text-[10px] md:text-xs truncate ${isLean ? "text-slate-400" : "text-slate-500 dark:text-slate-400"}`}>
                                {currentTrack.reciterName}
                            </p>
                        </div>
                        {/* Mobile Main Controls (Inline with Info) */}
                        <div className="flex md:hidden items-center justify-end gap-3 ml-auto shrink-0">
                            <button
                                onClick={() => dispatch({ type: "PREV_TRACK" })}
                                className={`transition-colors ${isLean ? "text-slate-400 hover:text-white" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"}`}
                            >
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" /></svg>
                            </button>

                            <button
                                onClick={togglePlay}
                                className="w-9 h-9 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95"
                            >
                                {isPlaying ? (
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
                                ) : (
                                    <svg className="w-5 h-5 translate-x-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                                )}
                            </button>

                            <button
                                onClick={() => dispatch({ type: "NEXT_TRACK" })}
                                className={`transition-colors ${isLean ? "text-slate-400 hover:text-white" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"}`}
                            >
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" /></svg>
                            </button>
                        </div>
                    </div>

                    {/* Desktop Main Controls (Centered) */}
                    <div className="hidden md:flex items-center justify-center gap-6 w-1/3 shrink-0">
                        <button
                            onClick={() => dispatch({ type: "PREV_TRACK" })}
                            className={`transition-colors ${isLean ? "text-slate-400 hover:text-white" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"}`}
                            title="السابق"
                        >
                            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" /></svg>
                        </button>

                        <button
                            onClick={togglePlay}
                            className="w-12 h-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95"
                            title={isPlaying ? "إيقاف مؤقت" : "تشغيل"}
                        >
                            {isPlaying ? (
                                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
                            ) : (
                                <svg className="w-6 h-6 translate-x-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                            )}
                        </button>

                        <button
                            onClick={() => dispatch({ type: "NEXT_TRACK" })}
                            className={`transition-colors ${isLean ? "text-slate-400 hover:text-white" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"}`}
                            title="التالي"
                        >
                            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" /></svg>
                        </button>
                    </div>
                </div>

                {/* Extra & Volume & Close - Flex container management */}
                <div className="w-full md:w-1/3 flex flex-col md:flex-row items-center justify-end gap-1 md:gap-2 min-w-0 order-2 md:order-none">

                    {/* Time Display */}
                    <span className={`text-[10px] md:text-xs font-mono hidden md:block px-2 py-1 rounded bg-slate-100 dark:bg-slate-800/50 whitespace-nowrap shrink-0 ${isLean ? "text-slate-400" : "text-slate-500"}`}>
                        {formatTime(progress)} / {formatTime(duration)}
                    </span>

                    {/* Group 2: All Utility Tools */}
                    <div className="flex items-center gap-1 md:gap-2 px-0 md:px-1.5 overflow-x-auto md:overflow-visible no-scrollbar w-full md:w-auto mt-2 md:mt-0 justify-between md:justify-start">
                        {/* Mobile prominence for Offline Download */}
                        <div className="flex md:hidden shrink-0">
                            <DownloadButton
                                trackId={currentTrack.id}
                                title={currentTrack.title}
                                reciterName={currentTrack.reciterName}
                                audioUrl={currentTrack.src}
                                surahNumber={currentTrack.surahNumber}
                            />
                        </div>

                        {/* Wrapper for utilities on mobile to scroll/flex properly */}

                        {/* Repeat */}
                        <button
                            onClick={() => {
                                const modes: Array<'off' | 'one' | 'all'> = ['off', 'one', 'all'];
                                const currentIdx = modes.indexOf(repeatMode);
                                const nextMode = modes[(currentIdx + 1) % modes.length];
                                dispatch({ type: "SET_REPEAT_MODE", payload: nextMode });
                            }}
                            className={`p-1.5 transition-colors rounded-lg ${repeatMode !== 'off'
                                ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400"
                                : "text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400"
                                }`}
                            title={repeatMode === 'one' ? 'تكرار التلاوة' : repeatMode === 'all' ? 'تكرار الكل' : 'بدون تكرار'}
                        >
                            {repeatMode === 'one' ? (
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    <text x="12" y="16" fontSize="10" textAnchor="middle" fill="currentColor" fontWeight="bold">1</text>
                                </svg>
                            ) : (
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                            )}
                        </button>

                        {/* Shuffle */}
                        <button
                            onClick={() => dispatch({ type: "TOGGLE_SHUFFLE" })}
                            className={`p-1.5 transition-colors rounded-lg ${shuffle
                                ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400"
                                : "text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400"
                                }`}
                            title={shuffle ? 'إلغاء العشوائي' : 'تشغيل عشوائي'}
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                            </svg>
                        </button>

                        {/* Speed Dropdown */}
                        <div className="relative group ml-1">
                            <select
                                value={playbackRate}
                                onChange={(e) => dispatch({ type: "SET_PLAYBACK_RATE", payload: parseFloat(e.target.value) })}
                                className="appearance-none bg-transparent text-[10px] font-bold px-1 py-0.5 rounded cursor-pointer hover:text-emerald-500 transition-colors text-slate-500"
                                title="سرعة التشغيل"
                            >
                                <option value="0.5">0.5</option>
                                <option value="0.75">0.75</option>
                                <option value="1">1.0</option>
                                <option value="1.25">1.25</option>
                                <option value="1.5">1.5</option>
                                <option value="2">2.0</option>
                            </select>
                        </div>

                        <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1 hidden md:block"></div>

                        {/* Queue */}
                        <button
                            onClick={() => setShowQueue(!showQueue)}
                            className={`p-1.5 transition-colors rounded-lg ${showQueue
                                ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400"
                                : "text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400"
                                }`}
                            title="قائمة التشغيل"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>

                        {/* History */}
                        <Link
                            href="/history"
                            className="p-1.5 transition-colors rounded-lg text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400"
                            title="سجل الاستماع"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </Link>

                        {/* Desktop Downloads - Hidden on mobile as we show it above for mobile prominence */}
                        <div className="hidden md:block">
                            <DownloadButton
                                trackId={currentTrack.id}
                                title={currentTrack.title}
                                reciterName={currentTrack.reciterName}
                                audioUrl={currentTrack.src}
                                surahNumber={currentTrack.surahNumber}
                            />
                        </div>


                        {/* Sleep Timer */}
                        <div className="relative">
                            <button
                                onClick={() => setShowSleepMenu(!showSleepMenu)}
                                className={`p-1.5 transition-colors rounded-lg ${sleepTimer
                                    ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400"
                                    : "text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400"
                                    }`}
                                title={sleepTimer ? `مؤقت: ${timeRemaining}د` : "مؤقت النوم"}
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                                </svg>
                            </button>

                            {showSleepMenu && (
                                <div className="absolute bottom-full right-0 mb-2 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 p-2 min-w-[120px] z-[80]">
                                    <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400 px-2 py-1 mb-1">مؤقت النوم</div>
                                    {[15, 30, 45, 60].map((minutes) => (
                                        <button
                                            key={minutes}
                                            onClick={() => {
                                                dispatch({ type: "SET_SLEEP_TIMER", payload: minutes });
                                                setShowSleepMenu(false);
                                            }}
                                            className="w-full text-right px-3 py-1.5 text-xs hover:bg-slate-50 dark:hover:bg-slate-700 rounded transition-colors text-slate-700 dark:text-slate-300"
                                        >
                                            {minutes} دقيقة
                                        </button>
                                    ))}
                                    {sleepTimer && (
                                        <button
                                            onClick={() => {
                                                dispatch({ type: "CLEAR_SLEEP_TIMER" });
                                                setShowSleepMenu(false);
                                            }}
                                            className="w-full text-right px-3 py-1.5 text-xs hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors text-red-600 dark:text-red-400 border-t border-slate-100 dark:border-slate-700 mt-1 pt-1.5"
                                        >
                                            إلغاء المؤقت
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Mobile Minimize */}
                        <button
                            onClick={() => dispatch({ type: "TOGGLE_MINIMIZED" })}
                            className="block md:hidden p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            title="تصغير"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>
                    </div>

                    {/* Volume Slider Group */}
                    <div className="hidden xl:flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-700 ml-1">
                        <svg className="w-4 h-4 text-slate-400 group-hover:text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                        </svg>
                        <div className="w-16 h-1 rounded-full relative bg-slate-200 dark:bg-slate-700 overflow-hidden">
                            <div
                                className="h-full bg-emerald-500"
                                style={{ width: `${volume * 100}%` }}
                            />
                            <input
                                type="range"
                                min={0}
                                max={1}
                                step={0.01}
                                value={volume}
                                onChange={(e) => {
                                    const val = parseFloat(e.target.value);
                                    dispatch({ type: "SET_VOLUME", payload: val });
                                    import("@/app/actions/user-preferences").then(m => m.updatePreferences({ audio_volume: val }));
                                }}
                                className="absolute top-0 w-full h-full opacity-0 cursor-pointer"
                            />
                        </div>
                    </div>

                    {/* Close Button */}
                    <button
                        onClick={() => dispatch({ type: "TOGGLE_MINIMIZED" })}
                        className="p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors ml-1 hidden lg:block"
                        title="تصغير"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>
                    {/* Close Button - Hidden on mobile if needed, or placed in utilities */}
                    <button
                        onClick={() => dispatch({ type: "STOP_PLAYER" })}
                        className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors ml-1 hidden md:block"
                        title="إغلاق"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>

                    {/* Mobile Close Button (in Utility Row) */}
                    <button
                        onClick={() => dispatch({ type: "STOP_PLAYER" })}
                        className="block md:hidden p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="إغلاق"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
}

"use client";

import { useState, useEffect } from "react";
import {
    getDownloadedTracks,
    removeDownloadedTrack,
    deleteAudioFromCache,
    getCacheSize,
    formatBytes,
    type DownloadedTrack
} from "@/lib/download-manager";
import { getSurahName } from "@/lib/quran-helpers";
import PlayButton from "@/components/player/PlayButton";
import { Track } from "@/types/player";

export default function DownloadsPage() {
    const [downloads, setDownloads] = useState<DownloadedTrack[]>([]);
    const [cacheSize, setCacheSize] = useState<number>(0);
    const [isOnline, setIsOnline] = useState(true);

    useEffect(() => {
        loadDownloads();
        updateCacheSize();

        // Monitor online status
        setIsOnline(navigator.onLine);
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Auto-refresh cache size every 10 seconds to show background download progress
        const cacheRefreshInterval = setInterval(updateCacheSize, 10000);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            clearInterval(cacheRefreshInterval);
        };
    }, []);

    const loadDownloads = () => {
        setDownloads(getDownloadedTracks());
    };

    const updateCacheSize = async () => {
        const size = await getCacheSize();
        setCacheSize(size);
    };

    const handleDelete = async (track: DownloadedTrack) => {
        if (!confirm(`هل تريد حذف تلاوة "${track.title}"؟`)) return;

        // Delete from cache
        await deleteAudioFromCache(track.audioUrl);

        // Remove from localStorage
        removeDownloadedTrack(track.id);

        // Reload
        loadDownloads();
        updateCacheSize();
    };

    const formatDate = (timestamp: number) => {
        const date = new Date(timestamp);
        return date.toLocaleDateString('ar-EG', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    return (
        <div className="container mx-auto px-4 py-8">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                        التلاوات المحفوظة أوفلاين
                    </h1>

                    {/* Online/Offline Indicator */}
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${isOnline
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                        : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                        }`}>
                        <div className={`w-2 h-2 rounded-full ${isOnline ? "bg-emerald-600" : "bg-amber-600"}`} />
                        <span className="text-sm font-bold">{isOnline ? "متصل" : "غير متصل"}</span>
                    </div>
                </div>

                {/* Storage Info */}
                <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-sm text-slate-600 dark:text-slate-400">المساحة المستخدمة</div>
                            <div className="text-2xl font-bold text-slate-900 dark:text-white">{formatBytes(cacheSize)}</div>
                        </div>
                        <div>
                            <div className="text-sm text-slate-600 dark:text-slate-400">عدد التلاوات</div>
                            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{downloads.length}</div>
                        </div>
                        <button
                            onClick={updateCacheSize}
                            className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                            title="تحديث المساحة"
                        >
                            <svg className="w-5 h-5 text-slate-600 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            {/* Downloads List */}
            {downloads.length === 0 ? (
                <div className="text-center py-20">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                        <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                        </svg>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400">لا توجد تلاوات محفوظة</p>
                    <p className="text-sm text-slate-400 dark:text-slate-500 mt-2">
                        استخدم زر "حفظ أوفلاين" على أي تلاوة لإضافتها هنا
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {downloads.map((track) => {
                        const playTrack: Track = {
                            id: track.id,
                            title: track.title,
                            reciterName: track.reciterName,
                            src: track.audioUrl,
                            surahNumber: track.surahNumber
                        };

                        return (
                            <div
                                key={track.id}
                                className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 hover:border-emerald-500 transition-colors"
                            >
                                <div className="flex items-center gap-4">
                                    <PlayButton track={playTrack} contextTracks={[]} size="sm" />

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-bold text-slate-900 dark:text-white">
                                                {track.title}
                                            </h3>
                                            <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold rounded">
                                                محفوظة
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
                                            <span>{track.reciterName}</span>
                                            {track.surahNumber && (
                                                <>
                                                    <span>•</span>
                                                    <span>سورة {getSurahName(track.surahNumber)}</span>
                                                </>
                                            )}
                                            <span>•</span>
                                            <span>{formatDate(track.downloadedAt)}</span>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => handleDelete(track)}
                                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                        title="حذف من الأوفلاين"
                                    >
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

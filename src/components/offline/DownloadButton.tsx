"use client";

import { useState, useEffect } from "react";
import { usePlayer } from "@/hooks/usePlayer";
import { useToast } from "@/context/ToastContext";
import {
    isTrackDownloaded,
    downloadAudioForOffline,
    addPendingDownload,
    addDownloadedTrack,
    removePendingDownload,
    type DownloadedTrack
} from "@/lib/download-manager";

interface DownloadButtonProps {
    trackId: string;
    title: string;
    reciterName: string;
    audioUrl: string;
    surahNumber?: number;
    className?: string;
    fullWidth?: boolean;
    minimal?: boolean;
}

export default function DownloadButton({
    trackId,
    title,
    reciterName,
    audioUrl,
    surahNumber,
    className = "",
    fullWidth = false,
    minimal = false
}: DownloadButtonProps) {
    const { state, dispatch } = usePlayer();
    const { showToast } = useToast();
    const [isDownloaded, setIsDownloaded] = useState(false);

    // Check if this specific URL is being downloaded globally
    const isDownloading = state.activeDownloads.includes(audioUrl);

    useEffect(() => {
        setIsDownloaded(isTrackDownloaded(trackId));
    }, [trackId, state.activeDownloads]);

    // Listen for download completion
    useEffect(() => {
        const handleDownloadComplete = (e: Event) => {
            const customEvent = e as CustomEvent;
            if (customEvent.detail.url === audioUrl) {
                showToast(
                    `✅ اكتمل تحميل "${title}" وأصبح متاحاً للاستماع أوفلاين!`,
                    'success',
                    5000
                );
            }
        };

        window.addEventListener('downloadComplete', handleDownloadComplete);
        return () => {
            window.removeEventListener('downloadComplete', handleDownloadComplete);
        };
    }, [audioUrl, title, showToast]);

    const handleDownload = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (isDownloaded || isDownloading) return;

        // 1. Prepare metadata
        const track: DownloadedTrack = {
            id: trackId,
            title,
            reciterName,
            audioUrl,
            surahNumber,
            downloadedAt: Date.now()
        };

        // 2. Save to pending (in case of navigation)
        addPendingDownload(track);

        // 3. Update global UI state
        dispatch({ type: "START_DOWNLOAD", payload: audioUrl });

        try {
            // 4. Trigger download
            const success = await downloadAudioForOffline(audioUrl);

            if (success) {
                // Download started successfully - save to downloaded tracks
                addDownloadedTrack(track);
                removePendingDownload(audioUrl);

                // Update local state
                setIsDownloaded(true);

                // Show success toast
                showToast(
                    `📥 بدأ تحميل "${title}" في الخلفية. سيتم إعلامك عند الانتهاء.`,
                    'info',
                    8000 // Auto dismiss after 8 seconds
                );

                console.log('[DownloadButton] Track saved to downloads');
            } else {
                showToast('فشل بدء التحميل. حاول مرة أخرى.', 'error');
            }

            // Complete download state (remove spinner)
            dispatch({ type: "COMPLETE_DOWNLOAD", payload: audioUrl });

        } catch (error) {
            console.error('Download error:', error);
            showToast('حدث خطأ أثناء التحميل', 'error');
            dispatch({ type: "COMPLETE_DOWNLOAD", payload: audioUrl });
        }
    };

    if (isDownloaded) {
        return (
            <button
                disabled
                className={`flex items-center justify-center gap-2 ${minimal ? "p-2" : "px-4 py-2"} bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-lg cursor-not-allowed ${fullWidth ? "w-full" : ""} ${className}`}
                title="محفوظة أوفلاين"
            >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {!minimal && <span className="text-sm font-bold">محفوظة</span>}
            </button>
        );
    }

    return (
        <button
            onClick={handleDownload}
            disabled={isDownloading}
            className={`flex items-center justify-center gap-2 ${minimal ? "p-2" : "px-4 py-2"} rounded-lg transition-colors font-bold text-sm ${fullWidth ? "w-full" : ""} ${className} ${isDownloading
                ? "bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400 cursor-wait"
                : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
            title={isDownloading ? "جاري التحميل..." : "حفظ للاستماع أوفلاين"}
        >
            {isDownloading ? (
                <>
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    {!minimal && <span>جاري الحفظ...</span>}
                </>
            ) : (
                <>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                    </svg>
                    {!minimal && <span>حفظ أوفلاين</span>}
                </>
            )}
        </button>
    );
}

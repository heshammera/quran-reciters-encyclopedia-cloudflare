"use client";

import { useEffect } from "react";
import { SURAHS } from "@/lib/quran/metadata";

interface VideoModalProps {
    video: any;
    onClose: () => void;
}

export default function VideoModal({ video, onClose }: VideoModalProps) {
    // Determine playback method
    let embedUrl = "";
    let isDirectFile = false;
    const url = video.video_url || "";

    // Check for direct video file (ends in .mp4, .webm, .ogv)
    const isDirectVideo = /\.(mp4|webm|ogv)(\?.*)?$/i.test(url);

    if (isDirectVideo) {
        isDirectFile = true;
    } else if (url.includes('youtube.com') || url.includes('youtu.be')) {
        const videoId = url.match(/v=([^&]+)/)?.[1] || url.split('/').pop();
        embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
    } else if (url.includes('archive.org')) {
        const identifier = url.match(/(details|download)\/([^\/\?\#&]+)/)?.[2];
        if (identifier) {
            embedUrl = `https://archive.org/embed/${identifier}?autoplay=1`;
        }
    }

    // Handle Escape key
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    if (!embedUrl && !isDirectFile) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/90 backdrop-blur-md transition-opacity"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className="relative w-full max-w-5xl bg-black rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10 animate-in fade-in zoom-in duration-300">
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-10 p-2 bg-black/50 hover:bg-white/20 text-white rounded-full transition-colors"
                >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                {/* Video Player (Responsive Aspect Ratio) */}
                <div className="aspect-video w-full bg-black flex items-center justify-center">
                    {isDirectFile ? (
                        <video
                            src={url}
                            controls
                            autoPlay
                            className="w-full h-full"
                            poster={video.video_thumbnail}
                        />
                    ) : (
                        <iframe
                            src={embedUrl}
                            title="Video player"
                            className="w-full h-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            allowFullScreen
                        ></iframe>
                    )}
                </div>

                {/* Footer Info */}
                <div className="bg-slate-900 text-white p-4 md:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-bold mb-1">
                            {video.title || (video.surah_number ? `سورة ${SURAHS.find(s => s.number === video.surah_number)?.name}` : 'فيديو عام')}
                        </h2>
                        <p className="text-slate-400 text-sm">
                            {video.section?.name_ar} • {video.reciter?.name_ar}
                        </p>
                    </div>
                    {/* Share/Actions could go here */}
                </div>
            </div>
        </div>
    );
}

"use client";

import { useState } from "react";
import { SURAHS } from "@/lib/quran/metadata";
import { useLeanMode } from "@/context/LeanModeContext";

interface VideoGalleryProps {
    videos: any[];
    onPlay: (video: any) => void;
}

export default function VideoGallery({ videos, onPlay }: VideoGalleryProps) {
    const { isLean } = useLeanMode();

    if (!videos || videos.length === 0) {
        return (
            <div className="text-center py-20 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
                <div className="w-16 h-16 mx-auto bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                    لا توجد مرئيات متاحة
                </h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm">
                    لم يتم إضافة تسجيلات مرئية لهذا القارئ بعد.
                </p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {videos.map((video) => (
                <div
                    key={video.id}
                    onClick={() => onPlay(video)}
                    className="group cursor-pointer bg-white dark:bg-slate-800 rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-200 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 hover:-translate-y-1"
                >
                    {/* Thumbnail Container */}
                    <div className="relative aspect-video bg-black overflow-hidden">
                        {!isLean ? (
                            <img
                                src={video.video_thumbnail}
                                alt={`سورة ${video.surah_number}`}
                                className="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
                            />
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 bg-slate-100 dark:bg-slate-900">
                                <svg className="w-12 h-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                                <span className="text-sm">تشغيل الفيديو</span>
                            </div>
                        )}

                        {/* Overlay Gradient (Hidden in Lean) */}
                        {!isLean && <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />}

                        {/* Play Button Overlay */}
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className={`w-14 h-14 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center group-hover:bg-red-600 transition-colors duration-300 shadow-2xl border border-white/30 group-hover:border-red-500 ${!isLean ? 'group-hover:scale-110' : ''}`}>
                                <svg className="w-6 h-6 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M8 5v14l11-7z" />
                                </svg>
                            </div>
                        </div>

                        {/* Quality Label */}
                        <div className="absolute bottom-3 right-3 bg-black/70 text-white text-xs px-2 py-1 rounded backdrop-blur-sm font-medium">
                            {video.quality_level || 'HD'}
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-4">
                        <div className="flex items-start justify-between gap-2 mb-2">
                            <h3 className="font-bold text-lg text-slate-900 dark:text-white line-clamp-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                                {video.title || (video.surah_number ? `سورة ${SURAHS.find(s => s.number === video.surah_number)?.name}` : 'فيديو عام')}
                            </h3>
                            {video.section && (
                                <span className="text-xs bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-2 py-1 rounded-full shrink-0">
                                    {video.section.name_ar}
                                </span>
                            )}
                        </div>

                        <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 mt-3 border-t border-slate-100 dark:border-slate-700 pt-3">
                            <span className="flex items-center gap-1">
                                📅 {video.recording_date?.year || 'غير مؤرخ'}
                            </span>
                            {video.city && (
                                <span className="flex items-center gap-1">
                                    📍 {video.city}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

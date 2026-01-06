"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import PlayButton from "@/components/player/PlayButton";
import VideoModal from "@/components/player/VideoModal";
import { Track } from "@/types/player";
import { useLeanMode } from "@/context/LeanModeContext";
import { getSurahName } from "@/lib/quran-helpers";

interface TimelineRecording {
    id: string;
    title?: string;
    surah_number: number;
    ayah_start: number;
    ayah_end: number;
    recording_date: {
        year: number;
        month?: number;
        day?: number;
        approximate: boolean;
    };
    created_at: string;
    section: {
        name_ar: string;
        slug: string;
    };
    city?: string;
    src?: string;
    reciterName?: string;
    reciterId?: string;
    duration?: string;
    type?: 'audio' | 'video';
    videoUrl?: string;
    videoThumbnail?: string;
    recording_coverage?: {
        surah_number: number;
        ayah_start: number;
        ayah_end: number;
    }[];
}

interface ReciterTimelineProps {
    recordings: TimelineRecording[];
}

export default function ReciterTimeline({ recordings }: ReciterTimelineProps) {
    const { isLean } = useLeanMode();
    const [selectedVideo, setSelectedVideo] = useState<any>(null);

    // Group recordings by Year
    const groupedByYear = useMemo(() => {
        const groups: Record<number, TimelineRecording[]> = {};

        recordings.forEach(rec => {
            const year = rec.recording_date?.year || 0;
            if (!groups[year]) {
                groups[year] = [];
            }
            groups[year].push(rec);
        });

        // Sort years descending
        return Object.entries(groups)
            .sort(([yearA], [yearB]) => Number(yearB) - Number(yearA));
    }, [recordings]);

    if (recordings.length === 0) {
        return (
            <div className="text-center py-10 opacity-60">
                لا توجد بيانات زمنية متاحة للتلاوات.
            </div>
        );
    }

    return (
        <div className={`relative border-r border-slate-200 dark:border-slate-700 mr-4 ${isLean ? 'space-y-6' : 'space-y-12'}`}>
            {groupedByYear.map(([year, groupRecordings]) => (
                <div key={year} className={`relative ${isLean ? 'pr-6' : 'pr-8'}`}>
                    {/* Year Marker */}
                    <div className={`absolute -right-[7px] top-0 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900 ${isLean ? 'w-2.5 h-2.5 -right-[5px]' : ''}`}></div>

                    <h3 className={`font-bold text-slate-900 dark:text-white mb-6 -mt-2 ${isLean ? 'text-lg mb-3' : 'text-2xl'}`}>
                        {year === "0" ? "تاريخ غير محدد" : year}
                    </h3>

                    <div className={`grid grid-cols-1 ${isLean ? 'gap-2' : 'md:grid-cols-2 gap-4'}`}>
                        {groupRecordings.map(rec => {
                            const track: Track = {
                                id: rec.id,
                                title: rec.title || (rec.surah_number ? `سورة ${getSurahName(rec.surah_number)}` : 'تسجيل عام'),
                                reciterName: rec.reciterName || 'Unknown',
                                src: rec.src || '',
                                surahNumber: rec.surah_number,
                                reciterId: rec.reciterId || 'unknown'
                            };

                            return (
                                <div key={rec.id} className={`bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 hover:border-emerald-500 transition-all hover:shadow-md group overflow-hidden ${isLean ? 'rounded-lg p-0' : ''}`}>
                                    <div className={isLean ? 'p-3' : 'p-5'}>
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1 min-w-0">
                                                <Link href={`/recordings/${rec.id}`} className="block">
                                                    <h4 className={`font-bold text-slate-900 dark:text-white mb-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors ${isLean ? 'text-base' : 'text-xl'} flex items-center gap-2`}>
                                                        {rec.title || (rec.surah_number ? `سورة ${getSurahName(rec.surah_number)}` : 'تسجيل عام')}
                                                        {rec.type === 'video' && (
                                                            <span className="text-[10px] bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-2 py-0.5 rounded-full font-medium">فيديو</span>
                                                        )}
                                                    </h4>
                                                    {!isLean && (
                                                        <>
                                                            {rec.recording_coverage && rec.recording_coverage.length > 0 ? (
                                                                <div className="flex flex-wrap gap-1 mb-2">
                                                                    {rec.recording_coverage.map((seg, idx) => (
                                                                        <span key={idx} className="text-[10px] bg-slate-100 dark:bg-slate-700/50 px-2 py-0.5 rounded text-slate-600 dark:text-slate-400">
                                                                            سورة {getSurahName(seg.surah_number)} ({seg.ayah_start} - {seg.ayah_end})
                                                                        </span>
                                                                    ))}
                                                                    {rec.city && <span className="text-[10px] text-slate-500"> • {rec.city}</span>}
                                                                </div>
                                                            ) : (
                                                                <div className="text-sm text-slate-500 dark:text-slate-400 mb-2 font-mono">
                                                                    {rec.surah_number ? (
                                                                        <>
                                                                            {rec.title && <span>سورة {getSurahName(rec.surah_number)} - </span>}
                                                                            <span>(الآيات {rec.ayah_start} - {rec.ayah_end})</span>
                                                                            {rec.city && <span> • {rec.city}</span>}
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            {rec.city && <span>{rec.city}</span>}
                                                                        </>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </>
                                                    )}
                                                </Link>

                                                <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 opacity-60">
                                                    {rec.section?.name_ar}
                                                </div>
                                            </div>

                                            <div className="shrink-0 pt-1">
                                                {rec.type === 'video' ? (
                                                    <button
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            setSelectedVideo(rec);
                                                        }}
                                                        className={`rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center text-white shadow-lg transition-colors flex-shrink-0 ${isLean ? 'w-8 h-8' : 'w-10 h-10'}`}
                                                    >
                                                        <svg className={isLean ? 'w-4 h-4' : 'w-5 h-5'} fill="currentColor" viewBox="0 0 24 24">
                                                            <path d="M8 5v14l11-7z" />
                                                        </svg>
                                                    </button>
                                                ) : rec.src && (
                                                    <PlayButton track={track} size={isLean ? "sm" : "md"} />
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
            {/* Video Modal */}
            {selectedVideo && (
                <VideoModal
                    video={{
                        video_url: selectedVideo.videoUrl || "",
                        title: selectedVideo.title || "",
                        reciter: { name_ar: selectedVideo.reciterName },
                        section: selectedVideo.section
                    }}
                    onClose={() => setSelectedVideo(null)}
                />
            )}
        </div>
    );
}

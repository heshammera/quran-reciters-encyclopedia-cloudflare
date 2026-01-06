"use client";

import { notFound } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getReciter, getSection, getRecordings, getReciterPhases } from "@/lib/supabase/queries";
import PhaseFilter from "@/components/reciters/PhaseFilter";
import PlayButton from "@/components/player/PlayButton";
import QueueButton from "@/components/player/QueueButton";
import AutoPlayer from "@/components/player/AutoPlayer";
import VideoModal from "@/components/player/VideoModal";
import { Track } from "@/types/player";
import { SURAHS } from "@/lib/quran/metadata";
import { getSurahName } from "@/lib/quran-helpers";

interface SectionPageProps {
    params: Promise<{
        reciterId: string;
        sectionSlug: string;
    }>;
    searchParams: Promise<{
        phase?: string;
    }>;
}

export default function SectionPage({ params, searchParams }: SectionPageProps) {
    const [data, setData] = useState<any>(null);
    const [selectedVideo, setSelectedVideo] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            const { reciterId, sectionSlug } = await params;
            const { phase } = await searchParams;

            const [reciter, section] = await Promise.all([
                getReciter(reciterId),
                getSection(sectionSlug),
            ]);

            if (!reciter || !section) {
                notFound();
            }

            const [phases, recordings] = await Promise.all([
                getReciterPhases(reciterId),
                getRecordings(reciterId, section.id, phase),
            ]);

            const queueTracks: Track[] = recordings
                .filter((r: any) => r.type !== 'video')
                .map((recording: any) => ({
                    id: recording.id,
                    title: recording.title || (recording.surah_number ? `سورة ${getSurahName(recording.surah_number)}` : 'تسجيل عام'),
                    reciterName: reciter.name_ar,
                    src: recording.media_files?.[0]?.archive_url || "",
                    surahNumber: recording.surah_number,
                    ayahStart: recording.ayah_start,
                    ayahEnd: recording.ayah_end,
                    reciterId: reciter.id,
                    sectionSlug: section.slug,
                }))
                .filter((t: Track) => t.src);

            setData({ reciter, section, phases, recordings, queueTracks });
            setLoading(false);
        }

        fetchData();
    }, [params, searchParams]);

    if (loading || !data) {
        return <div className="container mx-auto px-4 py-8 text-center">جاري التحميل...</div>;
    }

    const { reciter, section, phases, recordings, queueTracks } = data;

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-8">
                <Link href="/" className="hover:text-emerald-600 dark:hover:text-emerald-400">الرئيسية</Link>
                <span>/</span>
                <Link href={`/reciters/${reciter.id}`} className="hover:text-emerald-600 dark:hover:text-emerald-400">{reciter.name_ar}</Link>
                <span>/</span>
                <span className="text-slate-900 dark:text-white font-bold">{section.name_ar}</span>
            </div>

            <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">{section.name_ar}</h1>
                    <p className="text-slate-600 dark:text-slate-400">
                        تلاوات القارئ {reciter.name_ar}
                    </p>
                </div>
                <div className="shrink-0">
                    <QueueButton
                        tracks={queueTracks}
                        label="إضافة القسم كاملاً للقائمة"
                        variant="solid"
                    />
                </div>
            </div>

            {/* AutoPlayer for Assistant Links */}
            <AutoPlayer queueTracks={queueTracks} />

            {/* Phase Filter */}
            <PhaseFilter phases={phases} />

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow border border-slate-200 dark:border-slate-700">
                {recordings.length > 0 ? (
                    <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                        {recordings.map((recording: any) => {
                            const isVideo = recording.type === 'video';

                            // For audio recordings, build track
                            const track: Track | null = isVideo ? null : {
                                id: recording.id,
                                title: recording.title || (recording.surah_number ? `سورة ${getSurahName(recording.surah_number)}` : 'تسجيل عام'),
                                reciterName: reciter.name_ar,
                                src: recording.media_files?.[0]?.archive_url || "",
                                surahNumber: recording.surah_number,
                                ayahStart: recording.ayah_start,
                                ayahEnd: recording.ayah_end,
                                reciterId: reciter.id,
                                sectionSlug: section.slug,
                            };

                            // Skip audio recordings without valid source
                            if (!isVideo && !track?.src) return null;

                            return (
                                <div key={recording.id} className="p-4 flex items-center gap-4 group hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                    {isVideo ? (
                                        <button
                                            onClick={() => setSelectedVideo(recording)}
                                            className="w-12 h-12 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center text-white shadow-lg transition-colors flex-shrink-0"
                                            title="تشغيل الفيديو"
                                        >
                                            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M8 5v14l11-7z" />
                                            </svg>
                                        </button>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <PlayButton track={track!} contextTracks={queueTracks} size="sm" />
                                            <QueueButton track={track!} variant="ghost" size="sm" />
                                        </div>
                                    )}

                                    {/* Info */}
                                    <Link href={`/recordings/${recording.id}`} className="flex-1 min-w-0 block hover:no-underline">
                                        <div className="flex items-center gap-2 mb-1">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                                                    {recording.title || (recording.surah_number ? `سورة ${getSurahName(recording.surah_number)}` : 'تسجيل عام')}
                                                </span>
                                                {recording.recording_coverage && recording.recording_coverage.length > 0 ? (
                                                    <div className="flex flex-wrap gap-1 mt-1">
                                                        {recording.recording_coverage.map((seg: any, idx: number) => (
                                                            <span key={idx} className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                                                سورة {getSurahName(seg.surah_number)} ({seg.ayah_start}-{seg.ayah_end})
                                                            </span>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    recording.surah_number && (
                                                        <span className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                                                            {recording.title && <span>سورة {getSurahName(recording.surah_number)} - </span>}
                                                            (الآيات {recording.ayah_start}-{recording.ayah_end})
                                                        </span>
                                                    )
                                                )}
                                            </div>
                                            {isVideo && (
                                                <span className="text-[10px] sm:text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-2 py-0.5 rounded-full font-medium">
                                                    فيديو
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                                            {recording.recording_date?.year && <span>📅 {recording.recording_date.year}</span>}
                                            {recording.city && <span>📍 {recording.city}</span>}
                                            {recording.reciter_phases?.phase_name_ar && (
                                                <span className="hidden sm:inline bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                                                    {recording.reciter_phases.phase_name_ar}
                                                </span>
                                            )}
                                        </div>
                                    </Link>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                        {isVideo ? (
                                            <button
                                                onClick={() => setSelectedVideo(recording)}
                                                className="p-2 text-slate-400 hover:text-red-600 transition-colors"
                                                title="تشغيل"
                                            >
                                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                                    <path d="M8 5v14l11-7z" />
                                                </svg>
                                            </button>
                                        ) : (
                                            recording.media_files?.[0]?.archive_url && (
                                                <a
                                                    href={recording.media_files[0].archive_url}
                                                    download
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-2 text-slate-400 hover:text-emerald-600 transition-colors"
                                                    title="تحميل"
                                                >
                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                                    </svg>
                                                </a>
                                            )
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                        <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                            </svg>
                        </div>
                        <p>لا توجد تلاوات في هذا القسم حالياً</p>
                    </div>
                )}
            </div>

            {selectedVideo && (
                <VideoModal
                    video={selectedVideo}
                    onClose={() => setSelectedVideo(null)}
                />
            )}
        </div>
    );
}

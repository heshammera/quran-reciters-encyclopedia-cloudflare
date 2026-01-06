
import { notFound } from "next/navigation";
import Link from "next/link";
import { getRecording, getSimilarRecordings } from "@/lib/supabase/queries";
import { formatTime } from "@/lib/utils";
import PlayButton from "@/components/player/PlayButton";
import QueueButton from "@/components/player/QueueButton";
import { Metadata } from "next";
import { getSurahName } from "@/lib/quran-helpers";

interface RecordingPageProps {
    params: Promise<{
        id: string;
    }>;
}

export async function generateMetadata({ params }: RecordingPageProps): Promise<Metadata> {
    const { id } = await params;
    const recording = await getRecording(id);
    if (!recording) return { title: "تلاوة غير موجودة" };

    let displayTitle = recording.title;
    let description = "";

    if (!displayTitle) {
        if (recording.recording_coverage && recording.recording_coverage.length > 1) {
            const surahNames = recording.recording_coverage
                .map((seg: any) => getSurahName(seg.surah_number))
                .join(" و");
            displayTitle = `سورة ${surahNames} - ${recording.reciter.name_ar}`;
            description = `استمع لتلاوة سور ${surahNames} بصوت القارئ ${recording.reciter.name_ar}.`;
        } else {
            const surahName = recording.surah_number ? getSurahName(recording.surah_number) : "عامة";
            displayTitle = recording.surah_number ? `سورة ${surahName} - ${recording.reciter.name_ar}` : `${recording.reciter.name_ar}`;
            description = `استمع لتلاوة سورة ${surahName} بصوت القارئ ${recording.reciter.name_ar}.`;
        }
    } else {
        description = `استمع لتلاوة ${displayTitle} بصوت القارئ ${recording.reciter.name_ar}.`;
    }

    return {
        title: `${displayTitle} | موسوعة القراء`,
        description: `${description} الدولة: ${recording.city}. التاريخ: ${recording.recording_date?.year || 'غير معروف'}.`
    };
}

import CitationExport from "@/components/recordings/CitationExport";

export default async function RecordingPage({ params }: RecordingPageProps) {
    const { id } = await params;
    const recording = await getRecording(id);
    if (!recording) notFound();

    // Fetch context tracks (all recordings in the same section for the same reciter)
    const { getRecordings } = await import("@/lib/supabase/queries");
    const sectionRecordings = await getRecordings(recording.reciter_id, recording.section_id);

    // Transform to Track format
    const contextTracks = sectionRecordings.map((rec: any) => ({
        id: rec.id,
        title: rec.title || (rec.surah_number ? `سورة ${getSurahName(rec.surah_number)}` : 'تسجيل عام'),
        reciterName: recording.reciter.name_ar,
        src: rec.media_files?.[0]?.archive_url || "",
        surahNumber: rec.surah_number,
        ayahStart: rec.ayah_start,
        ayahEnd: rec.ayah_end,
        reciterId: recording.reciter.id,
        sectionSlug: recording.section.slug,
    })).filter(t => t.src);

    // Determine primary surah for similarity search
    const primarySurah = recording.surah_number || recording.recording_coverage?.[0]?.surah_number;
    const similarRecordings = primarySurah ? await getSimilarRecordings(recording.id, primarySurah) : [];

    // Construct display title for the page
    let displayTitle = recording.title;
    if (!displayTitle) {
        if (recording.recording_coverage && recording.recording_coverage.length > 1) {
            const uniqueSurahs = Array.from(new Set(recording.recording_coverage.map((seg: any) => seg.surah_number)));
            const surahNames = uniqueSurahs
                .map((num: any) => getSurahName(num))
                .join(" و");
            displayTitle = `سورة ${surahNames}`;
        } else {
            const surahName = recording.surah_number ? getSurahName(recording.surah_number) : "عامة";
            displayTitle = recording.surah_number ? `سورة ${surahName}` : 'تسجيل عام';
        }
    }

    // Sort coverage segments if they exist for better display
    if (recording.recording_coverage) {
        recording.recording_coverage.sort((a: any, b: any) => {
            if (a.surah_number !== b.surah_number) return a.surah_number - b.surah_number;
            return a.ayah_start - b.ayah_start;
        });
    }

    const isVideo = recording.type === 'video';

    // Construct track object for player
    const track = {
        id: recording.id,
        title: displayTitle,
        reciterName: recording.reciter.name_ar,
        src: recording.media_files?.find((m: any) => m.media_type === 'audio')?.archive_url || '',
        duration: recording.duration_seconds,
        isVideo: isVideo,
        videoUrl: recording.video_url,
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-20">
            {/* ... header remains ... */}
            <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="container mx-auto px-4 py-8">
                    <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
                        {/* Reciter Image */}
                        <Link href={`/reciters/${recording.reciter.id}`} className="shrink-0 group relative">
                            <div className="w-32 h-32 md:w-48 md:h-48 rounded-2xl overflow-hidden border-4 border-white dark:border-slate-700 shadow-lg">
                                {recording.reciter.image_url ? (
                                    <img
                                        src={recording.reciter.image_url}
                                        alt={recording.reciter.name_ar}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-4xl">
                                        🎙️
                                    </div>
                                )}
                            </div>
                        </Link>

                        {/* Info */}
                        <div className="flex-1 text-center md:text-right space-y-4">
                            <div>
                                <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                                    {displayTitle}
                                </h1>
                                <Link
                                    href={`/reciters/${recording.reciter.id}`}
                                    className="text-xl text-emerald-600 dark:text-emerald-400 hover:underline"
                                >
                                    الشيخ {recording.reciter.name_ar}
                                </Link>
                            </div>

                            <div className="flex flex-wrap justify-center md:justify-start gap-3">
                                <span className="px-3 py-1 rounded-full text-sm bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                    📍 {recording.city}
                                </span>
                                <span className="px-3 py-1 rounded-full text-sm bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                    📅 {recording.recording_date?.year || "غير مؤرخ"}
                                </span>
                                <span className="px-3 py-1 rounded-full text-sm bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                    📂 {recording.section?.name_ar}
                                </span>
                                {recording.rarity_classification !== 'common' && (
                                    <span className={`px-3 py-1 rounded-full text-sm text-white ${recording.rarity_classification === 'very_rare' ? 'bg-purple-600' :
                                        recording.rarity_classification === 'rare' ? 'bg-red-500' : 'bg-amber-500'
                                        }`}>
                                        💎 {recording.rarity_classification === 'very_rare' ? 'نوادر خاصة' : 'ناهرة'}
                                    </span>
                                )}
                            </div>

                            {/* Play & Queue Actions */}
                            <div className="pt-4 flex flex-wrap justify-center md:justify-start gap-3">
                                {isVideo ? (
                                    <a
                                        href="#video-player"
                                        className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold shadow-lg shadow-red-500/20 transition-all transform hover:-translate-y-0.5"
                                    >
                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M8 5v14l11-7z" />
                                        </svg>
                                        مشاهدة الفيديو
                                    </a>
                                ) : (
                                    <>
                                        <PlayButton track={track} contextTracks={contextTracks} size="lg" />
                                        <QueueButton track={track} label="إضافة للقائمة" variant="solid" />
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 py-12">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Video Player if applicable */}
                        {isVideo && recording.video_url && (
                            <div id="video-player" className="bg-black rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10 aspect-video">
                                {(() => {
                                    const url = recording.video_url;
                                    const isYoutube = url.includes('youtube.com') || url.includes('youtu.be');
                                    const isArchive = url.includes('archive.org');

                                    if (isYoutube) {
                                        const videoId = url.match(/v=([^&]+)/)?.[1] || url.split('/').pop();
                                        return (
                                            <iframe
                                                src={`https://www.youtube.com/embed/${videoId}?rel=0`}
                                                className="w-full h-full"
                                                allowFullScreen
                                            ></iframe>
                                        );
                                    } else if (isArchive) {
                                        const identifier = url.match(/(details|download)\/([^\/\?\#&]+)/)?.[2];
                                        return (
                                            <iframe
                                                src={`https://archive.org/embed/${identifier}`}
                                                className="w-full h-full"
                                                allowFullScreen
                                            ></iframe>
                                        );
                                    } else if (/\.(mp4|webm|ogv)$/i.test(url)) {
                                        return (
                                            <video src={url} controls className="w-full h-full" poster={recording.video_thumbnail} />
                                        );
                                    }
                                    return <div className="flex items-center justify-center h-full text-white">رابط الفيديو غير مدعوم للمعالجة المباشرة</div>;
                                })()}
                            </div>
                        )}

                        {/* Description / Notes */}
                        {(recording.source_description || recording.quality_level || recording.archival_id) && (
                            <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-sm border border-slate-100 dark:border-slate-700/50">
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
                                    تفاصيل التسجيل
                                </h3>
                                <div className="space-y-4 text-slate-600 dark:text-slate-400 leading-relaxed">
                                    {recording.source_description && (
                                        <p>{recording.source_description}</p>
                                    )}
                                    {recording.quality_level && (
                                        <p className="text-sm">
                                            <span className="font-bold text-slate-700 dark:text-slate-300">جودة التسجيل:</span> {recording.quality_level}
                                        </p>
                                    )}

                                    <div className="pt-2">
                                        <span className="font-bold text-slate-700 dark:text-slate-300 block mb-2">محتوى التسجيل:</span>
                                        {recording.recording_coverage && recording.recording_coverage.length > 0 ? (
                                            <ul className="space-y-2">
                                                {recording.recording_coverage.map((seg: any, idx: number) => (
                                                    <li key={idx} className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                                                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                                                            سورة {getSurahName(seg.surah_number)}
                                                        </span>
                                                        <span className="text-slate-400">|</span>
                                                        <span className="text-sm text-slate-500">
                                                            الآيات {seg.ayah_start} - {seg.ayah_end}
                                                        </span>
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <p className="text-base text-slate-700 dark:text-slate-300">
                                                سورة {getSurahName(recording.surah_number)} (الآيات {recording.ayah_start} - {recording.ayah_end})
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Similar Recordings */}
                        <div className="pt-8">
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-8 flex items-center gap-3">
                                <span className="text-emerald-500">✨</span>
                                {primarySurah ? `تلاوات أخرى لسورة ${getSurahName(primarySurah)}` : 'تلاوات مقترحة'}
                            </h2>

                            {similarRecordings.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {similarRecordings.map((sim: any) => (
                                        <Link
                                            key={sim.id}
                                            href={`/recordings/${sim.id}`}
                                            className="block group"
                                        >
                                            <div className="bg-white dark:bg-slate-800 rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all border border-slate-200 dark:border-slate-700/50 hover:border-emerald-500">
                                                <div className="p-4 flex items-center gap-4">
                                                    <div className="w-16 h-16 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-700 shrink-0">
                                                        {sim.reciter?.image_url && (
                                                            <img
                                                                src={sim.reciter.image_url}
                                                                alt={sim.reciter.name_ar}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center flex-wrap gap-2 mb-1">
                                                            {sim.recording_coverage && sim.recording_coverage.length > 0 ? (
                                                                <div className="flex flex-wrap gap-1">
                                                                    {sim.recording_coverage.map((seg: any, sIdx: number) => (
                                                                        <span key={sIdx} className="text-[10px] font-bold text-emerald-600 dark:text-emerald-300 px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-500/10 rounded">
                                                                            سورة {getSurahName(seg.surah_number)} ({seg.ayah_start}-{seg.ayah_end})
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-300 px-2 py-0.5 bg-emerald-50 dark:bg-emerald-500/10 rounded">
                                                                    سورة {getSurahName(sim.surah_number)} ({sim.ayah_start} - {sim.ayah_end})
                                                                </span>
                                                            )}
                                                            <span className="text-xs text-slate-500 dark:text-slate-300">
                                                                {sim.section?.name_ar}
                                                            </span>
                                                        </div>
                                                        <div className="flex flex-col gap-2">
                                                            <h3 className="font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 transition-colors">
                                                                الشيخ {sim.reciter?.name_ar}
                                                            </h3>
                                                            <div className="flex items-center gap-2">
                                                                {sim.type === 'video' ? (
                                                                    <Link
                                                                        href={`/recordings/${sim.id}`}
                                                                        className="flex items-center gap-2 px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-xs font-bold transition-colors"
                                                                    >
                                                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                                                            <path d="M8 5v14l11-7z" />
                                                                        </svg>
                                                                        مشاهدة
                                                                    </Link>
                                                                ) : (
                                                                    <>
                                                                        <PlayButton
                                                                            track={{
                                                                                id: sim.id,
                                                                                title: sim.title || `سورة ${getSurahName(sim.surah_number)}`,
                                                                                reciterName: sim.reciter.name_ar,
                                                                                src: sim.media_files?.[0]?.archive_url || "",
                                                                                surahNumber: sim.surah_number,
                                                                                reciterId: sim.reciter.id,
                                                                            }}
                                                                            size="sm"
                                                                        />
                                                                        <QueueButton
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            track={{
                                                                                id: sim.id,
                                                                                title: sim.title || `سورة ${getSurahName(sim.surah_number)}`,
                                                                                reciterName: sim.reciter.name_ar,
                                                                                src: sim.media_files?.[0]?.archive_url || "",
                                                                                surahNumber: sim.surah_number,
                                                                                reciterId: sim.reciter.id,
                                                                            }}
                                                                        />
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                                                            {sim.city} {sim.recording_date?.year ? `(${sim.recording_date.year})` : ''}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-10 text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                                    لا توجد تلاوات مشابهة حالياً
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="lg:col-span-1 space-y-6">
                        <CitationExport recording={recording} />
                    </div>
                </div>
            </main>
        </div>
    );
}

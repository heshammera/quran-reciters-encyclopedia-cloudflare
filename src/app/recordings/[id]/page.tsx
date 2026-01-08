
import { notFound } from "next/navigation";
import Link from "next/link";
import { getRecording, getSimilarRecordings } from "@/lib/supabase/queries";
import { formatTime } from "@/lib/utils";
import { formatDualYear } from "@/lib/date-utils";
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
import RecordingHeaderVisualizer from "@/components/recordings/RecordingHeaderVisualizer";

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

    // Determine all surahs for similarity search
    const surahNumbers = new Set<number>();
    if (recording.surah_number) surahNumbers.add(recording.surah_number);
    if (recording.recording_coverage) {
        recording.recording_coverage.forEach((c: any) => {
            if (c.surah_number) surahNumbers.add(c.surah_number);
        });
    }
    const uniqueSurahArray = Array.from(surahNumbers);
    const similarRecordings = uniqueSurahArray.length > 0 ? await getSimilarRecordings(recording.id, uniqueSurahArray) : [];

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
                            </div>

                            {/* Split Row: Metadata (Right) | Details Box (Left) */}
                            <div className="flex flex-col md:flex-row gap-6 mt-4 items-start">
                                {/* Right Side: Metadata & Actions */}
                                <div className="flex-1 w-full md:w-auto space-y-4">
                                    {/* Reciter Name - Moved Here for Alignment */}
                                    <div>
                                        <Link
                                            href={`/reciters/${recording.reciter.id}`}
                                            className="text-xl text-emerald-600 dark:text-emerald-400 hover:underline inline-block"
                                        >
                                            الشيخ {recording.reciter.name_ar}
                                        </Link>
                                    </div>

                                    <div className="flex flex-wrap justify-center md:justify-start gap-3">
                                        <span className="px-3 py-1 rounded-full text-sm bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                            📍 {recording.city}
                                        </span>
                                        <span className="px-3 py-1 rounded-full text-sm bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                            📅 {formatDualYear(recording.recording_date?.year) || "غير مؤرخ"}
                                        </span>
                                        <Link
                                            href={`/reciters/${recording.reciter.id}/${recording.section?.slug}`}
                                            className="px-3 py-1 rounded-full text-sm bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors"
                                        >
                                            📂 {recording.section?.name_ar}
                                        </Link>
                                        {recording.rarity_classification !== 'common' && (
                                            <span className={`px-3 py-1 rounded-full text-sm text-white ${recording.rarity_classification === 'very_rare' ? 'bg-purple-600' :
                                                recording.rarity_classification === 'rare' ? 'bg-red-500' : 'bg-amber-500'
                                                }`}>
                                                💎 {recording.rarity_classification === 'very_rare' ? 'نوادر خاصة' : 'ناهرة'}
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex flex-wrap justify-center md:justify-start gap-3">
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
                                                <QueueButton track={track} label="إضافة لقائمة التشغيل" variant="solid" />
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Left Side: Details Box */}
                                <div className="w-full md:w-[380px] shrink-0">
                                    <div className="bg-slate-50 dark:bg-slate-700/50 rounded-2xl p-5 border border-slate-100 dark:border-slate-700 relative overflow-hidden group hover:border-emerald-500/30 transition-colors text-right">
                                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-teal-500 opacity-80 z-10" />
                                        <RecordingHeaderVisualizer recordingId={recording.id} />

                                        <h3 className="font-bold text-slate-800 dark:text-white mb-4 text-sm flex items-center gap-2 relative z-10">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                            تفاصيل ومحتوى التسجيل
                                        </h3>

                                        <div className="space-y-4">
                                            {/* Source & Quality */}
                                            {(recording.source_description || recording.quality_level) && (
                                                <div className="text-xs text-slate-600 dark:text-slate-400 space-y-2 pb-4 border-b border-slate-200 dark:border-slate-700">
                                                    {recording.source_description && (
                                                        <p className="leading-relaxed bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-slate-100 dark:border-slate-700/50">
                                                            {recording.source_description}
                                                        </p>
                                                    )}
                                                    {recording.quality_level && (
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-bold text-slate-700 dark:text-slate-300">جودة التسجيل:</span>
                                                            <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded text-[10px] font-bold">
                                                                {recording.quality_level}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Surahs List */}
                                            <div className="grid grid-cols-3 gap-2 max-h-[160px] overflow-y-auto custom-scrollbar pr-1">
                                                {recording.recording_coverage && recording.recording_coverage.length > 0 ? (
                                                    recording.recording_coverage.map((seg: any, idx: number) => (
                                                        <div key={idx} className="flex flex-col items-center justify-center p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/50 group/item hover:border-emerald-500/20 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10 transition-all text-center h-full">
                                                            <div className="flex items-center gap-1 flex-wrap justify-center w-full">
                                                                <span className="font-bold text-emerald-700 dark:text-emerald-400 text-xs line-clamp-1">
                                                                    {getSurahName(seg.surah_number)}
                                                                </span>
                                                                <span className="text-[10px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                                                                    {seg.ayah_start}-{seg.ayah_end}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    ))
                                                ) : recording.surah_number ? (
                                                    <div className="col-span-3">
                                                        <div className="flex items-center justify-center gap-2 p-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/50">
                                                            <span className="font-bold text-emerald-700 dark:text-emerald-400">
                                                                سورة {getSurahName(recording.surah_number)}
                                                            </span>
                                                            <span className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 px-2 py-0.5 rounded">
                                                                الآيات {recording.ayah_start} - {recording.ayah_end}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="col-span-3 text-center py-4 text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-700 rounded-lg">
                                                        لا تتوفر تفاصيل إضافية
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div> {/* End Info Div */}
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 py-12">
                <div className="grid grid-cols-1 gap-8">
                    {/* Main Content */}
                    <div className="space-y-8">
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

                        {/* Similar Recordings */}
                        <div className="pt-8">
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-8 flex items-center gap-3">
                                <span className="text-emerald-500">✨</span>
                                {uniqueSurahArray.length === 1 ? `تلاوات أخرى لسورة ${getSurahName(uniqueSurahArray[0])}` : 'تلاوات مشابهة'}
                            </h2>

                            {similarRecordings.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {similarRecordings.map((sim: any) => (
                                        <Link
                                            key={sim.id}
                                            href={`/recordings/${sim.id}`}
                                            className="block group h-full"
                                        >
                                            <div className="bg-white dark:bg-slate-800 rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all border border-slate-200 dark:border-slate-700/50 hover:border-emerald-500 h-full flex flex-col">
                                                <div className="p-5 flex items-start gap-4">
                                                    <div className="w-20 h-20 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-700 shrink-0">
                                                        {sim.reciter?.image_url && (
                                                            <img
                                                                src={sim.reciter.image_url}
                                                                alt={sim.reciter.name_ar}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center flex-wrap gap-2 mb-2">
                                                            <h4 className="font-bold text-slate-900 dark:text-white text-base leading-snug group-hover:text-emerald-600 transition-colors">
                                                                {sim.title || (sim.surah_number ? `سورة ${getSurahName(sim.surah_number)}` : (sim.sections?.name_ar || 'تلاوة'))}
                                                            </h4>
                                                            <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                                                                {sim.section?.name_ar}
                                                            </span>
                                                        </div>
                                                        <div className="flex flex-col gap-2">
                                                            <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 transition-colors">
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
                                                        <p className="text-base text-slate-600 dark:text-slate-300 mt-1 font-medium">
                                                            📍 {sim.city} {sim.recording_date?.year ? `• ${formatDualYear(sim.recording_date.year)}` : ''}
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
                        <div className="pt-8">
                            <CitationExport recording={recording} />
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

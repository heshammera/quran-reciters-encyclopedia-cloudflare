
import { notFound } from "next/navigation";
import Link from "next/link";
import { getRecording, getSimilarRecordings } from "@/lib/supabase/queries";
import { formatTime } from "@/lib/utils";
import PlayButton from "@/components/player/PlayButton";
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

    if (!recording) {
        notFound();
    }

    const similarRecordings = await getSimilarRecordings(recording.id, recording.surah_number);

    // Construct display title for the page
    let displayTitle = recording.title;
    if (!displayTitle) {
        if (recording.recording_coverage && recording.recording_coverage.length > 1) {
            const surahNames = recording.recording_coverage
                .map((seg: any) => getSurahName(seg.surah_number))
                .join(" و");
            displayTitle = `سورة ${surahNames}`;
        } else {
            const surahName = recording.surah_number ? getSurahName(recording.surah_number) : "عامة";
            displayTitle = recording.surah_number ? `سورة ${surahName}` : 'تسجيل عام';
        }
    }

    // Construct track object for player
    const track = {
        id: recording.id,
        title: displayTitle,
        reciterName: recording.reciter.name_ar,
        src: recording.media_files?.find((m: any) => m.media_type === 'audio')?.archive_url || '',
        duration: recording.duration_seconds
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

                            {/* Play Button */}
                            <div className="pt-4 flex justify-center md:justify-start">
                                <PlayButton track={track} />
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 py-12">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-8">
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
                                            <p className="text-sm">
                                                <span className="font-bold text-slate-700 dark:text-slate-300">نطاق الآيات:</span> {recording.ayah_start} - {recording.ayah_end}
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
                                تلاوات أخرى لنفس السورة
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
                                                        <h3 className="font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 transition-colors">
                                                            الشيخ {sim.reciter?.name_ar}
                                                        </h3>
                                                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
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

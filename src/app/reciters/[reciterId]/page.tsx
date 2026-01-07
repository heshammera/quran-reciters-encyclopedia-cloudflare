import { notFound } from "next/navigation";
import Link from "next/link";
import {
    getReciter,
    getReciterPhases,
    getSections,
    getRecordingsBySectionCount,
    getReciterTimeline,
    getReciterVideos // Imported
} from "@/lib/supabase/queries";
import ReciterProfileHeader from "@/components/reciters/ReciterProfileHeader";
import ReciterTimeline from "../../../components/reciters/ReciterTimeline";
import ExpandableSectionCard from "@/components/reciters/ExpandableSectionCard";
import ReciterVideos from "@/components/reciters/ReciterVideos"; // Imported
import { SURAHS } from "@/lib/quran/metadata";
import { getSurahName } from "@/lib/quran-helpers";

interface ReciterPageProps {
    params: Promise<{
        reciterId: string;
    }>;
    searchParams: Promise<{
        view?: string;
        tab?: string; // Add tab param
    }>;
}

export default async function ReciterPage({ params, searchParams }: ReciterPageProps) {
    const { reciterId } = await params;
    const { view, tab } = await searchParams; // Destructure tab

    const activeTab = tab === 'visuals' ? 'visuals' : 'audio';

    const reciter = await getReciter(reciterId);

    if (!reciter) {
        notFound();
    }

    // Fetch data based on active tab
    const [phases, timelineData, sectionsData, videos] = await Promise.all([
        getReciterPhases(reciter.id),
        (view === 'timeline' && activeTab === 'audio') ? getReciterTimeline(reciter.id) : [],
        getSections(), // Always needed for layout/counts
        activeTab === 'visuals' ? getReciterVideos(reciter.id) : []
    ]);

    // Recalculate section counts only if needed (audio tab) but we need sections for basic structure.
    // Optimization: Only count if audio tab? Yes.
    let sectionsWithRecordings: any[] = [];
    if (activeTab === 'audio') {
        const sectionCounts = await Promise.all(
            sectionsData.map(async (section) => ({
                section,
                count: await getRecordingsBySectionCount(reciter.id, section.id),
            }))
        );
        sectionsWithRecordings = sectionCounts.filter((s) => s.count > 0);
    }

    const isTimelineView = view === 'timeline';

    return (
        <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
            {/* Header */}
            <ReciterProfileHeader reciter={reciter} />

            <main className="container mx-auto px-4 py-8">

                {/* Main Tabs (Tabs UI) */}
                <div className="flex justify-center mb-10 border-b border-slate-200 dark:border-slate-700">
                    <div className="flex -mb-px">
                        <Link
                            href={`/reciters/${reciterId}?tab=audio`}
                            className={`px-8 py-4 text-lg font-bold border-b-2 transition-colors ${activeTab === 'audio'
                                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 dark:border-emerald-400'
                                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                                }`}
                        >
                            <span className="flex items-center gap-2">
                                🎙️ التلاوات الصوتية
                            </span>
                        </Link>
                        <Link
                            href={`/reciters/${reciterId}?tab=visuals`}
                            className={`px-8 py-4 text-lg font-bold border-b-2 transition-colors ${activeTab === 'visuals'
                                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 dark:border-emerald-400'
                                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                                }`}
                        >
                            <span className="flex items-center gap-2">
                                🎥 المرئيات
                            </span>
                        </Link>
                    </div>
                </div>

                {/* Content based on Tab */}
                {activeTab === 'visuals' ? (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <ReciterVideos videos={videos} />
                    </div>
                ) : (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Audio Tab Content (Existing Logic) */}

                        {/* View Toggles (Timeline vs Sections) */}
                        <div className="flex justify-center mb-12">
                            <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-lg inline-flex">
                                <Link
                                    href={`/reciters/${reciterId}?tab=audio`}
                                    className={`px-6 py-2 rounded-md text-sm font-bold transition-all ${!isTimelineView ? 'bg-white dark:bg-slate-700 shadow text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'}`}
                                >
                                    الأقسام
                                </Link>
                                <Link
                                    href={`/reciters/${reciterId}?tab=audio&view=timeline`}
                                    className={`px-6 py-2 rounded-md text-sm font-bold transition-all ${isTimelineView ? 'bg-white dark:bg-slate-700 shadow text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'}`}
                                >
                                    المخطط الزمني
                                </Link>
                            </div>
                        </div>

                        {isTimelineView ? (
                            <div className="max-w-4xl mx-auto">
                                <div className="mb-8 text-center">
                                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                                        الرحلة القرآنية عبر الزمن
                                    </h2>
                                    <p className="text-slate-600 dark:text-slate-400">
                                        استعرض تلاوات {reciter.name_ar} مرتبة تاريخياً
                                    </p>
                                </div>
                                <ReciterTimeline
                                    recordings={timelineData.map((t: any) => ({
                                        id: t.id,
                                        title: t.title || (t.surah_number ? `سورة ${getSurahName(t.surah_number)}` : 'تسجيل عام'),
                                        surah_number: t.surah_number,
                                        ayah_start: t.ayah_start,
                                        ayah_end: t.ayah_end,
                                        recording_date: t.recording_date,
                                        created_at: t.created_at,
                                        section: t.section,
                                        reciterName: t.reciter?.name_ar || 'Unknown',
                                        src: t.media_files?.[0]?.archive_url || '',
                                        city: t.city,
                                        duration: t.duration,
                                        reciterId: reciter.id,
                                        recording_coverage: t.recording_coverage,
                                        type: t.type,
                                        videoUrl: t.video_url,
                                        videoThumbnail: t.video_thumbnail
                                    }))}
                                />
                            </div>
                        ) : (
                            <>
                                {/* Phases (if any) */}
                                {phases.length > 0 && (
                                    <div className="mb-12">
                                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
                                            الفترات الصوتية
                                        </h2>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            {phases.map((phase) => (
                                                <div key={phase.id} className="bg-white dark:bg-slate-800 rounded-lg p-6 border-r-4 border-emerald-500">
                                                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                                                        {phase.phase_name_ar}
                                                    </h3>
                                                    {phase.description_ar && (
                                                        <p className="text-slate-600 dark:text-slate-400 text-sm mb-3">
                                                            {phase.description_ar}
                                                        </p>
                                                    )}
                                                    {(phase.approximate_start_year || phase.approximate_end_year) && (
                                                        <p className="text-sm text-slate-500 dark:text-slate-500">
                                                            {phase.approximate_start_year}
                                                            {phase.approximate_end_year && ` - ${phase.approximate_end_year}`}
                                                        </p>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Sections */}
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
                                        الأقسام المتاحة
                                    </h2>

                                    {sectionsWithRecordings.length === 0 ? (
                                        <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-xl">
                                            <p className="text-xl text-slate-600 dark:text-slate-400">
                                                لم تُضاف تلاوات لهذا القارئ بعد
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                            {sectionsWithRecordings.map(({ section, count }) => (
                                                <ExpandableSectionCard
                                                    key={section.id}
                                                    section={section}
                                                    count={count}
                                                    reciterId={reciter.id}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}

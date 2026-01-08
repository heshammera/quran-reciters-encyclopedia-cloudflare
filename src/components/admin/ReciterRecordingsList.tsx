
"use server";

import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import ReferenceToggle from "./ReferenceToggle";
import { formatDualYear } from "@/lib/date-utils";

interface ReciterRecordingsProps {
    reciterId: string;
}

export default async function ReciterRecordingsList({ reciterId }: ReciterRecordingsProps) {
    const supabase = await createClient();

    // 1. Fetch Recordings
    const { data: recordings } = await supabase
        .from("recordings")
        .select(`
            *,
            sections (name_ar)
        `)
        .eq("reciter_id", reciterId)
        .order("surah_number", { ascending: true });

    // 2. Fetch Existing References
    const { data: references } = await supabase
        .from("reference_tracks")
        .select("*")
        .eq("reciter_id", reciterId);

    // Helper to check if a recording is a reference
    const getReferenceStatus = (rec: any) => {
        const ref = references?.find(r =>
            r.reciter_id === rec.reciter_id &&
            r.section_id === rec.section_id &&
            r.surah_number === rec.surah_number
        );

        const isThisReference = ref?.reference_recording_id === rec.id;
        const hasOtherReference = !!ref && !isThisReference;

        return { isThisReference, hasOtherReference, referenceId: ref?.id };
    };

    if (!recordings || recordings.length === 0) {
        return (
            <div className="text-center py-8 text-slate-500 bg-slate-50 dark:bg-slate-900 rounded-lg border border-dashed border-slate-300">
                لا توجد تسجيلات مسجلة لهذا القارئ
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow border border-slate-200 dark:border-slate-700 mt-8">
            <div className="flex items-center justify-between mb-6 border-b pb-4">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">التسجيلات ({recordings.length})</h3>
                <Link
                    href={`/admin/recordings/new?reciter=${reciterId}`}
                    className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-colors text-sm font-bold"
                >
                    + إضافة تسجيل
                </Link>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-right">
                    <thead className="bg-slate-50 dark:bg-slate-700/50">
                        <tr>
                            <th className="px-4 py-3 text-sm font-semibold text-slate-600 dark:text-slate-300">السورة</th>
                            <th className="px-4 py-3 text-sm font-semibold text-slate-600 dark:text-slate-300">القسم</th>
                            <th className="px-4 py-3 text-sm font-semibold text-slate-600 dark:text-slate-300">التاريخ</th>
                            <th className="px-4 py-3 text-sm font-semibold text-slate-600 dark:text-slate-300">الجودة</th>
                            <th className="px-4 py-3 text-sm font-semibold text-slate-600 dark:text-slate-300">المرجعية 👑</th>
                            <th className="px-4 py-3 text-sm font-semibold text-slate-600 dark:text-slate-300"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                        {recordings.map((rec) => {
                            const { isThisReference, hasOtherReference, referenceId } = getReferenceStatus(rec);
                            return (
                                <tr key={rec.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                                        {rec.surah_number} <span className="text-xs text-slate-500">({rec.ayah_start}-{rec.ayah_end})</span>
                                    </td>
                                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                                        {rec.sections?.name_ar}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-slate-500">
                                        {typeof rec.recording_date === 'object' ? formatDualYear((rec.recording_date as any)?.year) : '-'}
                                    </td>
                                    <td className="px-4 py-3 text-sm">
                                        <span className={`px-2 py-0.5 rounded text-xs ${rec.quality_level === 'high' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
                                            }`}>
                                            {rec.quality_level || 'غير محدد'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <ReferenceToggle
                                            reciterId={reciterId}
                                            sectionId={rec.section_id}
                                            surahNumber={rec.surah_number}
                                            recordingId={rec.id}
                                            isReference={isThisReference}
                                            hasOtherReference={hasOtherReference}
                                            referenceId={referenceId}
                                        />
                                    </td>
                                    <td className="px-4 py-3">
                                        <Link href={`/admin/recordings/${rec.id}`} className="text-blue-600 hover:text-blue-800 text-sm">
                                            تعديل
                                        </Link>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

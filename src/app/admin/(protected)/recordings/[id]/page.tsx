import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import RecordingForm from "@/components/admin/RecordingForm";
import { notFound } from "next/navigation";

interface EditRecordingPageProps {
    params: Promise<{
        id: string;
    }>;
}

export default async function EditRecordingPage({ params }: EditRecordingPageProps) {
    const { id } = await params;
    const supabase = await createClient();
    const { data: recording } = await supabase
        .from("recordings")
        .select(`
            *,
            media_files (
                archive_url,
                is_primary
            ),
            recording_coverage (*)
        `)
        .eq("id", id)
        .single();

    // Transform data to flat format expected by form
    const flattenedRecording = recording ? {
        ...recording,
        archive_url: recording.media_files?.[0]?.archive_url || ""
    } : null;

    if (!recording) {
        notFound();
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4 mb-8">
                <Link
                    href="/admin/recordings"
                    className="w-10 h-10 flex items-center justify-center bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-emerald-500 transition-colors"
                >
                    <svg className="w-5 h-5 text-slate-600 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                        تعديل بيانات التسجيل
                    </h1>
                    <p className="text-slate-500 mt-1 font-mono text-sm">{recording.archival_id}</p>
                </div>
            </div>

            <RecordingForm initialData={flattenedRecording} />
        </div>
    );
}

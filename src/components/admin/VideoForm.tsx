"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { supabase } from "@/lib/supabase/client";
import { SURAHS } from "@/lib/quran/metadata";

interface VideoFormProps {
    reciters: any[];
    sections: any[];
    phases?: any[];
    initialData?: any;
    cities?: { name: string; count: number }[];
}

export default function VideoForm({ reciters, sections, phases = [], initialData, cities = [] }: VideoFormProps) {
    const router = useRouter();
    // const supabase = createClient(); // Removed
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        video_url: initialData?.video_url || "",
        title: initialData?.title || "",
        reciter_id: initialData?.reciter_id || "",
        section_id: initialData?.section_id || "",
        surah_number: initialData?.surah_number || 1,
        ayah_start: initialData?.ayah_start || 1,
        ayah_end: initialData?.ayah_end || 1,
        city: initialData?.city || "",
        time_period: initialData?.recording_date?.year ? String(initialData.recording_date.year) : (initialData?.recording_date?.time_period || "غير محدد"),
        quality_level: initialData?.quality_level || "",
        rarity_classification: initialData?.rarity_classification || "common",
        source_description: initialData?.source_description || "",
        is_published: initialData?.is_published ?? true,
        is_featured: initialData?.is_featured ?? false,
    });

    const [segments, setSegments] = useState<{ surah: number, start: number, end: number }[]>(
        initialData?.recording_coverage?.length > 0
            ? initialData.recording_coverage.map((s: any) => ({ surah: s.surah_number, start: s.ayah_start, end: s.ayah_end }))
            : [{ surah: initialData?.surah_number || 1, start: initialData?.ayah_start || 1, end: initialData?.ayah_end || 7 }]
    );

    const updateSegment = (index: number, field: 'surah' | 'start' | 'end', value: number) => {
        const newSegments = [...segments];
        const seg = newSegments[index];

        if (field === 'surah') {
            const surah = SURAHS.find(s => s.number === value);
            seg.surah = value;
            seg.start = 1;
            seg.end = surah ? surah.ayahCount : 1;
        } else if (field === 'start') {
            seg.start = value;
            if (seg.end < value) seg.end = value;
        } else if (field === 'end') {
            seg.end = value;
        }

        setSegments(newSegments);

        // Update main fields if it's the first segment
        if (index === 0) {
            setFormData(prev => ({
                ...prev,
                surah_number: field === 'surah' ? value : prev.surah_number,
                ayah_start: field === 'start' ? value : prev.ayah_start,
                ayah_end: field === 'end' ? value : prev.ayah_end,
            }));
        }
    };

    const addSegment = () => {
        setSegments([...segments, { surah: 1, start: 1, end: 7 }]);
    };

    const removeSegment = (index: number) => {
        if (segments.length === 1) return;
        setSegments(segments.filter((_, i) => i !== index));
    };

    const [videoMeta, setVideoMeta] = useState<{ id: string; thumb: string; source: 'youtube' | 'archive' } | null>(
        initialData?.video_url ? extractMeta(initialData.video_url) : null
    );

    function extractYoutubeMeta(url: string) {
        const trimmedUrl = url.trim();
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = trimmedUrl.match(regExp);
        if (match && match[2].length === 11) {
            return {
                id: match[2],
                thumb: `https://img.youtube.com/vi/${match[2]}/hqdefault.jpg`,
                source: 'youtube' as const
            };
        }
        return null;
    }

    function extractArchiveMeta(url: string) {
        const trimmedUrl = url.trim();
        // Support both /details/IDENTIFIER and /download/IDENTIFIER/...
        const regExp = /archive\.org\/(details|download)\/([^\/\?\#&]+)/;
        const match = trimmedUrl.match(regExp);
        if (match && match[2]) {
            return {
                id: match[2],
                thumb: `https://archive.org/services/img/${match[2]}`,
                source: 'archive' as const
            };
        }
        return null;
    }

    function extractMeta(url: string) {
        return extractYoutubeMeta(url) || extractArchiveMeta(url);
    }

    const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const url = e.target.value;
        setFormData({ ...formData, video_url: url });
        const meta = extractMeta(url);
        setVideoMeta(meta);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (!videoMeta) throw new Error("رابط الفيديو غير صالح (يدعم يوتيوب وأرشيف فقط)");

            const isEdit = !!initialData?.id;

            const payload: any = {
                type: 'video',
                video_url: formData.video_url,
                video_thumbnail: videoMeta.thumb,
                reciter_id: formData.reciter_id,
                section_id: formData.section_id,
                surah_number: Number(formData.surah_number),
                ayah_start: Number(formData.ayah_start),
                ayah_end: Number(formData.ayah_end),
                city: formData.city,
                recording_date: {
                    year: parseInt(formData.time_period) || null,
                    time_period: formData.time_period
                },
                quality_level: formData.quality_level,
                rarity_classification: formData.rarity_classification,
                source_description: formData.source_description,
                is_published: formData.is_published,
                is_featured: formData.is_featured,
                reliability_level: 'verified', // Default for video
                duration_seconds: 60, // Mock duration
                archival_id: initialData?.archival_id || `VID-${videoMeta.id}-${Date.now()}`,
            };

            let recordingId: string;
            if (isEdit) {
                const { error: submitError } = await supabase
                    .from('recordings')
                    .update(payload)
                    .eq('id', initialData.id);
                if (submitError) throw submitError;
                recordingId = initialData.id;
            } else {
                const { data: newRec, error: submitError } = await supabase
                    .from('recordings')
                    .insert(payload)
                    .select()
                    .single();
                if (submitError) throw submitError;
                recordingId = newRec.id;
            }

            // Sync Coverage (Recording Segments)
            if (recordingId) {
                // Remove old coverage if edit
                if (isEdit) {
                    await supabase
                        .from("recording_coverage")
                        .delete()
                        .eq("recording_id", recordingId);
                }

                // Insert segments
                const coveragePayload = segments.map((seg, idx) => ({
                    recording_id: recordingId,
                    surah_number: seg.surah,
                    ayah_start: seg.start,
                    ayah_end: seg.end,
                    display_order: idx
                }));

                const { error: coverageError } = await supabase
                    .from("recording_coverage")
                    .insert(coveragePayload);

                if (coverageError) throw coverageError;
            }

            router.push('/admin/videos');
            router.refresh();

        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-8 max-w-4xl mx-auto bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
            {error && (
                <div className="p-4 bg-red-50 text-red-600 rounded-lg">{error}</div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* URL */}
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-2">رابط الفيديو (YouTube أو Archive.org)</label>
                    <input
                        type="text"
                        required
                        dir="ltr"
                        placeholder="https://www.youtube.com/watch?v=... أو https://archive.org/details/..."
                        value={formData.video_url}
                        onChange={handleUrlChange}
                        className="w-full p-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                    />
                </div>

                {/* Preview */}
                {videoMeta && (
                    <div className="md:col-span-2 relative aspect-video rounded-xl overflow-hidden bg-black shadow-lg">
                        <img
                            src={videoMeta.thumb}
                            alt="Video Thumbnail"
                            className="w-full h-full object-cover opacity-80"
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center text-white shadow-xl">
                                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                            </div>
                        </div>
                    </div>
                )}

                {/* Reciter */}
                <div>
                    <label className="block text-sm font-medium mb-2">القارئ</label>
                    <select
                        required
                        value={formData.reciter_id}
                        onChange={(e) => setFormData({ ...formData, reciter_id: e.target.value })}
                        className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                    >
                        <option value="">اختر القارئ...</option>
                        {reciters.map((r) => (
                            <option key={r.id} value={r.id}>{r.name_ar}</option>
                        ))}
                    </select>
                </div>

                {/* Section */}
                <div>
                    <label className="block text-sm font-medium mb-2">القسم</label>
                    <select
                        required
                        value={formData.section_id}
                        onChange={(e) => setFormData({ ...formData, section_id: e.target.value })}
                        className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                    >
                        <option value="">اختر القسم...</option>
                        {sections.map((s) => (
                            <option key={s.id} value={s.id}>{s.name_ar}</option>
                        ))}
                    </select>
                </div>

                {/* Surah */}
                {/* Quran Content (Multi-Segment) */}
                <div className="space-y-4 border-t pt-6">
                    <div className="flex justify-between items-center">
                        <h3 className="font-bold text-slate-900 dark:text-white">المحتوى القرآني (السور والآيات)</h3>
                        <button
                            type="button"
                            onClick={addSegment}
                            className="text-xs bg-emerald-100 hover:bg-emerald-200 text-emerald-800 px-3 py-1 rounded-full font-bold transition-colors"
                        >
                            + إضافة مقطع
                        </button>
                    </div>

                    {segments.map((seg, index) => (
                        <div key={index} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl relative group/seg border border-slate-200 dark:border-slate-700">
                            {segments.length > 1 && (
                                <button
                                    type="button"
                                    onClick={() => removeSegment(index)}
                                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-100 text-red-600 rounded-full flex items-center justify-center hover:bg-red-200 opacity-0 group-hover/seg:opacity-100 transition-opacity shadow-sm"
                                >
                                    ×
                                </button>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-medium mb-1 text-slate-500">السورة</label>
                                    <select
                                        value={seg.surah}
                                        onChange={(e) => updateSegment(index, 'surah', Number(e.target.value))}
                                        className="w-full p-2 border rounded dark:bg-slate-700 text-sm"
                                    >
                                        {SURAHS.map(s => <option key={s.number} value={s.number}>{s.number}. {s.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium mb-1 text-slate-500">من آية</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={seg.start}
                                        onChange={(e) => updateSegment(index, 'start', Number(e.target.value))}
                                        className="w-full p-2 border rounded dark:bg-slate-700 text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium mb-1 text-slate-500">إلى آية</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={seg.end}
                                        onChange={(e) => updateSegment(index, 'end', Number(e.target.value))}
                                        className="w-full p-2 border rounded dark:bg-slate-700 text-sm"
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Year/Period */}
                <div>
                    <label className="block text-sm font-medium mb-2">السنة / الفترة</label>
                    <input
                        type="text"
                        placeholder="مثال: 1405 أو 1985"
                        value={formData.time_period}
                        onChange={(e) => setFormData({ ...formData, time_period: e.target.value })}
                        className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                    />
                </div>

                {/* Rarity */}
                <div>
                    <label className="block text-sm font-medium mb-2">تصنيف الندرة</label>
                    <select
                        value={formData.rarity_classification}
                        onChange={(e) => setFormData({ ...formData, rarity_classification: e.target.value })}
                        className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                    >
                        <option value="common">عادي</option>
                        <option value="rare">نادر</option>
                        <option value="very_rare">نادر جداً (نوادر)</option>
                    </select>
                </div>

                {/* Description */}
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-2">وصف أو ملاحظات</label>
                    <textarea
                        rows={3}
                        value={formData.source_description}
                        onChange={(e) => setFormData({ ...formData, source_description: e.target.value })}
                        className="w-full p-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                        placeholder="أدخل أي تفاصيل إضافية حول التسجيل..."
                    />
                </div>

                {/* Toggles */}
                <div className="md:col-span-2 flex gap-8 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-700">
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={formData.is_published}
                            onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                            className="w-5 h-5 accent-emerald-600"
                        />
                        <span className="text-sm font-bold">نشر الفيديو</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={formData.is_featured}
                            onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                            className="w-5 h-5 accent-emerald-600"
                        />
                        <span className="text-sm font-bold">تمييز (Featured)</span>
                    </label>
                </div>
            </div>

            <div className="pt-6 border-t border-slate-200 dark:border-slate-700 flex justify-end">
                <button
                    type="submit"
                    disabled={loading || !videoMeta}
                    className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                    {loading ? (
                        <>
                            <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            جاري الحفظ...
                        </>
                    ) : (
                        'حفظ الفيديو'
                    )}
                </button>
            </div>
        </form>
    );
}

"use client";

import { useState, useEffect, useMemo } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { validateAyahRange, checkDuplicateCoverage, validateRecordingMetadata, type SoftValidationWarning } from "@/lib/quran/validator";
import { uploadFile, getPresignedUploadUrl } from "@/app/actions/storage";
import { SURAHS } from "@/lib/quran/metadata";

// Create authenticated browser client that preserves user session
const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface RecordingFormProps {
    initialData?: any;
}

export default function RecordingForm({ initialData }: RecordingFormProps) {
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

    // Content Type State
    const [contentType, setContentType] = useState<'quran' | 'general'>(
        (initialData && !initialData.surah_number) ? 'general' : 'quran'
    );

    // Data lists
    const [reciters, setReciters] = useState<any[]>([]);
    const [sections, setSections] = useState<any[]>([]);
    const [phases, setPhases] = useState<any[]>([]); // New phases state

    const [formData, setFormData] = useState({
        archival_id: initialData?.archival_id || "",
        reciter_id: initialData?.reciter_id || "",
        title: initialData?.title || "",
        section_id: initialData?.section_id || "",
        reciter_phase_id: initialData?.reciter_phase_id || "", // New field
        surah_number: initialData?.surah_number || 1,
        ayah_start: initialData?.ayah_start || 1,
        ayah_end: initialData?.ayah_end || 1,
        city: initialData?.city || "",
        time_period: initialData?.recording_date?.year ? String(initialData.recording_date.year) : (initialData?.recording_date?.time_period || "غير محدد"),
        duration_seconds: initialData?.duration_seconds || 0,
        source_description: initialData?.source_description || "",
        quality_level: initialData?.quality_level || "",
        reliability_level: initialData?.reliability_level || "verified",
        rarity_classification: initialData?.rarity_classification || "common",
        is_published: initialData?.is_published || false,
        is_featured: initialData?.is_featured || false,
        archive_url: initialData?.archive_url || "",
    });

    // State for Multi-Surah Segments
    const [segments, setSegments] = useState<{ surah: number; start: number; end: number }[]>([
        { surah: 1, start: 1, end: 7 } // Default to Al-Fatihah
    ]);

    // Update formData when segments change (keep backward compatibility)
    useEffect(() => {
        if (segments.length > 0) {
            setFormData(prev => ({
                ...prev,
                surah_number: segments[0].surah,
                ayah_start: segments[0].start,
                ayah_end: segments[0].end
            }));
        }
    }, [segments]);

    // Load segments from initialData when editing
    useEffect(() => {
        if (initialData?.recording_coverage && initialData.recording_coverage.length > 0) {
            setSegments(initialData.recording_coverage.map((seg: any) => ({
                surah: seg.surah_number,
                start: seg.ayah_start,
                end: seg.ayah_end
            })));
        } else if (initialData?.surah_number && initialData?.ayah_start && initialData?.ayah_end) {
            setSegments([{
                surah: initialData.surah_number,
                start: initialData.ayah_start,
                end: initialData.ayah_end
            }]);
        }
    }, [initialData?.id]); // Only run when the recording ID changes

    // Fetch initial data
    useEffect(() => {
        async function fetchData() {
            const { data: recitersData } = await supabase.from("reciters").select("id, name_ar").order("name_ar");
            const { data: sectionsData } = await supabase.from("sections").select("id, name_ar").order("display_order");

            if (recitersData) setReciters(recitersData);
            if (sectionsData) setSections(sectionsData);

            // If editing and reciter is selected, fetch their phases
            if (initialData?.reciter_id) {
                fetchPhases(initialData.reciter_id);
            } else {
                // If NEW recording, try to load from localStorage
                const savedData = localStorage.getItem('lastRecordingData');
                if (savedData) {
                    try {
                        const parsed = JSON.parse(savedData);
                        setFormData(prev => ({
                            ...prev,
                            ...parsed,
                            // Ensure we don't accidentally overwrite unique fields if they were somehow saved
                            title: prev.title,
                            duration_seconds: prev.duration_seconds,
                            archive_url: prev.archive_url,
                            surah_number: prev.surah_number, // Default 1
                            ayah_start: prev.ayah_start, // Default 1
                            ayah_end: prev.ayah_end // Default 1
                        }));

                        // If we restored a reciter, fetch their phases too
                        if (parsed.reciter_id) {
                            fetchPhases(parsed.reciter_id);
                        }
                    } catch (e) {
                        console.error("Failed to load saved form data", e);
                    }
                }
            }
        }
        fetchData();
    }, [initialData]);

    // Fetch phases when reciter changes
    const fetchPhases = async (reciterId: string) => {
        if (!reciterId) {
            setPhases([]);
            return;
        }
        const { data } = await supabase
            .from("reciter_phases")
            .select("*")
            .eq("reciter_id", reciterId)
            .order("display_order");

        if (data) setPhases(data);
        else setPhases([]);
    };

    const handleReciterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const id = e.target.value;
        setFormData({ ...formData, reciter_id: id, reciter_phase_id: "" }); // Reset phase
        fetchPhases(id);
    };

    // DEBUG: Check bucket config
    useEffect(() => {
        import("@/app/actions/debug").then(({ getBucketConfig }) => {
            getBucketConfig("recordings-media").then(res => {
                console.log("🪣 Bucket Config Debug:", res);
            });
        });
    }, []);

    const [duplicateWarning, setDuplicateWarning] = useState(false);
    const [validationWarnings, setValidationWarnings] = useState<SoftValidationWarning[]>([]);
    const [ignoreWarnings, setIgnoreWarnings] = useState(false);

    // Compute if form is valid for publishing (reactive)
    const isFormValid = useMemo(() => {
        const commonValid = !!(formData.reciter_id &&
            formData.section_id &&
            formData.city &&
            formData.time_period &&
            formData.time_period !== "" &&
            formData.duration_seconds > 0 &&
            formData.source_description);

        if (contentType === 'general') {
            return commonValid && !!formData.title;
        } else {
            // For Quran, title is optional, but segments are required (logic handled elsewhere usually, but here we assume segments exist)
            return commonValid;
        }
    }, [formData, contentType]);

    const checkDuplicates = async () => {
        if (!formData.reciter_id || segments.length === 0) return false;

        // Check each segment
        for (const seg of segments) {
            const isDup = await checkDuplicateCoverage(
                formData.reciter_id,
                seg.surah,
                seg.start,
                seg.end,
                initialData?.id
            );
            if (isDup) return true;
        }
        return false;
    };

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
    };

    const addSegment = () => {
        setSegments([...segments, { surah: 1, start: 1, end: 7 }]);
    };

    const removeSegment = (index: number) => {
        if (segments.length === 1) return;
        setSegments(segments.filter((_, i) => i !== index));
    };

    // Helper to generate range
    const getAyahOptions = (count: number) => Array.from({ length: count }, (_, i) => i + 1);

    // Get current surah info


    const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // 1. Parse Metadata (Client-side)
        try {
            // Dynamic import to avoid SSR issues
            const musicMetadata = await import("music-metadata-browser");
            const metadata = await musicMetadata.parseBlob(file);

            // Auto-fill logic
            const updates: any = {};

            // ALWAYS Set Title from Filename (User wants this explicitly)
            const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
            updates.title = nameWithoutExt;

            if (metadata.format.duration) {
                updates.duration_seconds = Math.round(metadata.format.duration);
            }
            if (metadata.common.year) {
                updates.time_period = String(metadata.common.year);
            }
            if (metadata.common.album && !formData.source_description) {
                updates.source_description = metadata.common.album;
            } else if (metadata.common.artist && !formData.source_description) {
                updates.source_description = `تلاوة للشيخ ${metadata.common.artist}`;
            }

            if (Object.keys(updates).length > 0) {
                setFormData(prev => ({ ...prev, ...updates }));
            }
        } catch (err) {
            console.warn("Failed to parse audio metadata:", err);
            // Fallback: Use filename
            const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
            setFormData(prev => ({ ...prev, title: nameWithoutExt }));
        }

        setUploading(true);
        setError("");

        try {
            const fileExt = file.name.split('.').pop() || 'mp3';
            const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
            const filePath = `recordings/${fileName}`; // Keep 'recordings/' folder for structure

            const fileSizeMB = file.size / (1024 * 1024);
            console.log(`Preparing to upload via SDK: ${file.name} (${fileSizeMB.toFixed(2)} MB)`);

            // Use Standard Supabase Client Upload
            const { data, error: uploadError } = await supabase.storage
                .from("recordings-media")
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (uploadError) {
                console.error("Upload error details:", uploadError);
                throw new Error(uploadError.message);
            }

            // Get Public URL
            const { data: publicUrlData } = supabase.storage
                .from("recordings-media")
                .getPublicUrl(filePath);

            setFormData(prev => ({ ...prev, archive_url: publicUrlData.publicUrl }));
        } catch (err: any) {
            console.error(err);
            setError("فشل رفع الملف: " + err.message + ` (${(file.size / (1024 * 1024)).toFixed(2)} MB)`);
        } finally {
            setUploading(false);
        }
    };

    // Helper to extract ID from Archive.org URL
    const getArchiveIdFromUrl = (url: string) => {
        try {
            // Patterns: 
            // 1. https://archive.org/details/IDENTIFIER
            // 2. https://archive.org/download/IDENTIFIER/filename.mp3
            const urlObj = new URL(url);
            const pathParts = urlObj.pathname.split('/');

            if (pathParts.includes('details')) {
                const index = pathParts.indexOf('details');
                return pathParts[index + 1];
            }
            if (pathParts.includes('download')) {
                const index = pathParts.indexOf('download');
                return pathParts[index + 1];
            }
        } catch (e) {
            return null;
        }
        return null;
    };

    const fetchArchiveMetadata = async () => {
        if (!formData.archive_url) return;

        const identifier = getArchiveIdFromUrl(formData.archive_url);
        if (!identifier) {
            alert("لم يتم العثور على معرّف Archive.org صالح في الرابط");
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(`https://archive.org/metadata/${identifier}`);
            const data = await response.json();

            if (data.metadata) {
                const updates: any = {};
                if (data.metadata.year) updates.time_period = String(data.metadata.year);

                // 1. Try to get filename from URL first (Most accurate for specific tracks)
                let urlFilename = "";
                try {
                    const urlObj = new URL(formData.archive_url);
                    const pathname = urlObj.pathname;
                    if (pathname.split('/').length > 0) {
                        const lastPart = pathname.split('/').pop(); // e.g. "01_Surah.mp3"
                        if (lastPart && lastPart.includes('.')) {
                            urlFilename = decodeURIComponent(lastPart).replace(/\.[^/.]+$/, "").replace(/_/g, " ");
                        }
                    }
                } catch (e) { /* ignore */ }

                if (urlFilename) {
                    updates.title = urlFilename;
                } else if (data.metadata.title) {
                    // Fallback to Archive Title if no filename in URL
                    updates.title = data.metadata.title;
                }

                // Map Archive Title to Source Description (Album/Collection Name)
                if (data.metadata.title && !formData.source_description) {
                    updates.source_description = data.metadata.title;
                }

                // Try to find duration from files
                if (data.files && Array.isArray(data.files)) {
                    // Look for the specific file if possible, or take the first mp3
                    const mp3File = data.files.find((f: any) => f.format === 'VBR MP3' || f.format === 'MP3' || f.name.endsWith('.mp3'));
                    if (mp3File && mp3File.length) {
                        updates.duration_seconds = Math.round(parseFloat(mp3File.length));
                    }
                }

                setFormData(prev => ({ ...prev, ...updates }));
                alert("تم جلب البيانات بنجاح: " + JSON.stringify(updates)); // Simple feedback
            }
        } catch (e) {
            console.error(e);
            alert("فشل جلب البيانات من Archive.org");
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Check for duplicates first (if not already warned)
        if (!duplicateWarning) {
            const isDup = await checkDuplicates();
            if (isDup) {
                setDuplicateWarning(true);
                return; // Stop here and show warning
            }
        }

        // Soft Validation checks
        const warnings = validateRecordingMetadata({
            year: parseInt(formData.time_period) || 0, // Try to parse as number, or use 0 if text
            duration_seconds: parseInt(formData.duration_seconds.toString()),
            city: formData.city,
            quality_level: formData.quality_level
        });

        if (warnings.length > 0 && !ignoreWarnings) {
            setValidationWarnings(warnings);
            return;
        }

        // Proceed to submit
        await submitForm();
    };

    const submitForm = async () => {
        setLoading(true);
        setError("");
        setSuccess(false);
        setDuplicateWarning(false);
        setValidationWarnings([]);

        try {
            // 0. Validation for ALL segments (Skip for General)
            if (contentType === 'quran') {
                for (const seg of segments) {
                    const validation = await validateAyahRange(seg.surah, seg.start, seg.end);
                    if (!validation.isValid) {
                        setError(`خطأ في السورة ${seg.surah}: ${validation.error}`);
                        setLoading(false);
                        return;
                    }
                }
            }

            // 1. Prepare payload
            // Use the FIRST segment for the main 'recordings' table (Display purposes)
            // 1. Prepare payload
            // Use the FIRST segment for the main 'recordings' table (Display purposes)
            const mainSegment = segments[0];

            let payload: any = {
                archival_id: formData.archival_id?.trim(),
                title: formData.title?.trim(),
                reciter_id: formData.reciter_id,
                section_id: formData.section_id,
                reciter_phase_id: formData.reciter_phase_id || null,
                city: formData.city,
                recording_date: {
                    year: parseInt(formData.time_period) || null,
                    time_period: formData.time_period
                },
                duration_seconds: parseInt(formData.duration_seconds.toString()),
                source_description: formData.source_description,
                quality_level: formData.quality_level,
                reliability_level: formData.reliability_level,
                rarity_classification: formData.rarity_classification,
                is_published: formData.is_published,
                is_featured: formData.is_featured,
            };

            if (contentType === 'quran') {
                payload.surah_number = mainSegment.surah;
                payload.ayah_start = mainSegment.start;
                payload.ayah_end = mainSegment.end;
            } else {
                payload.surah_number = null;
                payload.ayah_start = null;
                payload.ayah_end = null;
                // Ensure Title is present for General content
                if (!payload.title) {
                    setError("يجب إدخال الاسم الكامل للتلاوة للتسجيلات العامة");
                    setLoading(false);
                    return;
                }
            }

            // Ensure archival_id is populated (Optional for user, Required for DB)
            if (!payload.archival_id) {
                payload.archival_id = initialData?.archival_id || `REC-${Date.now()}`;
            }

            let recordingId = initialData?.id;

            if (initialData?.id) {
                // Update
                const { error } = await supabase
                    .from("recordings")
                    .update(payload)
                    .eq("id", initialData.id);
                if (error) throw error;
            } else {
                // Create


                const { data, error } = await supabase
                    .from("recordings")
                    .insert([payload])
                    .select()
                    .single();

                if (error) throw error;
                recordingId = data.id;
            }

            // 1.5 Save Segments to recording_coverage (Only for Quran)
            if (recordingId && contentType === 'quran') {
                // First delete existing coverage if editing (to handle updates cleanly)
                if (initialData?.id) {
                    await supabase.from("recording_coverage").delete().eq("recording_id", recordingId);
                }

                // Insert new segments
                const coverageRows = segments.map(seg => ({
                    recording_id: recordingId,
                    surah_number: seg.surah,
                    ayah_start: seg.start,
                    ayah_end: seg.end
                }));

                const { error: covError } = await supabase
                    .from("recording_coverage")
                    .insert(coverageRows);

                if (covError) throw covError;
            } else if (recordingId && contentType === 'general') {
                // If switching from Quran to General, clean up coverage
                if (initialData?.id) {
                    await supabase.from("recording_coverage").delete().eq("recording_id", recordingId);
                }
            }


            // 2. Handle Media File (if URL provided)
            if (formData.archive_url && recordingId) {
                const { error: mediaError } = await supabase
                    .from("media_files")
                    .insert([{
                        recording_id: recordingId,
                        media_type: "audio",
                        file_format: "mp3",
                        archive_url: formData.archive_url,
                        is_primary: true
                    }]);

                if (mediaError) console.warn("Media creation warning:", mediaError);
            }

            setSuccess(true);

            // Save metadata for next recording
            if (!initialData) {
                const dataToSave = {
                    reciter_id: formData.reciter_id,
                    section_id: formData.section_id,
                    reciter_phase_id: formData.reciter_phase_id,
                    city: formData.city,
                    time_period: formData.time_period,
                    source_description: formData.source_description,
                    quality_level: formData.quality_level,
                    reliability_level: formData.reliability_level,
                    rarity_classification: formData.rarity_classification,
                    is_published: formData.is_published,
                    is_featured: formData.is_featured,
                    // Note: title, surah, ayahs, url, duration are intentionally excluded
                };
                localStorage.setItem('lastRecordingData', JSON.stringify(dataToSave));
            }

            if (!initialData) {
                // Reset essential content fields ONLY
                setFormData(prev => ({
                    ...prev, // Keep the metadata we just saved (reciter, city, etc.)
                    title: "", // Reset title
                    archive_url: "",
                    archival_id: "",
                    duration_seconds: 0, // Reset duration
                    time_period: prev.time_period // Keep year
                }));
                // Reset segments to Fatihah (or keep 1 if user wants consistent flow? Let's reset to Fatihah for now)
                setSegments([{ surah: 1, start: 1, end: 7 }]);

                // Keep the success message for a bit longer or scroll top? 
                // For now just letting the user see "Saved Successfully"
            }

        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow border border-slate-200 dark:border-slate-700 space-y-8">

            {error && <div className="p-4 bg-red-50 text-red-600 rounded-lg border border-red-100">{error}</div>}

            {/* Duplicate Warning */}
            {duplicateWarning && (
                <div className="p-4 bg-amber-50 text-amber-800 rounded-lg border border-amber-200 flex items-start gap-3">
                    <span className="text-2xl">⚠️</span>
                    <div>
                        <p className="font-bold">تنبيه: يوجد تسجيل مشابه</p>
                        <p className="text-sm mt-1">
                            يبدو أن هذا القارئ لديه بالفعل تسجيل يغطي نفس الآيات ({formData.surah_number}: {formData.ayah_start}-{formData.ayah_end}).
                            <br />
                            هل أنت متأكد من رغبتك في إضافة نسخة أخرى؟ (قد يكون هذا صحيحاً إذا كانت حفلة مختلفة أو رواية أخرى).
                        </p>
                        <button
                            type="button"
                            onClick={submitForm} // Bypass check
                            className="mt-3 text-xs bg-amber-200 hover:bg-amber-300 text-amber-900 px-3 py-1 rounded font-bold"
                        >
                            نعم، أنا متأكد (متابعة الحفظ)
                        </button>
                    </div>
                </div>
            )}

            {/* Soft Validation Warnings */}
            {validationWarnings.length > 0 && (
                <div className="p-4 bg-orange-50 text-orange-800 rounded-lg border border-orange-200">
                    <div className="flex items-start gap-3 mb-3">
                        <span className="text-2xl">⚠️</span>
                        <div>
                            <p className="font-bold">ملاحظات على البيانات (تحذيرات)</p>
                            <ul className="list-disc list-inside mt-1 text-sm space-y-1">
                                {validationWarnings.map((w, idx) => (
                                    <li key={idx}>{w.message}</li>
                                ))}
                            </ul>
                        </div>
                    </div>
                    <div className="flex gap-3 mr-9">
                        <button
                            type="button"
                            onClick={() => { setIgnoreWarnings(true); handleSubmit({ preventDefault: () => { } } as any); }}
                            className="text-xs bg-orange-200 hover:bg-orange-300 text-orange-900 px-3 py-1 rounded font-bold"
                        >
                            تجاهل الملاحظات وحفظ التسجيل
                        </button>
                        <button
                            type="button"
                            onClick={() => setValidationWarnings([])}
                            className="text-xs text-orange-700 hover:underline"
                        >
                            تعديل البيانات
                        </button>
                    </div>
                </div>
            )}

            {success && <div className="p-4 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100">تم الحفظ بنجاح!</div>}

            {success && <div className="p-4 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100">تم الحفظ بنجاح!</div>}

            {/* Content Type Toggle */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700 mb-6 flex items-center justify-between">
                <div>
                    <h3 className="font-bold text-slate-900 dark:text-white">نوع المحتوى</h3>
                    <p className="text-sm text-slate-500">اختر نوع التسجيل لتحديد الحقول المطلوبة</p>
                </div>
                <div className="flex bg-slate-100 dark:bg-slate-700/50 p-1 rounded-lg">
                    <button
                        type="button"
                        onClick={() => setContentType('quran')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${contentType === 'quran'
                            ? 'bg-white dark:bg-slate-600 shadow text-emerald-600 dark:text-emerald-400'
                            : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                            }`}
                    >
                        تلاوة قرآنية
                    </button>
                    <button
                        type="button"
                        onClick={() => setContentType('general')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${contentType === 'general'
                            ? 'bg-white dark:bg-slate-600 shadow text-emerald-600 dark:text-emerald-400'
                            : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                            }`}
                    >
                        تسجيل عام (ابتهال/نشيد)
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Relations */}
                <div className="space-y-4">
                    <h3 className="font-bold text-slate-900 dark:text-white border-b pb-2">التصنيف</h3>

                    <div>
                        <label className="block text-sm font-medium mb-1">القارئ *</label>
                        <select
                            required
                            value={formData.reciter_id}
                            onChange={handleReciterChange}
                            className="w-full p-2 border rounded dark:bg-slate-700"
                        >
                            <option value="">اختر القارئ...</option>
                            {reciters.map(r => <option key={r.id} value={r.id}>{r.name_ar}</option>)}
                        </select>
                    </div>

                    {/* Phase Selection - Only shows if phases exist */}
                    {phases.length > 0 && (
                        <div>
                            <label className="block text-sm font-medium mb-1">الفترة الزمنية (اختياري)</label>
                            <select
                                value={formData.reciter_phase_id}
                                onChange={(e) => setFormData({ ...formData, reciter_phase_id: e.target.value })}
                                className="w-full p-2 border rounded dark:bg-slate-700"
                            >
                                <option value="">بدون تحديد</option>
                                {phases.map(p => <option key={p.id} value={p.id}>{p.phase_name_ar}</option>)}
                            </select>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium mb-1">القسم *</label>

                        <select
                            required
                            value={formData.section_id}
                            onChange={(e) => setFormData({ ...formData, section_id: e.target.value })}
                            className="w-full p-2 border rounded dark:bg-slate-700"
                        >
                            <option value="">اختر القسم...</option>
                            {sections.map(s => <option key={s.id} value={s.id}>{s.name_ar}</option>)}
                        </select>
                    </div>
                </div>

                {/* Quran Content (Multi-Segment) */}
                {contentType === 'quran' && (
                    <div className="space-y-4">



                        <div className="flex justify-between items-center border-b pb-2">
                            <h3 className="font-bold text-slate-900 dark:text-white">المحتوى القرآني</h3>
                            <button
                                type="button"
                                onClick={addSegment}
                                className="text-xs bg-emerald-100 hover:bg-emerald-200 text-emerald-800 px-3 py-1 rounded-full font-bold transition-colors"
                            >
                                + إضافة مقطع
                            </button>
                        </div>

                        <div className="space-y-6">
                            {segments.map((seg, idx) => {
                                const currentSurah = SURAHS.find(s => s.number === seg.surah) || SURAHS[0];
                                const ayahOptions = getAyahOptions(currentSurah.ayahCount);

                                return (
                                    <div key={idx} className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-700 relative group">
                                        {segments.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => removeSegment(idx)}
                                                className="absolute top-2 left-2 text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 p-1.5 rounded-full transition-colors z-10"
                                                title="حذف المقطع"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M18 6 6 18" /><path d="m6 6 12 12" />
                                                </svg>
                                            </button>
                                        )}

                                        <div className="space-y-3">
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">السورة</label>
                                                <select
                                                    required
                                                    value={seg.surah}
                                                    onChange={(e) => updateSegment(idx, 'surah', parseInt(e.target.value))}
                                                    className="w-full p-2 border rounded dark:bg-slate-700 font-sans text-sm"
                                                >
                                                    {SURAHS.map(s => (
                                                        <option key={s.number} value={s.number}>
                                                            {s.number}. {s.name} ({s.ayahCount} آية)
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div className="flex gap-3">
                                                <div className="flex-1">
                                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">من آية</label>
                                                    <select
                                                        required
                                                        value={seg.start}
                                                        onChange={(e) => updateSegment(idx, 'start', parseInt(e.target.value))}
                                                        className="w-full p-2 border rounded dark:bg-slate-700 text-sm"
                                                    >
                                                        {ayahOptions.map(n => (
                                                            <option key={n} value={n}>{n}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className="flex-1">
                                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">إلى آية</label>
                                                    <select
                                                        required
                                                        value={seg.end}
                                                        onChange={(e) => updateSegment(idx, 'end', parseInt(e.target.value))}
                                                        className="w-full p-2 border rounded dark:bg-slate-700 text-sm"
                                                    >
                                                        {ayahOptions.filter(n => n >= seg.start).map(n => (
                                                            <option key={n} value={n}>{n}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            <div className="border-t pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Metadata */}
                <div className="space-y-4">
                    <h3 className="font-bold text-slate-900 dark:text-white border-b pb-2">البيانات التوثيقية</h3>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">المدينة (المكان)</label>
                            <input type="text" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} className="w-full p-2 border rounded dark:bg-slate-700" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">الفترة الزمنية (السنة الميلادية)</label>
                            <input
                                type="text"
                                value={formData.time_period}
                                onChange={(e) => setFormData({ ...formData, time_period: e.target.value })}
                                className="w-full p-2 border rounded dark:bg-slate-700"
                                placeholder="مثال: 1985"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">المدة (ثانية)</label>
                        <input type="number" value={formData.duration_seconds} onChange={(e) => setFormData({ ...formData, duration_seconds: parseInt(e.target.value) || 0 })} className="w-full p-2 border rounded dark:bg-slate-700" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">التصنيف (الندرة)</label>
                            <select value={formData.rarity_classification} onChange={(e) => setFormData({ ...formData, rarity_classification: e.target.value })} className="w-full p-2 border rounded dark:bg-slate-700">
                                <option value="common">منتشر (Common)</option>
                                <option value="less_common">قليل الانتشار</option>
                                <option value="rare">نادر</option>
                                <option value="very_rare">نادر جداً</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">الموثوقية (Reliability)</label>
                            <select value={formData.reliability_level} onChange={(e) => setFormData({ ...formData, reliability_level: e.target.value })} className="w-full p-2 border rounded dark:bg-slate-700">
                                <option value="verified">موثوق (Verified)</option>
                                <option value="unverified">غير موثوق (Unverified)</option>
                                <option value="rare">نادر (Rare)</option>
                                <option value="very_rare">نادر جداً (Very Rare)</option>
                            </select>
                        </div>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-700/30 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                        <label className="block text-sm font-medium mb-1">الاسم الكامل للتلاوة (اختياري)</label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            className="w-full p-2 border rounded dark:bg-slate-700 placeholder-slate-400 text-sm"
                            placeholder="مثال: حفص عن عاصم - سورة الفاتحة (يترك فارغاً لاستخدام الاسم الافتراضي)"
                        />
                        <p className="text-xs text-slate-500 mt-1">
                            يظهر هذا الاسم بدلاً من (سورة + رقم)، مع عرض التفاصيل الأصلية كعنوان فرعي.
                        </p>
                    </div>
                </div>

                {/* Source & File */}
                <div className="space-y-4">
                    <h3 className="font-bold text-slate-900 dark:text-white border-b pb-2">المصدر والملف</h3>

                    <div>
                        <label className="block text-sm font-medium mb-1">Archival ID (اختياري)</label>
                        <input type="text" value={formData.archival_id} onChange={(e) => setFormData({ ...formData, archival_id: e.target.value })} className="w-full p-2 border rounded dark:bg-slate-700" placeholder="e.g. MIN-MUR-001..." />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">وصف المصدر</label>
                        <input type="text" value={formData.source_description} onChange={(e) => setFormData({ ...formData, source_description: e.target.value })} className="w-full p-2 border rounded dark:bg-slate-700" placeholder="e.g. Archive.org item X" />
                    </div>

                    <div className="space-y-4">
                        <label className="block text-sm font-medium text-emerald-700 dark:text-emerald-400">الملف الصوتي</label>

                        <div className="grid grid-cols-1 gap-4">
                            <div className="p-4 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900/50">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">رفع من الجهاز</label>
                                <input
                                    type="file"
                                    accept="audio/*"
                                    onChange={handleAudioUpload}
                                    disabled={uploading}
                                    className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                                />
                                {uploading && <p className="text-xs text-blue-500 mt-2 animate-pulse">جاري الرفع...</p>}
                            </div>

                            <div className="p-4 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900/50">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">رابط مباشر (URL)</label>
                                <div className="flex gap-2">
                                    <input
                                        type="url" dir="ltr"
                                        value={formData.archive_url}
                                        onChange={(e) => setFormData({ ...formData, archive_url: e.target.value })}
                                        className="w-full p-2 border rounded dark:bg-slate-700 text-sm"
                                        placeholder="https://archive.org/download/..."
                                    />
                                    <button
                                        type="button"
                                        onClick={fetchArchiveMetadata}
                                        disabled={!formData.archive_url || loading}
                                        className="whitespace-nowrap px-3 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 rounded text-sm transition-colors text-slate-700 dark:text-slate-200"
                                        title="جلب البيانات الوصفية تلقائياً"
                                    >
                                        🔍 جلب البيانات
                                    </button>
                                </div>
                            </div>
                        </div>

                        {formData.archive_url && (
                            <div className="text-xs p-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded border border-emerald-100 dark:border-emerald-800 break-all font-mono">
                                🔗 {formData.archive_url}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-6 pt-4">
                <label className={`flex items-center gap-2 ${!isFormValid ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                    <input
                        type="checkbox"
                        checked={formData.is_published}
                        onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                        disabled={!isFormValid}
                        className="w-5 h-5 text-emerald-600 rounded"
                    />
                    <div>
                        <span className="font-bold block">نشر التسجيل (Publish)</span>
                        {!isFormValid && (
                            <span className="text-xs text-red-500 block">لا يمكن النشر قبل استكمال البيانات الأساسية</span>
                        )}
                    </div>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={formData.is_featured} onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })} className="w-5 h-5 text-emerald-600 rounded" />
                    <span>مميز (Featured)</span>
                </label>

                <div className="flex-1"></div>

                <button type="submit" disabled={loading} className="px-8 py-3 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 disabled:opacity-50">
                    {loading ? "جاري الحفظ..." : "حفظ التسجيل"}
                </button>
            </div>

        </form>
    );
}

"use client";

import { useState, useEffect, useMemo } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { validateAyahRange, checkDuplicateCoverage, validateRecordingMetadata, type SoftValidationWarning } from "@/lib/quran/validator";
import { uploadFile, getPresignedUploadUrl } from "@/app/actions/storage";
import { SURAHS } from "@/lib/quran/metadata";
import { useAutocomplete, useNestedAutocomplete } from "@/hooks/useAutocomplete";

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
        reciter_phase_id: initialData?.reciter_phase_id || "",
        surah_number: initialData?.surah_number || 1,
        ayah_start: initialData?.ayah_start || 1,
        ayah_end: initialData?.ayah_end || 1,
        city: initialData?.city || "",
        duration_seconds: initialData?.duration_seconds || 0,
        source_description: initialData?.source_description || "",
        quality_level: initialData?.quality_level || "",
        reliability_level: initialData?.reliability_level || "verified",
        rarity_classification: initialData?.rarity_classification || "common",
        is_published: initialData?.is_published || false,
        is_featured: initialData?.is_featured || false,
        archive_url: initialData?.archive_url || "",

        // الحقول الجديدة
        venue: initialData?.venue || "",
        publisher: initialData?.publisher || "",
        recording_details: initialData?.recording_details || "",

        // حقول التاريخ المنفصلة
        time_period: initialData?.recording_date?.time_period || "",
        recording_year: initialData?.recording_date?.year || null,
        recording_month: initialData?.recording_date?.month || null,
        recording_day: initialData?.recording_date?.day || null,
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

    // Autocomplete hooks لجميع الحقول النصية
    const venueSuggestions = useAutocomplete('venue');
    const citySuggestions = useAutocomplete('city');
    const publisherSuggestions = useAutocomplete('publisher');
    const sourceSuggestions = useAutocomplete('source_description');
    const timePeriodSuggestions = useNestedAutocomplete('recording_date', 'time_period');

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

        // 1. استخراج البيانات الوصفية الشاملة (Comprehensive Metadata Extraction)
        try {
            const musicMetadata = await import("music-metadata-browser");
            const metadata = await musicMetadata.parseBlob(file);

            const updates: any = {};

            // الأساسيات
            const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
            updates.title = metadata.common.title || nameWithoutExt;

            if (metadata.format.duration) {
                updates.duration_seconds = Math.round(metadata.format.duration);
            }

            // استخراج التاريخ من metadata
            if (metadata.common.year) {
                updates.recording_year = metadata.common.year;
                updates.time_period = String(metadata.common.year);
            }

            // محاولة استخراج تاريخ كامل من حقل date
            if (metadata.common.date) {
                const dateStr = String(metadata.common.date);
                const match = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
                if (match) {
                    updates.recording_year = parseInt(match[1]);
                    updates.recording_month = parseInt(match[2]);
                    updates.recording_day = parseInt(match[3]);
                }
            }

            // الحقول الجديدة - استخراج من metadata إذا كانت متوفرة
            if (metadata.common.comment && !formData.venue) {
                updates.venue = metadata.common.comment;
            }

            // publisher قد لا يكون موجوداً في النوع الأساسي، نستخدم any
            const metadataAny = metadata.common as any;
            if (metadataAny.publisher && !formData.publisher) {
                updates.publisher = metadataAny.publisher;
            }

            if (metadata.common.albumartist && !formData.city) {
                updates.city = metadata.common.albumartist;
            }

            // تفاصيل التلاوة - دمج description و lyrics
            const detailsParts: string[] = [];
            if (metadata.common.description && typeof metadata.common.description === 'string') {
                detailsParts.push(metadata.common.description);
            }
            if (metadata.common.lyrics) {
                if (Array.isArray(metadata.common.lyrics)) {
                    detailsParts.push(metadata.common.lyrics.join('\n'));
                } else if (typeof metadata.common.lyrics === 'string') {
                    detailsParts.push(metadata.common.lyrics);
                }
            }
            if (detailsParts.length > 0 && !formData.recording_details) {
                updates.recording_details = detailsParts.join('\n\n');
            }

            // وصف المصدر
            if (metadata.common.album && !formData.source_description) {
                updates.source_description = metadata.common.album;
            } else if (metadata.common.copyright && !formData.source_description) {
                updates.source_description = metadata.common.copyright;
            } else if (metadata.common.artist && !formData.source_description) {
                updates.source_description = `تلاوة للشيخ ${metadata.common.artist}`;
            }

            if (Object.keys(updates).length > 0) {
                console.log('Extracted metadata:', updates);
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
            const mainSegment = segments[0];

            let payload: any = {
                archival_id: formData.archival_id?.trim(),
                title: formData.title?.trim(),
                reciter_id: formData.reciter_id,
                section_id: formData.section_id,
                reciter_phase_id: formData.reciter_phase_id || null,
                city: formData.city,
                recording_date: {
                    year: formData.recording_year,
                    month: formData.recording_month,
                    day: formData.recording_day,
                    time_period: formData.time_period || null
                },
                duration_seconds: parseInt(formData.duration_seconds.toString()),
                source_description: formData.source_description,
                quality_level: formData.quality_level,
                reliability_level: formData.reliability_level,
                rarity_classification: formData.rarity_classification,
                is_published: formData.is_published,
                is_featured: formData.is_featured,

                // \u0627\u0644\u062d\u0642\u0648\u0644 \u0627\u0644\u062c\u062f\u064a\u062f\u0629
                venue: formData.venue?.trim() || null,
                publisher: formData.publisher?.trim() || null,
                recording_details: formData.recording_details?.trim() || null,
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
                    // \u0627\u0644\u062d\u0642\u0648\u0644 \u0627\u0644\u062c\u062f\u064a\u062f\u0629 - \u064a\u062a\u0645 \u062d\u0641\u0638\u0647\u0627 \u0644\u0644\u0627\u0633\u062a\u062e\u062f\u0627\u0645 \u0641\u064a \u0627\u0644\u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u0642\u0627\u062f\u0645
                    venue: formData.venue,
                    publisher: formData.publisher,
                    // Note: title, surah, ayahs, url, duration, recording_details are intentionally excluded
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

            {/* 1. Grid: Two Columns Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

                {/* ═══════════════ RIGHT COLUMN: معلومات أساسية + تفاصيل التلاوة + التصنيف ═══════════════ */}
                <div className="space-y-6">

                    {/* أ) معلومات أساسية (القارئ - القسم) */}
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
                        <h3 className="font-bold text-slate-900 dark:text-white border-b pb-2">معلومات أساسية</h3>

                        <div className="grid grid-cols-1 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">القارئ *</label>
                                <select
                                    required
                                    value={formData.reciter_id}
                                    onChange={handleReciterChange}
                                    className="w-full p-2 border rounded dark:bg-slate-700 bg-white dark:border-slate-600"
                                >
                                    <option value="">اختر القارئ...</option>
                                    {reciters.map(r => <option key={r.id} value={r.id}>{r.name_ar}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">القسم *</label>
                                <select
                                    required
                                    value={formData.section_id}
                                    onChange={(e) => setFormData({ ...formData, section_id: e.target.value })}
                                    className="w-full p-2 border rounded dark:bg-slate-700 bg-white dark:border-slate-600"
                                >
                                    <option value="">اختر القسم...</option>
                                    {sections.map(s => <option key={s.id} value={s.id}>{s.name_ar}</option>)}
                                </select>
                            </div>

                            {phases.length > 0 && (
                                <div>
                                    <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">الفترة الزمنية للقارئ (اختياري)</label>
                                    <select
                                        value={formData.reciter_phase_id}
                                        onChange={(e) => setFormData({ ...formData, reciter_phase_id: e.target.value })}
                                        className="w-full p-2 border rounded dark:bg-slate-700 bg-white dark:border-slate-600"
                                    >
                                        <option value="">بدون تحديد</option>
                                        {phases.map(p => <option key={p.id} value={p.id}>{p.phase_name_ar}</option>)}
                                    </select>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ب) معلومات التلاوة (الدولة، المدينة، المكان، التواريخ، الناشر، التفاصيل) */}
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
                        <h3 className="font-bold text-slate-900 dark:text-white border-b pb-2">معلومات التلاوة</h3>

                        {/* الدولة - المدينة (صف واحد) */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">الدولة *</label>
                                <input
                                    type="text"
                                    list="city-suggestions"
                                    value={formData.city}
                                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                    className="w-full p-2 border rounded dark:bg-slate-700 bg-white dark:border-slate-600"
                                    placeholder="مثال: مصر"
                                    required
                                />
                                <datalist id="city-suggestions">
                                    {citySuggestions.map((s, i) => <option key={i} value={s} />)}
                                </datalist>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">المدينة</label>
                                <input
                                    type="text"
                                    placeholder="القاهرة"
                                    className="w-full p-2 border rounded dark:bg-slate-700 bg-white dark:border-slate-600"
                                />
                                <p className="text-xs text-slate-400 mt-1">اسم المدينة</p>
                            </div>
                        </div>

                        {/* المكان التفصيلي - الفترة الزمنية (صف واحد) */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">المكان التفصيلي</label>
                                <input
                                    type="text"
                                    list="venue-suggestions"
                                    value={formData.venue}
                                    onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                                    className="w-full p-2 border rounded dark:bg-slate-700 bg-white dark:border-slate-600"
                                    placeholder="مسجد الحسين"
                                />
                                <datalist id="venue-suggestions">
                                    {venueSuggestions.map((s, i) => <option key={i} value={s} />)}
                                </datalist>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">الفترة الزمنية</label>
                                <input
                                    type="text"
                                    list="time-period-suggestions"
                                    value={formData.time_period}
                                    onChange={(e) => setFormData({ ...formData, time_period: e.target.value })}
                                    className="w-full p-2 border rounded dark:bg-slate-700 bg-white dark:border-slate-600"
                                    placeholder="الخمسينيات"
                                />
                                <datalist id="time-period-suggestions">
                                    {timePeriodSuggestions.map((s, i) => <option key={i} value={s} />)}
                                </datalist>
                            </div>
                        </div>

                        {/* السنة - الشهر - اليوم (صف واحد) */}
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">السنة</label>
                                <input
                                    type="number"
                                    value={formData.recording_year || ""}
                                    onChange={(e) => setFormData({
                                        ...formData,
                                        recording_year: e.target.value ? parseInt(e.target.value) : null
                                    })}
                                    className="w-full p-2 border rounded dark:bg-slate-700 bg-white dark:border-slate-600"
                                    placeholder="1985"
                                    min="1900"
                                    max={new Date().getFullYear()}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">الشهر</label>
                                <select
                                    value={formData.recording_month || ""}
                                    onChange={(e) => setFormData({
                                        ...formData,
                                        recording_month: e.target.value ? parseInt(e.target.value) : null
                                    })}
                                    className="w-full p-2 border rounded dark:bg-slate-700 bg-white dark:border-slate-600"
                                >
                                    <option value="">-</option>
                                    <option value="1">يناير</option>
                                    <option value="2">فبراير</option>
                                    <option value="3">مارس</option>
                                    <option value="4">أبريل</option>
                                    <option value="5">مايو</option>
                                    <option value="6">يونيو</option>
                                    <option value="7">يوليو</option>
                                    <option value="8">أغسطس</option>
                                    <option value="9">سبتمبر</option>
                                    <option value="10">أكتوبر</option>
                                    <option value="11">نوفمبر</option>
                                    <option value="12">ديسمبر</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">اليوم</label>
                                <select
                                    value={formData.recording_day || ""}
                                    onChange={(e) => setFormData({
                                        ...formData,
                                        recording_day: e.target.value ? parseInt(e.target.value) : null
                                    })}
                                    className="w-full p-2 border rounded dark:bg-slate-700 bg-white dark:border-slate-600"
                                >
                                    <option value="">-</option>
                                    {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                                        <option key={d} value={d}>{d}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* الناشر (صف واحد) */}
                        <div>
                            <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">الناشر (إهداء من...)</label>
                            <input
                                type="text"
                                list="publisher-suggestions"
                                value={formData.publisher}
                                onChange={(e) => setFormData({ ...formData, publisher: e.target.value })}
                                className="w-full p-2 border rounded dark:bg-slate-700 bg-white dark:border-slate-600"
                                placeholder="مثال: جمعية المحافظة على القرآن الكريم"
                            />
                            <datalist id="publisher-suggestions">
                                {publisherSuggestions.map((s, i) => <option key={i} value={s} />)}
                            </datalist>
                        </div>

                        {/* تفاصيل التلاوة (صف واحد) */}
                        <div>
                            <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">تفاصيل التلاوة</label>
                            <textarea
                                value={formData.recording_details}
                                onChange={(e) => setFormData({ ...formData, recording_details: e.target.value })}
                                className="w-full p-2 border rounded dark:bg-slate-700 bg-white dark:border-slate-600"
                                placeholder="أدخل أي معلومات إضافية عن التلاوة..."
                                rows={2}
                            />
                        </div>

                        {/* التصنيف (الندرة) - الموثوقية - الجودة (صف واحد) */}
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">التصنيف (الندرة)</label>
                                <select
                                    value={formData.rarity_classification}
                                    onChange={(e) => setFormData({ ...formData, rarity_classification: e.target.value })}
                                    className="w-full p-2 border rounded dark:bg-slate-700 bg-white dark:border-slate-600"
                                >
                                    <option value="common">منتشر (Common)</option>
                                    <option value="less_common">قليل الانتشار</option>
                                    <option value="rare">نادر</option>
                                    <option value="very_rare">نادر جداً</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">الموثوقية</label>
                                <select
                                    value={formData.reliability_level}
                                    onChange={(e) => setFormData({ ...formData, reliability_level: e.target.value })}
                                    className="w-full p-2 border rounded dark:bg-slate-700 bg-white dark:border-slate-600"
                                >
                                    <option value="verified">موثوق (Verified)</option>
                                    <option value="unverified">غير موثوق</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">الجودة</label>
                                <select
                                    value={formData.quality_level}
                                    onChange={(e) => setFormData({ ...formData, quality_level: e.target.value })}
                                    className="w-full p-2 border rounded dark:bg-slate-700 bg-white dark:border-slate-600"
                                >
                                    <option value="">غير محدد</option>
                                    <option value="high">عالية</option>
                                    <option value="medium">متوسطة</option>
                                    <option value="low">منخفضة</option>
                                </select>
                            </div>
                        </div>

                        {/* Archive ID (صف واحد) */}
                        <div>
                            <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Archive ID</label>
                            <input
                                type="text"
                                value={formData.archival_id}
                                onChange={(e) => setFormData({ ...formData, archival_id: e.target.value })}
                                className="w-full p-2 border rounded dark:bg-slate-700 bg-white dark:border-slate-600 font-mono text-sm"
                                placeholder="e.g. MIN-MUR-001"
                            />
                        </div>

                        {/* المدة (hidden but needed for logic/validation if required) */}
                        <div>
                            <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">المدة (دقيقة)</label>
                            <input
                                type="number"
                                value={formData.duration_seconds ? Math.round(formData.duration_seconds / 60) : ""}
                                onChange={(e) => setFormData({
                                    ...formData,
                                    duration_seconds: e.target.value ? parseInt(e.target.value) * 60 : 0
                                })}
                                className="w-full p-2 border rounded dark:bg-slate-700 bg-white dark:border-slate-600"
                                placeholder="45"
                            />
                        </div>

                    </div>
                </div>

                {/* ═══════════════ LEFT COLUMN: الملف الصوتي + المحتوى ═══════════════ */}
                <div className="space-y-6">
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
                        <h3 className="font-bold text-slate-900 dark:text-white border-b pb-2">الملف الصوتي والمحتوى</h3>

                        {/* الرفع من الجهاز (صف أول) */}
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

                        {/* رابط مباشر (صف ثاني) */}
                        <div className="p-4 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900/50">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">رابط مباشر (URL)</label>
                            <div className="flex gap-2">
                                <input
                                    type="url" dir="ltr"
                                    value={formData.archive_url}
                                    onChange={(e) => setFormData({ ...formData, archive_url: e.target.value })}
                                    className="w-full p-2 border rounded dark:bg-slate-700 text-sm bg-white dark:border-slate-600"
                                    placeholder="https://archive.org/download/..."
                                    required={!formData.archive_url && !uploading /* Basic check logic */}
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
                            {formData.archive_url && (
                                <div className="text-xs p-2 mt-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded border border-emerald-100 dark:border-emerald-800 break-all font-mono">
                                    🔗 {formData.archive_url}
                                </div>
                            )}
                        </div>

                        {/* الاسم الكامل للتلاوة (صف ثالث) */}
                        <div className="bg-slate-50 dark:bg-slate-700/30 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                            <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">
                                الاسم الكامل للتلاوة
                                {contentType === 'general' && <span className="text-red-500 mr-1">*</span>}
                            </label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                required={contentType === 'general'}
                                className="w-full p-2 border rounded dark:bg-slate-700 bg-white dark:border-slate-600 placeholder-slate-400 text-sm"
                                placeholder="مثال: تلاوة سورة الفاتحة - حفص عن عاصم"
                            />
                            <p className="text-xs text-slate-500 mt-1">
                                {contentType === 'quran'
                                    ? 'يظهر هذا الاسم بدلاً من (سورة + رقم)، مع عرض التفاصيل الأصلية كعنوان فرعي.'
                                    : 'إلزامي للتسجيلات العامة.'}
                            </p>
                        </div>

                        <hr className="my-6 border-slate-200 dark:border-slate-700" />

                        {/* Content Type Selection (Moved to Left Column) */}
                        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="font-bold text-slate-900 dark:text-white text-sm">نوع المحتوى</h3>
                            </div>
                            <div className="flex bg-white dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
                                <button
                                    type="button"
                                    onClick={() => setContentType('quran')}
                                    className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all ${contentType === 'quran'
                                        ? 'bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 font-bold'
                                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                        }`}
                                >
                                    تلاوة قرآنية
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setContentType('general')}
                                    className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all ${contentType === 'general'
                                        ? 'bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 font-bold'
                                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                        }`}
                                >
                                    تسجيل عام
                                </button>
                            </div>
                        </div>

                        {/* المحتوى القرآني (Moved to Left Column) */}
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

                                <div className="space-y-4">
                                    {segments.map((seg, idx) => {
                                        const currentSurah = SURAHS.find(s => s.number === seg.surah) || SURAHS[0];
                                        const ayahOptions = getAyahOptions(currentSurah.ayahCount);

                                        return (
                                            <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-700 relative group">
                                                {/* Delete Segment */}
                                                {idx > 0 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => removeSegment(idx)}
                                                        className="absolute top-2 left-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full p-1.5 z-10 transition-colors"
                                                        title="حذف المقطع"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                        </svg>
                                                    </button>
                                                )}

                                                <div className="space-y-2">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-xs font-bold bg-emerald-500 text-white rounded-full w-5 h-5 flex items-center justify-center shrink-0">
                                                            {idx + 1}
                                                        </span>
                                                        <h4 className="font-bold text-slate-700 dark:text-slate-300 text-xs">مقطع {idx + 1}</h4>
                                                    </div>

                                                    {/* Surah Selection */}
                                                    <div>
                                                        <select
                                                            value={seg.surah}
                                                            onChange={(e) => updateSegment(idx, 'surah', parseInt(e.target.value))}
                                                            className="w-full p-2 border rounded dark:bg-slate-700 text-sm"
                                                        >
                                                            {SURAHS.map(s => <option key={s.number} value={s.number}>{s.name} ({s.number})</option>)}
                                                        </select>
                                                    </div>

                                                    {/* Ayah Range */}
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <div>
                                                            <label className="block text-xs text-slate-500 mb-0.5">من</label>
                                                            <select
                                                                value={seg.start}
                                                                onChange={(e) => updateSegment(idx, 'start', parseInt(e.target.value))}
                                                                className="w-full p-2 border rounded dark:bg-slate-700 text-sm"
                                                            >
                                                                {ayahOptions.map(n => <option key={n} value={n}>{n}</option>)}
                                                            </select>
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs text-slate-500 mb-0.5">إلى</label>
                                                            <select
                                                                value={seg.end}
                                                                onChange={(e) => updateSegment(idx, 'end', parseInt(e.target.value))}
                                                                className="w-full p-2 border rounded dark:bg-slate-700 text-sm"
                                                            >
                                                                {ayahOptions.map(n => <option key={n} value={n}>{n}</option>)}
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
                </div>

            </div>

            {/* ═══════════════ BOTTOM: وصف المصدر ═══════════════ */}
            <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <h3 className="font-bold text-slate-900 dark:text-white border-b pb-2 mb-4">بيانات المصدر الإضافية</h3>
                    <div>
                        <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">وصف المصدر (Source Description)</label>
                        <textarea
                            value={formData.source_description}
                            onChange={(e) => setFormData({ ...formData, source_description: e.target.value })}
                            className="w-full p-2 border rounded dark:bg-slate-700 bg-white dark:border-slate-600 h-24"
                            placeholder="e.g. Reference specific item from Archive.org or source collection details..."
                        />
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

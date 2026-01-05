"use server";

import { createClient } from "@/lib/supabase/server";

export type CompareParams = {
    surahNumber: number;
    ayahStart: number;
    ayahEnd: number;
};

export async function findRecordingsForAyah(params: CompareParams) {
    const supabase = await createClient();

    // Find all recordings that cover the requested ayah range
    // A recording covers the range if:
    // - Same surah
    // - ayah_start <= requested_start AND ayah_end >= requested_end

    const { data: recordings, error } = await supabase
        .from("recordings")
        .select(`
            *,
            reciters (id, name_ar, image_url),
            sections (name_ar, slug),
            media_files!inner (archive_url)
        `)
        .eq("is_published", true)
        .eq("surah_number", params.surahNumber)
        .lte("ayah_start", params.ayahEnd) // Recording starts before or at the requested end
        .gte("ayah_end", params.ayahStart) // Recording ends after or at the requested start
        .not("media_files.archive_url", "is", null)
        .eq("media_files.is_primary", true)
        .order("reciters(name_ar)");

    if (error) {
        console.error("Comparison search error:", error);
        throw new Error(error.message);
    }

    if (!recordings || recordings.length === 0) {
        console.warn("No recordings found for comparison:", params);
        return [];
    }

    // Extract archive_url and return
    const processedRecordings = recordings.map(rec => ({
        ...rec,
        archive_url: Array.isArray(rec.media_files) && rec.media_files.length > 0
            ? rec.media_files[0].archive_url
            : null
    })).filter(rec => rec.archive_url);

    console.log(`Found ${processedRecordings.length} recordings for comparison`);
    return processedRecordings;
}

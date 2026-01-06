import { supabase } from "./client";

export async function getReciter(id: string) {
    const { data, error } = await supabase
        .from("reciters")
        .select("*")
        .eq("id", id)
        .single();

    if (error || !data) {
        return null;
    }

    return data;
}

export async function getReciters() {
    const { data } = await supabase
        .from("reciters")
        .select("*")
        .order("name_ar");

    return data || [];
}

export async function getReciterPhases(reciterId: string) {
    const { data } = await supabase
        .from("reciter_phases")
        .select("*")
        .eq("reciter_id", reciterId)
        .order("display_order");

    return data || [];
}

export async function getSections() {
    const { data } = await supabase
        .from("sections")
        .select("*")
        .order("display_order");

    return data || [];
}

export async function getSection(slug: string) {
    const { data, error } = await supabase
        .from("sections")
        .select("*")
        .eq("slug", slug)
        .single();

    if (error || !data) {
        return null;
    }

    return data;
}

export async function getRecordingsBySectionCount(reciterId: string, sectionId: string) {
    const { count } = await supabase
        .from("recordings")
        .select("*", { count: "exact", head: true }) // optimized for count
        .eq("reciter_id", reciterId)
        .eq("section_id", sectionId)
        .eq("is_published", true);

    return count || 0;
}

export async function getRecordings(reciterId: string, sectionId: string, phaseId?: string) {
    let query = supabase
        .from("recordings")
        .select(`
            *,
            media_files (*),
            recording_coverage (*)
        `)
        .eq("reciter_id", reciterId)
        .eq("section_id", sectionId)
        .eq("is_published", true);

    if (phaseId) {
        query = query.eq("reciter_phase_id", phaseId);
    }

    const { data } = await query
        .order("surah_number", { ascending: true })
        .order("ayah_start", { ascending: true });

    return data || [];
}

export async function getReciterCities(reciterId: string) {
    const { data } = await supabase
        .from("recordings")
        .select(`
            city,
            id
        `)
        .eq("reciter_id", reciterId)
        .eq("is_published", true);

    if (!data) return [];

    // Group by city
    const cityMap = new Map<string, number>();
    data.forEach(rec => {
        const city = rec.city || "غير محدد";
        cityMap.set(city, (cityMap.get(city) || 0) + 1);
    });

    // Convert to array
    return Array.from(cityMap.entries()).map(([name, count]) => ({
        name,
        count
    })).sort((a, b) => b.count - a.count);
}

export async function getRecording(id: string) {
    const { data, error } = await supabase
        .from("recordings")
        .select(`
            *,
            reciter:reciters(*),
            section:sections(*),
            media_files(*),
            recording_coverage(*)
        `)
        .eq("id", id)
        .single();

    if (error || !data) {
        return null;
    }

    return data;
}

export async function getSimilarRecordings(recordingId: string, surahNumber: number, limit = 6) {
    // Logic: Find other recordings of the same Surah, excluding the current one.
    // Order by 'rarity' or 'views' (if we had specific view counts) or just random/latest.
    // For now, let's just get others from different reciters if possible, or same reciter if not.

    // We can't easily do "distinct reciter" in simple supabase query without RPC.
    // So we'll just fetch a batch and filter/display.

    const { data } = await supabase
        .from("recordings")
        .select(`
            *,
            reciter:reciters(id, name_ar, image_url),
            section:sections(name_ar),
            media_files(archive_url),
            recording_coverage(*)
        `)
        .eq("surah_number", surahNumber)
        .neq("id", recordingId)
        .eq("is_published", true)
        .order("created_at", { ascending: false })
        .limit(limit);

    return data || [];
}

export async function getReciterTimeline(reciterId: string) {
    const { data } = await supabase
        .from("recordings")
        .select(`
            id,
            title,
            surah_number,
            ayah_start,
            ayah_end,
            city,
            recording_date,
            created_at,
            section:sections(name_ar, slug),
            media_files(archive_url),
            recording_coverage(*),
            type,
            video_url,
            video_thumbnail
        `)
        .eq("reciter_id", reciterId)
        .eq("is_published", true)
        // We want to order by date.
        // Since recording_date is JSONB, we can't easily sort by it in simple PostgREST without a computed column.
        // For now, let's fetch all and sort in JS, or sort by created_at as fallback.
        // Ideally we'd have a 'year' column.
        // Let's rely on JS sorting for the timeline logic as dataset per reciter isn't huge (max 1000s).
        .limit(1000);

    return data || [];
}

export async function getReciterVideos(reciterId: string) {
    const { data } = await supabase
        .from("recordings")
        .select(`
            *,
            section:sections(name_ar),
            reciter:reciters(name_ar),
            recording_coverage(*)
        `)
        .eq("reciter_id", reciterId)
        .eq("is_published", true)
        .eq("type", 'video')
        .order("created_at", { ascending: false });

    return data || [];
}

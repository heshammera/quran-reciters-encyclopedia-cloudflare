"use server";

import { createClient } from "@/lib/supabase/server";
import { getSurahNumber, normalizeQuranText, SURAH_NAMES } from "@/lib/quran-helpers";

export type SearchResult = {
    type: "reciter" | "recording" | "ayah";
    id: string;
    title: string;
    subtitle?: string;
    url: string;
    src?: string; // Audio file URL for direct playback
    image_url?: string | null;
    meta?: any; // Extra metadata like surah/ayah number for logic
};

/**
 * Searches across reciters, recordings (by surah, ayah, city, title), and ayah text.
 */
export async function searchGlobal(query: string, limit: number = 5): Promise<SearchResult[]> {
    if (!query || query.trim().length < 2) return [];

    const supabase = await createClient();
    const cleanQuery = query.trim();
    const normalizedQuery = normalizeQuranText(cleanQuery);
    const searchTerm = `%${cleanQuery}%`;
    const normalizedSearchTerm = `%${normalizedQuery}%`;

    const results: SearchResult[] = [];

    // 1. Search Reciters
    const { data: reciters } = await supabase
        .from("reciters")
        .select("id, name_ar, image_url")
        .ilike("name_ar_normalized", normalizedSearchTerm)
        .limit(limit);

    if (reciters) {
        reciters.forEach(r => {
            results.push({
                type: "reciter",
                id: r.id,
                title: r.name_ar,
                subtitle: "قارئ",
                url: `/reciters/${r.id}`,
                image_url: r.image_url
            });
        });
    }

    // 2. Search by Surah Name
    const surahNumber = getSurahNumber(cleanQuery);

    if (surahNumber) {
        const { data: surahRecordings } = await supabase
            .from("recordings")
            .select(`
                id, 
                title,
                surah_number, 
                ayah_start,
                ayah_end,
                city, 
                recording_date, 
                reciter:reciters!inner(id, name_ar),
                section:sections(name_ar, slug),
                media_files(archive_url)
            `)
            .eq("is_published", true)
            .eq("surah_number", surahNumber)
            .limit(limit);

        if (surahRecordings) {
            surahRecordings.forEach((r: any) => {
                const name = r.title || (r.surah_number ? `سورة ${SURAH_NAMES[r.surah_number - 1]}${r.ayah_start ? ` (${r.ayah_start}-${r.ayah_end})` : ''}` : 'تسجيل عام');
                results.push({
                    type: "recording",
                    id: r.id,
                    title: name,
                    subtitle: `${r.reciter.name_ar} - ${r.city || r.recording_date?.year || 'تلاوة'}`,
                    url: `/recordings/${r.id}`,
                    src: r.media_files?.[0]?.archive_url,
                    image_url: null
                });
            });
        }
    }

    // 3. Search by Ayah Text
    if (normalizedQuery.length >= 3) {
        const { data: ayahMatches } = await supabase
            .from("quran_index")
            .select("surah_number, ayah_number, surah_name_ar")
            .ilike("text_normalized", normalizedSearchTerm)
            .limit(limit === 5 ? 3 : limit);

        if (ayahMatches && ayahMatches.length > 0) {
            for (const ayah of ayahMatches) {
                const { data: ayahRecordings } = await supabase
                    .from("recordings")
                    .select(`
                        id,
                        title,
                        surah_number,
                        ayah_start,
                        ayah_end,
                        reciter:reciters!inner(id, name_ar),
                        section:sections(name_ar, slug),
                        media_files(archive_url)
                    `)
                    .eq("is_published", true)
                    .eq("surah_number", ayah.surah_number)
                    .lte("ayah_start", ayah.ayah_number)
                    .gte("ayah_end", ayah.ayah_number)
                    .limit(2);

                if (ayahRecordings) {
                    ayahRecordings.forEach((r: any) => {
                        if (results.some(existing => existing.id === r.id)) return;
                        const name = r.title || (r.surah_number ? `سورة ${SURAH_NAMES[r.surah_number - 1]}` : 'تسجيل عام');

                        results.push({
                            type: "ayah",
                            id: r.id,
                            title: name,
                            subtitle: `القارئ ${r.reciter.name_ar} (الآية ${ayah.ayah_number})`,
                            url: `/recordings/${r.id}?t=${ayah.ayah_number}`,
                            src: r.media_files?.[0]?.archive_url,
                            image_url: null
                        });
                    });
                }
            }
        }
    }

    // 4. Search Recordings by Reciter Name (New)
    const { data: recordingsByReciter } = await supabase
        .from("recordings")
        .select(`
            id, 
            title,
            surah_number, 
            ayah_start,
            ayah_end,
            city, 
            recording_date, 
            reciter:reciters!inner(id, name_ar),
            section:sections(name_ar, slug),
            media_files(archive_url)
        `)
        .eq("is_published", true)
        .ilike("reciters.name_ar_normalized", normalizedSearchTerm)
        .limit(limit);

    if (recordingsByReciter) {
        recordingsByReciter.forEach((r: any) => {
            if (results.some(existing => existing.id === r.id)) return;
            const name = r.title || (r.surah_number ? `سورة ${SURAH_NAMES[r.surah_number - 1]}` : 'تسجيل عام');
            results.push({
                type: "recording",
                id: r.id,
                title: name,
                subtitle: `${r.reciter.name_ar} - ${r.city || r.recording_date?.year || 'تلاوة'}`,
                url: `/recordings/${r.id}`,
                src: r.media_files?.[0]?.archive_url,
                image_url: null
            });
        });
    }

    // 5. Search by Surah Number (numeric query)
    const isNumeric = /^\d+$/.test(cleanQuery);
    if (isNumeric) {
        const surahNum = parseInt(cleanQuery);
        if (surahNum >= 1 && surahNum <= 114) {
            const { data: numericRecordings } = await supabase
                .from("recordings")
                .select(`
                    id, 
                    title,
                    surah_number, 
                    city, 
                    recording_date, 
                    reciter:reciters!inner(id, name_ar),
                    section:sections(name_ar, slug),
                    media_files(archive_url)
                `)
                .eq("is_published", true)
                .eq("surah_number", surahNum)
                .limit(limit);

            if (numericRecordings) {
                numericRecordings.forEach((r: any) => {
                    if (results.some(existing => existing.id === r.id)) return;
                    const name = r.title || (r.surah_number ? `سورة ${SURAH_NAMES[r.surah_number - 1]}` : 'تسجيل عام');
                    results.push({
                        type: "recording",
                        id: r.id,
                        title: name,
                        subtitle: `${r.reciter.name_ar} - ${r.city || r.recording_date?.year || 'تلاوة'}`,
                        url: `/recordings/${r.id}`,
                        src: r.media_files?.[0]?.archive_url,
                        image_url: null
                    });
                });
            }
        }
    }

    // 6. Search by Title
    const { data: titleRecordings } = await supabase
        .from("recordings")
        .select(`
            id, 
            title,
            surah_number, 
            reciter:reciters!inner(id, name_ar),
            section:sections(name_ar, slug),
            media_files(archive_url)
        `)
        .eq("is_published", true)
        .ilike("title_normalized", normalizedSearchTerm)
        .limit(limit);

    if (titleRecordings) {
        titleRecordings.forEach((r: any) => {
            if (results.some(existing => existing.id === r.id)) return;
            const name = r.title || (r.surah_number ? `سورة ${SURAH_NAMES[r.surah_number - 1]}` : 'تسجيل عام');
            results.push({
                type: "recording",
                id: r.id,
                title: name,
                subtitle: `${r.reciter.name_ar}`,
                url: `/recordings/${r.id}`,
                src: r.media_files?.[0]?.archive_url,
                image_url: null
            });
        });
    }

    // 7. Search by City
    if (!isNumeric) {
        const { data: cityRecordings } = await supabase
            .from("recordings")
            .select(`
                id, 
                title,
                surah_number, 
                city, 
                recording_date, 
                reciter:reciters!inner(id, name_ar),
                section:sections(name_ar, slug),
                media_files(archive_url)
            `)
            .eq("is_published", true)
            .ilike("city_normalized", normalizedSearchTerm)
            .limit(limit);

        if (cityRecordings) {
            cityRecordings.forEach((r: any) => {
                if (results.some(existing => existing.id === r.id)) return;
                const name = r.title || (r.surah_number ? `سورة ${SURAH_NAMES[r.surah_number - 1]}` : 'تسجيل عام');
                results.push({
                    type: "recording",
                    id: r.id,
                    title: name,
                    subtitle: `${r.reciter.name_ar} - ${r.city || r.recording_date?.year || 'تلاوة'}`,
                    url: `/recordings/${r.id}`,
                    src: r.media_files?.[0]?.archive_url,
                    image_url: null
                });
            });
        }
    }
    const uniqueResults = results.filter((result, index, self) =>
        index === self.findIndex((r) => r.id === result.id && r.type === result.type)
    );

    return uniqueResults;
}

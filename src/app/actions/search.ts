"use server";

import { createClient } from "@/lib/supabase/server";

export type SearchResult = {
    type: "reciter" | "recording" | "ayah";
    id: string;
    title: string;
    subtitle?: string;
    url: string;
    image_url?: string | null;
    meta?: any; // Extra metadata like surah/ayah number for logic
};

export async function searchGlobal(query: string): Promise<SearchResult[]> {
    if (!query || query.trim().length < 2) return [];

    const supabase = await createClient();
    const searchTerm = `%${query.trim()}%`;
    const results: SearchResult[] = [];

    // 1. Search Reciters
    const { data: reciters } = await supabase
        .from("reciters")
        .select("id, name_ar, image_url")
        .ilike("name_ar", searchTerm)
        .limit(5);

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
    const { getSurahNumber } = await import("@/lib/quran-helpers");
    const surahNumber = getSurahNumber(query.trim());

    if (surahNumber) {
        const { data: surahRecordings } = await supabase
            .from("recordings")
            .select(`
                id, 
                title,
                surah_number, 
                city, 
                recording_date, 
                reciter:reciters!inner(id, name_ar),
                section:sections(name_ar, slug)
            `)
            .eq("is_published", true)
            .eq("surah_number", surahNumber)
            .limit(5);

        if (surahRecordings) {
            import("@/lib/quran-helpers").then(({ SURAH_NAMES }) => {
                surahRecordings.forEach((r: any) => {
                    const name = r.title || (r.surah_number ? `سورة ${SURAH_NAMES[r.surah_number - 1]}` : 'تسجيل عام');
                    results.push({
                        type: "recording",
                        id: r.id,
                        title: name,
                        subtitle: `${r.reciter.name_ar} - ${r.city || r.recording_date?.year || 'تلاوة'}`,
                        url: `/reciters/${r.reciter.id}/${r.section?.slug || 'all'}`,
                        image_url: null
                    });
                });
            });
        }
    }

    // 3. Search by Ayah Text
    const { normalizeQuranText } = await import("@/lib/quran-helpers");
    const normalizedQuery = normalizeQuranText(query.trim());

    if (normalizedQuery.length >= 3) {
        const { data: ayahMatches } = await supabase
            .from("quran_index")
            .select("surah_number, ayah_number, surah_name_ar")
            .ilike("text_normalized", `%${normalizedQuery}%`)
            .limit(3);

        if (ayahMatches && ayahMatches.length > 0) {
            // For each ayah match, find recordings that contain it
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
                        section:sections(name_ar, slug)
                    `)
                    .eq("is_published", true)
                    .eq("surah_number", ayah.surah_number)
                    .lte("ayah_start", ayah.ayah_number)
                    .gte("ayah_end", ayah.ayah_number)
                    .limit(2);

                if (ayahRecordings) {
                    import("@/lib/quran-helpers").then(({ SURAH_NAMES }) => {
                        ayahRecordings.forEach((r: any) => {
                            if (results.some(existing => existing.id === r.id)) return;
                            const name = r.title || (r.surah_number ? `سورة ${SURAH_NAMES[r.surah_number - 1]}` : 'تسجيل عام');

                            results.push({
                                type: "ayah",
                                id: r.id,
                                title: name,
                                subtitle: `القارئ ${r.reciter.name_ar} (الآية ${ayah.ayah_number})`,
                                url: `/reciters/${r.reciter.id}/${r.section?.slug || 'all'}?t=${ayah.ayah_number}`, // TODO: Deep linking
                                image_url: null
                            });
                        });
                    });
                }
            }
        }
    }

    // 4. Search by Surah Number (numeric query)
    const isNumeric = /^\d+$/.test(query.trim());
    if (isNumeric) {
        const surahNum = parseInt(query.trim());
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
                    section:sections(name_ar, slug)
                `)
                .eq("is_published", true)
                .eq("surah_number", surahNum)
                .limit(5);

            if (numericRecordings) {
                import("@/lib/quran-helpers").then(({ SURAH_NAMES }) => {
                    numericRecordings.forEach((r: any) => {
                        const name = r.title || (r.surah_number ? `سورة ${SURAH_NAMES[r.surah_number - 1]}` : 'تسجيل عام');
                        results.push({
                            type: "recording",
                            id: r.id,
                            title: name,
                            subtitle: `${r.reciter.name_ar} - ${r.city || r.recording_date?.year || 'تلاوة'}`,
                            url: `/reciters/${r.reciter.id}/${r.section?.slug || 'all'}`,
                            image_url: null
                        });
                    });
                });
            }
        }
    }

    // 5. Search by City (if not numeric)
    if (!isNumeric) {
        const { data: cityRecordings } = await supabase
            .from("recordings")
            .select(`
                id, 
                surah_number, 
                city, 
                recording_date, 
                reciter:reciters!inner(id, name_ar),
                section:sections(name_ar, slug)
            `)
            .eq("is_published", true)
            .ilike("city", searchTerm)
            .limit(5);

        if (cityRecordings) {
            cityRecordings.forEach((r: any) => {
                results.push({
                    type: "recording",
                    id: r.id,
                    title: `سورة ${r.surah_number}`,
                    subtitle: `${r.reciter.name_ar} - ${r.city || r.recording_date?.year || 'تلاوة'}`,
                    url: `/reciters/${r.reciter.id}/${r.section?.slug || 'all'}`,
                    image_url: null
                });
            });
        }
    }

    // Remove duplicates based on ID
    const uniqueResults = results.filter((result, index, self) =>
        index === self.findIndex((r) => r.id === result.id && r.type === result.type)
    );

    return uniqueResults;
}

// Basic Quran text normalization and helper functions

/**
 * Normalizes Arabic text by removing diacritics (Tashkeel) and unifying Alef forms.
 * Essential for searching Quran text where users type without Tashkeel.
 */
export function normalizeQuranText(text: string): string {
    if (!text) return "";

    let normalized = text;

    // Remove Tashkeel (Diacritics)
    normalized = normalized.replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED]/g, '');

    // Unify Alef forms (أ, إ, آ -> ا)
    normalized = normalized.replace(/[أإآ]/g, 'ا');

    // Unify Taa Marbuta (ة -> ه)
    normalized = normalized.replace(/ة/g, 'ه');
    // Keeping Taa Marbuta distinct for Quran usually better, but for loose search maybe unify.
    // Let's keep it distinct for now or handle it in the database query with loose matching.

    // Unify Ya (ى -> ي)
    normalized = normalized.replace(/ى/g, 'ي');

    return normalized;
}

export const SURAH_NAMES = [
    "الفاتحة", "البقرة", "آل عمران", "النساء", "المائدة", "الأنعام", "الأعراف", "الأنفال", "التوبة", "يونس",
    "هود", "يوسف", "الرعد", "إبراهيم", "الحجر", "النحل", "الإسراء", "الكهف", "مريم", "طه",
    "الأنبياء", "الحج", "المؤمنون", "النور", "الفرقان", "الشعراء", "النمل", "القصص", "العنكبوت", "الروم",
    "لقمان", "السجدة", "الأحزاب", "سبأ", "فاطر", "يس", "الصافات", "ص", "الزمر", "غافر",
    "فصلت", "الشورى", "الزخرف", "الدخان", "الجاثية", "الأحقاف", "محمد", "الفتح", "الحجرات", "ق",
    "الذاريات", "الطور", "النجم", "القمر", "الرحمن", "الواقعة", "الحديد", "المجادلة", "الحشر", "الممتحنة",
    "الصف", "الجمعة", "المنافقون", "التغابن", "الطلاق", "التحريم", "الملك", "القلم", "الحاقة", "المعارج",
    "نوح", "الجن", "المزمل", "المدثر", "القيامة", "الإنسان", "المرسلات", "النبأ", "النازعات", "عبس",
    "التكوير", "الإنفطار", "المطففين", "الانشقاق", "البروج", "الطارق", "الأعلى", "الغاشية", "الفجر", "البلد",
    "الشمس", "الليل", "الضحى", "الشرح", "التين", "العلق", "القدر", "البينة", "الزلزلة", "العاديات",
    "القارعة", "التكاثر", "العصر", "الهمزة", "الفيل", "قريش", "الماعون", "الكوثر", "الكافرون", "النصر",
    "المسد", "الإخلاص", "الفلق", "الناس"
];

export function getSurahName(number: number): string {
    if (number < 1 || number > 114) return "";
    return SURAH_NAMES[number - 1];
}

/**
 * Search for a surah number by name (supports partial matching)
 * Returns the surah number if found, otherwise null
 */
export function getSurahNumber(query: string): number | null {
    if (!query || query.trim().length === 0) return null;

    // Clean the query: remove "سورة" or "سوره" prefix
    let cleanQuery = query.trim().replace(/^(سورة|سوره)\s+/, "");

    // Normalize the search query
    const normalizedQuery = normalizeQuranText(cleanQuery.toLowerCase());

    // Search through surah names
    for (let i = 0; i < SURAH_NAMES.length; i++) {
        const surahName = SURAH_NAMES[i];
        const normalizedSurahName = normalizeQuranText(surahName.toLowerCase());

        // Check if the normalized surah name contains or is contained by the normalized query
        if (normalizedSurahName.includes(normalizedQuery) || normalizedQuery.includes(normalizedSurahName)) {
            return i + 1; // Surah numbers are 1-indexed
        }
    }

    return null;
}

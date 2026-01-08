
/**
 * Converts a Gregorian year to an approximate Hijri year.
 * Formula: (Gregorian - 622) * 33 / 32
 */
export function getHijriYear(gregorianYear: number): number {
    return Math.floor((gregorianYear - 622) * 33 / 32);
}

/**
 * Formats a given Gregorian year into a dual string with Hijri year.
 * Example: 2024 -> "2024 م / 1446 هـ"
 */
export function formatDualYear(year: number | string | undefined | null): string {
    if (!year) return "";

    const parsedYear = typeof year === 'string' ? parseInt(year) : year;
    if (isNaN(parsedYear) || parsedYear <= 0) return String(year); // Return as is if invalid

    const hijri = getHijriYear(parsedYear);
    return `${parsedYear} م / ${hijri} هـ`;
}

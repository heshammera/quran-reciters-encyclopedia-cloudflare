"use client";

import { useState, useMemo, useEffect } from "react";
import ReciterCard from "./ReciterCard";
import { cn } from "@/lib/utils";

type SortOption = "alphabetical" | "most_recordings" | "recently_added" | "most_popular";

interface ReciterWithStats {
    id: string;
    name_ar: string;
    image_url?: string | null;
    bio_short?: string;
    created_at?: string;
    recordings_count?: number;
}

interface RecitersGridProps {
    reciters: ReciterWithStats[];
}

export default function RecitersGrid({ reciters }: RecitersGridProps) {
    const [sortBy, setSortBy] = useState<SortOption>("alphabetical");
    const [showAll, setShowAll] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    // Detect if mobile on mount and window resize
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768); // md breakpoint
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Sort reciters based on selected filter
    const sortedReciters = useMemo(() => {
        const sorted = [...reciters];

        switch (sortBy) {
            case "alphabetical":
                return sorted.sort((a, b) => a.name_ar.localeCompare(b.name_ar, "ar"));

            case "most_recordings":
                return sorted.sort((a, b) =>
                    (b.recordings_count || 0) - (a.recordings_count || 0)
                );

            case "recently_added":
                return sorted.sort((a, b) => {
                    const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
                    const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
                    return dateB - dateA;
                });

            case "most_popular":
                // Combine recordings count as popularity metric
                return sorted.sort((a, b) =>
                    (b.recordings_count || 0) - (a.recordings_count || 0)
                );

            default:
                return sorted;
        }
    }, [reciters, sortBy]);

    // Show 4 on mobile, 7 on desktop
    const initialDisplayCount = isMobile ? 4 : 7;
    const displayedReciters = showAll ? sortedReciters : sortedReciters.slice(0, initialDisplayCount);
    const hasMore = sortedReciters.length > initialDisplayCount;

    const filters: { value: SortOption; label: string; labelShort: string; icon: string }[] = [
        { value: "alphabetical", label: "أبجدياً", labelShort: "أبجدياً", icon: "🔤" },
        { value: "most_recordings", label: "الأكثر تلاوات", labelShort: "الأكثر تلاوات", icon: "📚" },
        { value: "recently_added", label: "المضاف حديثاً", labelShort: "حديثاً", icon: "✨" },
        { value: "most_popular", label: "الأكثر شعبية", labelShort: "شعبية", icon: "🔥" },
    ];

    return (
        <div className="space-y-8">
            {/* Filter Buttons */}
            <div className="flex flex-wrap justify-center gap-2 md:gap-3">
                {filters.map((filter) => (
                    <button
                        key={filter.value}
                        onClick={() => setSortBy(filter.value)}
                        className={cn(
                            "px-3 md:px-5 py-2 md:py-2.5 rounded-xl font-bold text-xs md:text-sm transition-all duration-300 shadow-sm",
                            sortBy === filter.value
                                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-500/30 scale-105"
                                : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-600 dark:hover:text-emerald-400 border border-slate-200 dark:border-slate-700"
                        )}
                    >
                        <span className="mr-1.5">{filter.icon}</span>
                        <span className="hidden sm:inline">{filter.label}</span>
                        <span className="sm:hidden">{filter.labelShort}</span>
                    </button>
                ))}
            </div>

            {/* Reciters Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-4 md:gap-6">
                {displayedReciters.map((reciter) => (
                    <ReciterCard key={reciter.id} reciter={reciter} />
                ))}
            </div>

            {/* Show More Button */}
            {hasMore && (
                <div className="text-center pt-4">
                    <button
                        onClick={() => setShowAll(!showAll)}
                        className="group px-6 md:px-8 py-2.5 md:py-3 bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 font-bold text-sm md:text-base rounded-xl border-2 border-emerald-500 hover:bg-emerald-600 hover:text-white dark:hover:bg-emerald-600 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
                    >
                        <span className="flex items-center gap-2">
                            {showAll ? (
                                <>
                                    <span>عرض أقل</span>
                                    <svg className="w-4 h-4 md:w-5 md:h-5 transition-transform group-hover:-translate-y-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                    </svg>
                                </>
                            ) : (
                                <>
                                    <span>رؤية المزيد ({sortedReciters.length - initialDisplayCount} قارئ)</span>
                                    <svg className="w-4 h-4 md:w-5 md:h-5 transition-transform group-hover:translate-y-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </>
                            )}
                        </span>
                    </button>
                </div>
            )}
        </div>
    );
}

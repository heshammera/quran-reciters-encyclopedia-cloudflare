"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useLeanMode } from "@/context/LeanModeContext";

interface Section {
    id: string;
    name_ar: string;
    slug: string;
    description_ar?: string | null;
}

interface ExpandableSectionCardProps {
    section: Section;
    count: number;
    reciterId: string;
}

export default function ExpandableSectionCard({ section, count, reciterId }: ExpandableSectionCardProps) {
    const { isLean } = useLeanMode();
    const [isExpanded, setIsExpanded] = useState(false);
    const [showToggle, setShowToggle] = useState(false);
    const textRef = useRef<HTMLParagraphElement>(null);

    // Check if text exceeds 2 lines
    useEffect(() => {
        if (textRef.current) {
            // A rough check: if scrollHeight > clientHeight when clamped, it's overflowing.
            // However, line-clamp logic in JS is tricky. 
            // We can just enable the button if description length is > some char count as a heuristic,
            // OR checks scrollHeight.
            // Since we are using line-clamp-2, we can check if scrollHeight > lineHeight * 2.
            const lineHeight = parseFloat(getComputedStyle(textRef.current).lineHeight || "20");
            const height = textRef.current.scrollHeight;
            // 2.2 lines to be safe against slight rendering diffs
            if (height > lineHeight * 2.2) {
                setShowToggle(true);
            }
        }
    }, [section.description_ar]);

    return (
        <Link
            href={`/reciters/${reciterId}/${section.slug}`}
            className={`group block transition-all duration-300 ${isExpanded ? 'h-auto row-span-2' : 'h-full'}`}
        >
            <div className={`
                bg-white dark:bg-slate-800 rounded-xl shadow-lg hover:shadow-2xl 
                transition-all duration-300 p-6 border border-slate-200 dark:border-slate-700 
                hover:border-emerald-400 dark:hover:border-emerald-600 
                flex flex-col
                ${isExpanded ? 'h-auto z-10 relative' : 'h-full'}
            `}>
                <div className="flex-1">
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors mb-2">
                        {section.name_ar}
                    </h3>

                    {section.description_ar && (
                        <div className="relative">
                            <p
                                ref={textRef}
                                className={`text-slate-600 dark:text-slate-400 text-sm mb-2 transition-all duration-300 ${isExpanded ? '' : 'line-clamp-2'}`}
                                style={{ lineHeight: '1.5rem' }}
                            >
                                {section.description_ar}
                            </p>

                            {/* Heuristic fallback: always show toggle if text is long enough, just in case JS check fails or for server rendering ease */}
                            {(showToggle || section.description_ar.length > 100) && (
                                <button
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setIsExpanded(!isExpanded);
                                    }}
                                    className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline mt-1 focus:outline-none z-20 relative"
                                >
                                    {isExpanded ? 'إخفاء التفاصيل' : 'اقرأ المزيد'}
                                </button>
                            )}
                        </div>
                    )}
                </div>

                <div className={`flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 mt-4 border-t border-slate-100 dark:border-slate-700/50 pt-4 ${isExpanded ? 'mt-4' : 'mt-auto'}`}>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    <span>{count} تلاوة</span>
                </div>
            </div>
        </Link>
    );
}

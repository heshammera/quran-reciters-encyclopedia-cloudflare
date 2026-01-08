"use client";

import { useLeanMode } from "@/context/LeanModeContext";
import Link from "next/link";
import { formatDualYear } from "@/lib/date-utils";

interface ReciterProfileHeaderProps {
    reciter: {
        id: string;
        name_ar: string;
        image_url?: string | null;
        biography_ar?: string | null;
        birth_date?: string | null;
        death_date?: string | null;
    };
    stats?: { // Optional stats if available
        recordingsCount?: number;
    }
}

import { useState } from "react";

export default function ReciterProfileHeader({ reciter }: ReciterProfileHeaderProps) {
    const { isLean } = useLeanMode();
    const [isExpanded, setIsExpanded] = useState(false);

    if (isLean) {
        return (
            <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                <div className="container mx-auto px-4 py-8">
                    {/* Simple Header */}
                    <div className="flex items-start gap-4">
                        <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-400 shrink-0">
                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{reciter.name_ar}</h1>
                            <div className="text-sm text-slate-600 dark:text-slate-400 flex gap-4">
                                {(reciter.birth_date || reciter.death_date) && (
                                    <span>
                                        {reciter.birth_date && formatDualYear(new Date(reciter.birth_date).getFullYear())}
                                        {reciter.death_date && ` - ${formatDualYear(new Date(reciter.death_date).getFullYear())}`}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {reciter.biography_ar && (
                        <div className="mt-4">
                            <p className={`text-slate-600 dark:text-slate-300 leading-relaxed max-w-3xl text-sm ${!isExpanded ? 'line-clamp-2' : ''}`}>
                                {reciter.biography_ar}
                            </p>
                            <button
                                onClick={() => setIsExpanded(!isExpanded)}
                                className="mt-2 text-emerald-600 dark:text-emerald-400 font-medium hover:underline text-xs flex items-center gap-1"
                            >
                                {isExpanded ? (
                                    <>
                                        عرض أقل
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                        </svg>
                                    </>
                                ) : (
                                    <>
                                        اقرأ المزيد
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="relative bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
            {/* Gradient Background */}
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 opacity-50" />

            <div className="container mx-auto px-4 py-12 relative z-10">
                <div className="flex flex-col md:flex-row items-start gap-8">
                    {/* Image */}
                    <div className="relative w-32 h-32 md:w-48 md:h-48 shrink-0 rounded-2xl overflow-hidden shadow-2xl border-4 border-white dark:border-slate-800">
                        {reciter.image_url ? (
                            <img
                                src={reciter.image_url}
                                alt={reciter.name_ar}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                                <svg className="w-16 h-16 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                            </div>
                        )}
                    </div>

                    {/* Info */}
                    <div className="flex-1">
                        <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">
                            {reciter.name_ar}
                        </h1>

                        <div className="flex flex-wrap items-center gap-6 text-slate-600 dark:text-slate-400 mb-6">
                            {(reciter.birth_date || reciter.death_date) && (
                                <div className="flex items-center gap-2 bg-white/60 dark:bg-slate-800/60 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700">
                                    <span className="text-xl">📅</span>
                                    <span>
                                        {reciter.birth_date && formatDualYear(new Date(reciter.birth_date).getFullYear())}
                                        {reciter.death_date && ` - ${formatDualYear(new Date(reciter.death_date).getFullYear())}`}
                                    </span>
                                </div>
                            )}
                        </div>

                        {reciter.biography_ar && (
                            <div className="max-w-3xl">
                                <p className={`text-lg text-slate-700 dark:text-slate-300 leading-relaxed ${!isExpanded ? 'line-clamp-2' : ''}`}>
                                    {reciter.biography_ar}
                                </p>
                                <button
                                    onClick={() => setIsExpanded(!isExpanded)}
                                    className="mt-2 text-emerald-600 dark:text-emerald-400 font-medium hover:underline text-sm flex items-center gap-1"
                                >
                                    {isExpanded ? (
                                        <>
                                            عرض أقل
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                            </svg>
                                        </>
                                    ) : (
                                        <>
                                            اقرأ المزيد
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </>
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

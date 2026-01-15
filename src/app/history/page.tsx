"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getHistory, clearHistory, type HistoryEntry } from "@/lib/history-utils";
import { getSurahName } from "@/lib/quran-helpers";
import PlayButton from "@/components/player/PlayButton";
import { Track } from "@/types/player";

export default function HistoryPage() {
    const [history, setHistory] = useState<HistoryEntry[]>([]);

    useEffect(() => {
        setHistory(getHistory());
    }, []);

    const handleClear = () => {
        if (confirm("هل أنت متأكد من مسح سجل الاستماع بالكامل؟")) {
            clearHistory();
            setHistory([]);
        }
    };

    const formatDate = (timestamp: number) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (days === 0) return "اليوم";
        if (days === 1) return "أمس";
        if (days < 7) return `منذ ${days} أيام`;
        return date.toLocaleDateString('ar-EG');
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">سجل الاستماع</h1>
                {history.length > 0 && (
                    <button
                        onClick={handleClear}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm font-bold"
                    >
                        مسح السجل
                    </button>
                )}
            </div>

            {history.length === 0 ? (
                <div className="text-center py-20">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                        <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400">لا يوجد سجل استماع حتى الآن</p>
                    <p className="text-sm text-slate-400 dark:text-slate-500 mt-2">ابدأ بتشغيل تلاوة لإضافتها للسجل</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {history.map((entry, index) => {
                        const track: Track = {
                            id: entry.trackId,
                            title: entry.title,
                            reciterName: entry.reciterName,
                            src: entry.src || "", // Use actual src from history
                            surahNumber: entry.surahNumber
                        };

                        return (
                            <div
                                key={`${entry.trackId}-${entry.timestamp}`}
                                className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 hover:border-emerald-500 transition-colors"
                            >
                                <div className="flex items-center gap-4">
                                    <PlayButton track={track} contextTracks={[]} size="sm" />

                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-slate-900 dark:text-white mb-1">
                                            {entry.title}
                                        </h3>
                                        <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
                                            <span>{entry.reciterName}</span>
                                            {entry.surahNumber && (
                                                <>
                                                    <span>•</span>
                                                    <span>سورة {getSurahName(entry.surahNumber)}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    <div className="text-left text-sm text-slate-500 dark:text-slate-400">
                                        {formatDate(entry.timestamp)}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

"use client";

import Link from "next/link";
import { useLeanMode } from "@/context/LeanModeContext";
import { SURAHS } from "@/lib/quran/metadata";

export default function HomeRecordings({ featured, latest }: { featured: any[], latest: any[] }) {
    const { isLean } = useLeanMode();

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Rarities (2/3) */}
            <div className="lg:col-span-2 space-y-8">
                <h2 className={`font-bold text-slate-900 dark:text-white flex items-center gap-3 ${isLean ? 'text-xl' : 'text-2xl'}`}>
                    {!isLean && <span className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600">★</span>}
                    تلاوات نادرة ومميزة
                </h2>
                <div className={`grid grid-cols-1 ${isLean ? 'gap-2' : 'md:grid-cols-2 gap-4'}`}>
                    {featured?.map((recording: any) => (
                        <Link
                            key={recording.id}
                            href={`/recordings/${recording.id}`}
                            className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 transition-all group ${isLean ? 'p-3 rounded-lg shadow-sm' : 'p-5 rounded-xl hover:border-emerald-500 hover:shadow-md'}`}
                        >
                            <div className="flex items-center gap-4">
                                {!isLean && (
                                    <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xl shrink-0">
                                        📜
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <p className={`font-bold text-slate-900 dark:text-white transition-colors truncate ${isLean ? 'text-sm group-active:text-emerald-600' : 'group-hover:text-emerald-600'}`}>
                                        {recording.reciters?.name_ar}
                                    </p>
                                    <p className="text-xs text-slate-500 truncate">
                                        {recording.title || (recording.surah_number ? `سورة ${SURAHS.find(s => s.number === recording.surah_number)?.name}` : 'تسجيل عام')} {recording.city && `• ${recording.city}`}
                                    </p>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>

            {/* Latest Additions (1/3) */}
            <div className="space-y-8">
                <h2 className={`font-bold text-slate-900 dark:text-white flex items-center gap-3 ${isLean ? 'text-xl' : 'text-2xl'}`}>
                    {!isLean && <span className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600">🕒</span>}
                    أُضيف حديثاً
                </h2>
                <div className={isLean ? 'space-y-1' : 'space-y-3'}>
                    {latest?.map((recording: any) => (
                        <Link
                            key={recording.id}
                            href={`/recordings/${recording.id}`}
                            className={`flex items-center gap-3 transition-all duration-300 border ${isLean
                                ? 'p-2 bg-white dark:bg-slate-800 rounded-lg border-transparent shadow-sm'
                                : 'p-3 bg-white dark:bg-slate-900 rounded-xl border-slate-100 dark:border-slate-800 hover:border-emerald-500/50 hover:bg-emerald-50/30 dark:hover:bg-emerald-900/10 hover:shadow-sm group'
                                }`}
                        >
                            <div className={`rounded-full flex items-center justify-center shrink-0 font-bold ${isLean
                                ? 'w-8 h-8 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px]'
                                : 'w-10 h-10 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 text-xs'
                                }`}>
                                {recording.surah_number || "🔊"}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className={`font-bold text-slate-800 dark:text-slate-200 truncate ${isLean ? 'text-xs' : 'text-sm'}`}>
                                    {recording.reciters?.name_ar}
                                </p>
                                {!isLean && (
                                    <p className="text-xs text-slate-500 truncate">
                                        {recording.sections?.name_ar}
                                    </p>
                                )}
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}

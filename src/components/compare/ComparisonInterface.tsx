"use client";

import { useState, useEffect, useMemo } from "react";
import { findRecordingsForAyah } from "@/app/actions/compare";
import { usePlayer } from "@/hooks/usePlayer";
import { Track } from "@/types/player";
import { SURAHS } from "@/lib/quran/metadata";
import { cn } from "@/lib/utils";
import { getSurahName } from "@/lib/quran-helpers";

export default function ComparisonInterface() {
    const { state, playTrack } = usePlayer();
    const [loading, setLoading] = useState(false);
    const [recordings, setRecordings] = useState<any[]>([]);

    const [surahNumber, setSurahNumber] = useState(1);
    const [ayahStart, setAyahStart] = useState(1);
    const [ayahEnd, setAyahEnd] = useState(7); // Will be updated by effect
    const [surahSearch, setSurahSearch] = useState("");
    const [showSurahList, setShowSurahList] = useState(false);

    // Filter surahs based on search
    const filteredSurahs = useMemo(() => {
        if (!surahSearch) return SURAHS;
        return SURAHS.filter(s =>
            s.name.includes(surahSearch) ||
            s.number.toString().includes(surahSearch)
        );
    }, [surahSearch]);

    const currentSurah = useMemo(() =>
        SURAHS.find(s => s.number === surahNumber),
        [surahNumber]);

    const maxAyahs = currentSurah?.ayahCount || 286;

    // Set initial default ayahEnd to maxAyahs on first mount or surah change
    useEffect(() => {
        if (currentSurah) {
            setAyahStart(1);
            setAyahEnd(currentSurah.ayahCount);
        }
    }, [surahNumber]);

    // Auto-adjust ayah range if out of bounds (safety)
    useEffect(() => {
        if (ayahStart > maxAyahs) setAyahStart(1);
        if (ayahEnd > maxAyahs) setAyahEnd(maxAyahs);
        if (ayahStart > ayahEnd && ayahEnd !== 0) setAyahEnd(ayahStart);
    }, [maxAyahs]);

    // Auto-search whenever selection changes
    useEffect(() => {
        const timer = setTimeout(() => {
            handleSearch();
        }, 600);
        return () => clearTimeout(timer);
    }, [surahNumber, ayahStart, ayahEnd]);

    const handleSearch = async () => {
        setLoading(true);
        try {
            const results = await findRecordingsForAyah({
                surahNumber,
                ayahStart,
                ayahEnd
            });
            setRecordings(results);
        } catch (e: any) {
            console.error("Comparison error:", e);
        } finally {
            setLoading(false);
        }
    };

    const playRecording = (recording: any) => {
        playTrack({
            id: recording.id,
            title: recording.title || (recording.surah_number ? `سورة ${getSurahName(recording.surah_number)} (${recording.ayah_start}-${recording.ayah_end})` : 'تسجيل عام'),
            reciterName: recording.reciters?.name_ar || "Unknown",
            src: recording.archive_url,
            reciterId: recording.reciter_id,
        });
    };

    return (
        <div className="space-y-10 pb-20">
            {/* Main Selection Card */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-visible relative">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white rounded-t-3xl">
                    <h2 className="text-2xl font-bold flex items-center gap-3">
                        <span className="bg-white/20 p-2 rounded-xl backdrop-blur-sm">🎯</span>
                        تخصيص المقارنة
                    </h2>
                    <p className="mt-2 text-blue-100 opacity-90">اختر السورة والآيات التي تود سماعها بأصوات متعددة</p>
                </div>

                <div className="p-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {/* Surah Selector */}
                        <div className="relative">
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 mr-1">اسم السورة</label>
                            <div className="relative z-[100]">
                                <input
                                    type="text"
                                    placeholder={currentSurah?.name || "بحث عن سورة..."}
                                    className="w-full p-4 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-2xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all pr-12 font-bold"
                                    value={surahSearch}
                                    onChange={(e) => {
                                        setSurahSearch(e.target.value);
                                        setShowSurahList(true);
                                    }}
                                    onFocus={() => setShowSurahList(true)}
                                />
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                                    📖
                                </div>

                                {showSurahList && (
                                    <div className="fixed md:absolute top-auto md:top-full mt-2 left-4 right-4 md:left-0 md:right-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl z-[100] max-h-64 overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-2 duration-200">
                                        {filteredSurahs.length > 0 ? (
                                            filteredSurahs.map(s => (
                                                <button
                                                    key={s.number}
                                                    className={cn(
                                                        "w-full text-right px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center justify-between border-b border-slate-50 dark:border-slate-700/50 last:border-0",
                                                        surahNumber === s.number ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600" : ""
                                                    )}
                                                    onClick={() => {
                                                        setSurahNumber(s.number);
                                                        setSurahSearch("");
                                                        setShowSurahList(false);
                                                    }}
                                                >
                                                    <span className="font-bold text-lg">{s.name}</span>
                                                    <span className="bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded text-xs opacity-70">سورة {s.number}</span>
                                                </button>
                                            ))
                                        ) : (
                                            <div className="p-8 text-center text-slate-500">لا توجد نتائج</div>
                                        )}
                                    </div>
                                )}
                            </div>
                            {showSurahList && <div className="fixed inset-0 z-[90] bg-black/5" onClick={() => setShowSurahList(false)} />}
                        </div>

                        {/* Ayah Range */}
                        <div className="grid grid-cols-2 gap-4 col-span-1 md:col-span-2">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 mr-1">من آية</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        min={1}
                                        max={maxAyahs}
                                        value={ayahStart}
                                        onChange={(e) => setAyahStart(parseInt(e.target.value) || 1)}
                                        className="w-full p-4 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-2xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                                    />
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-xs opacity-50 underline decoration-blue-500">بداية</div>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 mr-1">إلى آية</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        min={ayahStart}
                                        max={maxAyahs}
                                        value={ayahEnd}
                                        onChange={(e) => setAyahEnd(parseInt(e.target.value) || ayahStart)}
                                        className="w-full p-4 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-2xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                                    />
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-xs opacity-50 underline decoration-indigo-500">نهاية</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Results Section */}
            <div>
                <div className="flex items-center justify-between mb-6 px-4">
                    <div className="flex items-center gap-3">
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white">التسجيلات المتوفرة</h3>
                        {loading && <div className="w-5 h-5 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />}
                    </div>
                    {recordings.length > 0 && (
                        <div className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-4 py-1.5 rounded-full text-sm font-bold">
                            تم العثور على {recordings.length} قارئ
                        </div>
                    )}
                </div>

                {recordings.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {recordings.map((rec) => (
                            <div
                                key={rec.id}
                                className={cn(
                                    "group bg-white dark:bg-slate-800 rounded-2xl p-4 border-2 transition-all hover:shadow-lg flex items-center justify-between gap-4",
                                    state.currentTrack?.id === rec.id
                                        ? "border-emerald-500 shadow-md ring-4 ring-emerald-500/5"
                                        : "border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                                )}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-700 shrink-0 border-2 border-white dark:border-slate-800 shadow-sm transition-transform group-hover:scale-105">
                                        {rec.reciters?.image_url ? (
                                            <img
                                                src={rec.reciters.image_url}
                                                alt={rec.reciters.name_ar}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-2xl">🎙️</div>
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <h4 className="font-bold text-slate-900 dark:text-white truncate text-lg">{rec.reciters?.name_ar}</h4>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 truncate opacity-80">
                                            {rec.title || (rec.surah_number ? `سورة ${getSurahName(rec.surah_number)}` : (rec.sections?.name_ar || 'تلاوة'))} • {rec.city || 'غير محدد'}
                                        </p>
                                    </div>
                                </div>

                                <button
                                    onClick={() => playRecording(rec)}
                                    className={cn(
                                        "px-6 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 shrink-0 shadow-sm active:scale-95",
                                        state.currentTrack?.id === rec.id
                                            ? "bg-emerald-600 text-white"
                                            : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-white hover:bg-emerald-500 hover:text-white"
                                    )}
                                >
                                    {state.currentTrack?.id === rec.id ? (
                                        <><span>⏸️</span> يُشغَّل</>
                                    ) : (
                                        <><span>▶️</span> استمع</>
                                    )}
                                </button>
                            </div>
                        ))}
                    </div>
                ) : !loading && (
                    <div className="bg-slate-50 dark:bg-slate-900/50 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-16 text-center">
                        <div className="text-5xl mb-4 opacity-50">🔍</div>
                        <h4 className="text-xl font-bold text-slate-600 dark:text-slate-400">لا توجد نتائج لهذا النطاق</h4>
                        <p className="text-slate-400 mt-2">جرب اختيار آيات أخرى أو سورة مختلفة</p>
                    </div>
                )}
            </div>
        </div>
    );
}

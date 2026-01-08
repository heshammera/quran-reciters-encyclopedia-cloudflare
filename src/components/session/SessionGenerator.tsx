"use client";

import { useState, useEffect } from "react";
import { generateSession } from "@/app/actions/session";
import { usePlayer } from "@/hooks/usePlayer";
import { Track } from "@/types/player";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export default function SessionGenerator() {
    const { dispatch } = usePlayer(); // Fixed hook usage
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    // Filters
    const [reciters, setReciters] = useState<any[]>([]);
    const [selectedReciter, setSelectedReciter] = useState("");
    const [duration, setDuration] = useState(30); // Minutes

    useEffect(() => {
        const fetchReciters = async () => {
            try {
                const { data, error } = await supabase
                    .from("reciters")
                    .select("id, name_ar")
                    .order("name_ar");

                if (error) {
                    console.error("Error fetching reciters:", error);
                    return;
                }

                console.log("Reciters fetched:", data?.length || 0);
                if (data) setReciters(data);
            } catch (e) {
                console.error("Exception fetching reciters:", e);
            }
        };
        fetchReciters();
    }, []);

    const handleCreateSession = async () => {
        setLoading(true);
        try {
            const tracks = await generateSession({
                reciterId: selectedReciter || undefined,
                targetDurationMinutes: duration
            });

            if (tracks.length === 0) {
                alert("لم يتم العثور على تسجيلات مطابقة للشروط. تأكد من وجود تسجيلات منشورة بروابط صوتية صحيحة.");
                setLoading(false);
                return;
            }

            console.log("Session tracks retrieved:", tracks.length);

            // Convert to Track format and filter out invalid URLs
            const playerTracks: Track[] = tracks
                .filter((t: any) => {
                    const hasUrl = t.archive_url && t.archive_url.trim() !== "";
                    if (!hasUrl) {
                        console.warn("Skipping track without URL:", t);
                    }
                    return hasUrl;
                })
                .map((t: any) => ({
                    id: t.id,
                    title: t.sections?.name_ar || `سورة ${t.surah_number}`,
                    reciterName: t.reciters?.name_ar || "Unknown",
                    src: t.archive_url,
                    reciterId: t.reciter_id,
                    sectionSlug: t.sections?.slug
                }));

            if (playerTracks.length === 0) {
                alert("التسجيلات المتاحة لا تحتوي على روابط صوتية. يرجى إضافة روابط Archive.org للتسجيلات من لوحة التحكم.");
                setLoading(false);
                return;
            }

            console.log("Valid player tracks:", playerTracks.length, playerTracks);

            // Play first
            dispatch({ type: "PLAY_TRACK", payload: playerTracks[0] });

            // Set Queue (All tracks, including the first one so it's in the list)
            dispatch({ type: "SET_QUEUE", payload: playerTracks });

            // Provide feedback
            // alert(`تم إنشاء جلسة استماع: ${playerTracks.length} تلاوات (${Math.round(tracks.reduce((a:any,b:any)=>a+b.duration_seconds,0)/60)} دقيقة)`);

        } catch (e: any) {
            console.error("Session creation error:", e);
            alert("حدث خطأ: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-8">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                <span>🎧</span>
                جلسة استماع
            </h2>

            <div className="space-y-6">
                <div>
                    <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
                        اختر القارئ (اختياري)
                    </label>
                    <select
                        value={selectedReciter}
                        onChange={(e) => setSelectedReciter(e.target.value)}
                        className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                    >
                        <option value="">جميع القراء (منوعات)</option>
                        {reciters.map(r => (
                            <option key={r.id} value={r.id}>{r.name_ar}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
                        مدة الجلسة التقريبية
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                        {[30, 60, 90].map((m) => (
                            <button
                                key={m}
                                onClick={() => setDuration(m)}
                                className={`py-3 rounded-xl border font-bold transition-all ${duration === m
                                    ? "bg-emerald-600 text-white border-emerald-600 ring-2 ring-emerald-200 dark:ring-emerald-900"
                                    : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-emerald-400"
                                    }`}
                            >
                                {m} دقيقة
                            </button>
                        ))}
                    </div>
                </div>

                <div className="pt-4">
                    <button
                        onClick={handleCreateSession}
                        disabled={loading}
                        className="w-full py-4 bg-emerald-600 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-200 dark:shadow-none transition-all transform active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        style={{ color: 'white' }}
                    >
                        {loading ? (
                            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                <span>▶️</span>
                                <span className="text-white">ابدأ الاستماع</span>
                            </>
                        )}
                    </button>
                    <p className="text-center text-xs text-slate-400 mt-3">
                        سيقوم النظام باختيار تلاوات عشوائية تناسب ذوقك وتغطي المدة المحددة.
                    </p>
                </div>
            </div>
        </div>
    );
}

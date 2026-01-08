import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { SURAHS } from "@/lib/quran/metadata";
import LiveMonitor from "@/components/admin/LiveMonitor";

async function getStats() {
    const supabase = await createClient();

    const [recitersCount, recordingsCount, publishedCount, featuredCount] = await Promise.all([
        supabase.from("reciters").select("*", { count: "exact", head: true }),
        supabase.from("recordings").select("*", { count: "exact", head: true }),
        supabase.from("recordings").select("*", { count: "exact", head: true }).eq("is_published", true),
        supabase.from("recordings").select("*", { count: "exact", head: true }).eq("is_featured", true),
    ]);

    return {
        reciters: recitersCount.count || 0,
        totalRecordings: recordingsCount.count || 0,
        published: publishedCount.count || 0,
        featured: featuredCount.count || 0,
        unpublished: (recordingsCount.count || 0) - (publishedCount.count || 0),
    };
}

async function getRecentRecordings() {
    const supabase = await createClient();

    const { data } = await supabase
        .from("recordings")
        .select(`
      *,
      reciters (name_ar),
      sections (name_ar)
    `)
        .order("created_at", { ascending: false })
        .limit(5);

    return data || [];
}

export default async function AdminDashboard() {
    const stats = await getStats();
    const recent = await getRecentRecordings();

    return (
        <div className="space-y-8">
            {/* Page Header */}
            <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                    لوحة الإدارة
                </h1>
                <p className="text-slate-600 dark:text-slate-400">
                    إدارة موسوعة قرّاء القرآن
                </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-6 border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">القرّاء</p>
                            <p className="text-3xl font-bold text-slate-900 dark:text-white">{stats.reciters}</p>
                        </div>
                        <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
                            <svg className="w-6 h-6 text-emerald-600 dark:text-emerald-400" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                            </svg>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-6 border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">مجموع التسجيلات</p>
                            <p className="text-3xl font-bold text-slate-900 dark:text-white">{stats.totalRecordings}</p>
                        </div>
                        <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                            <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                            </svg>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-6 border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">منشور</p>
                            <p className="text-3xl font-bold text-green-600 dark:text-green-400">{stats.published}</p>
                        </div>
                        <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                            <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-6 border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">محجوب</p>
                            <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">{stats.unpublished}</p>
                        </div>
                        <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center">
                            <svg className="w-6 h-6 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow border border-slate-200 dark:border-slate-700 p-6">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">إجراءات سريعة</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Link
                        href="/admin/reciters/new"
                        className="flex items-center gap-3 p-4 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg hover:border-emerald-500 dark:hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 transition-colors group"
                    >
                        <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center group-hover:bg-emerald-600 transition-colors">
                            <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400 group-hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                        </div>
                        <div>
                            <p className="font-bold text-slate-900 dark:text-white">إضافة قارئ</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">قارئ جديد</p>
                        </div>
                    </Link>

                    <Link
                        href="/admin/recordings/new"
                        className="flex items-center gap-3 p-4 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors group"
                    >
                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center group-hover:bg-blue-600 transition-colors">
                            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 group-hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                        </div>
                        <div>
                            <p className="font-bold text-slate-900 dark:text-white">إضافة تسجيل</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">تلاوة جديدة</p>
                        </div>
                    </Link>

                    <Link
                        href="/admin/recordings?unpublished=true"
                        className="flex items-center gap-3 p-4 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg hover:border-amber-500 dark:hover:border-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/10 transition-colors group"
                    >
                        <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center group-hover:bg-amber-600 transition-colors">
                            <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 group-hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                        </div>
                        <div>
                            <p className="font-bold text-slate-900 dark:text-white">مراجعة محجوب</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">{stats.unpublished} تسجيل</p>
                        </div>
                    </Link>
                </div>
            </div>

            {/* Live Monitoring Section */}
            <div className="grid grid-cols-1 gap-8">
                <LiveMonitor />
            </div>

            {/* Quick Actions & Recent */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Quick Actions */}
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">إجراءات سريعة</h2>
                    <div className="space-y-4">
                        <Link href="/admin/recordings/new" className="block w-full text-center py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-colors">
                            + إضافة تسجيل جديد
                        </Link>
                        <Link href="/admin/reciters/new" className="block w-full text-center py-3 bg-white dark:bg-slate-700 border border-emerald-600 text-emerald-600 dark:text-emerald-400 dark:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-slate-600 font-bold rounded-lg transition-colors">
                            + إضافة قارئ جديد
                        </Link>
                        <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
                            <Link href="/admin/sections" className="flex items-center gap-2 text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 p-2 rounded hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                <span className="text-xl">📚</span> إدارة الأقسام
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Recent Activity */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">آخر الإضافات</h2>
                    <div className="space-y-3">
                        {recent?.length === 0 ? (
                            <p className="text-slate-500 text-center py-4">لا توجد إضافات حديثة</p>
                        ) : (
                            recent?.map((rec: any) => (
                                <div key={rec.id} className="group flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-600">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-xl shadow-sm ${rec.type === 'video'
                                            ? 'bg-red-100 dark:bg-red-900/30 text-red-600'
                                            : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600'
                                            }`}>
                                            {rec.type === 'video' ? '🎥' : '🎙️'}
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-900 dark:text-white text-sm mb-1">
                                                سورة {SURAHS.find(s => s.number === rec.surah_number)?.name || rec.surah_number}
                                            </p>
                                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-xs text-slate-500 dark:text-slate-400">
                                                <div className="flex items-center gap-1">
                                                    <span className="font-medium text-slate-700 dark:text-slate-300">
                                                        {rec.reciters?.name_ar}
                                                    </span>
                                                    <span>•</span>
                                                    <span>{rec.sections?.name_ar}</span>
                                                </div>

                                                {(rec.city || rec.recording_date?.year) && (
                                                    <div className="flex items-center gap-2 mt-1 sm:mt-0 text-slate-400">
                                                        <span className="hidden sm:inline">|</span>
                                                        {rec.recording_date?.year && (
                                                            <span className="flex items-center gap-1" title="سنة التلاوة">
                                                                📅 {rec.recording_date.year}
                                                            </span>
                                                        )}
                                                        {rec.city && (
                                                            <span className="flex items-center gap-1" title="مكان التلاوة">
                                                                📍 {rec.city}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                        {rec.is_published ? (
                                            <span className="text-[10px] sm:text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full font-medium">
                                                منشور
                                            </span>
                                        ) : (
                                            <span className="text-[10px] sm:text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full font-medium">
                                                محجوب
                                            </span>
                                        )}
                                        <span className="text-[10px] text-slate-400" title="تاريخ الإضافة">
                                            {new Date(rec.created_at).toLocaleDateString("ar-EG")}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                        <Link href="/admin/recordings" className="block text-center text-sm text-emerald-600 mt-4 hover:underline font-medium">
                            عرض كل التسجيلات
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}

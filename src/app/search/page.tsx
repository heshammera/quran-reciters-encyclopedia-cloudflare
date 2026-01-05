import { searchGlobal } from "@/app/actions/search";
import ReciterCard from "@/components/reciters/ReciterCard";
import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "نتائج البحث | موسوعة قرّاء القرآن",
    description: "نتائج البحث في موسوعة قرّاء القرآن الإلكترونية",
};

interface SearchPageProps {
    searchParams: Promise<{
        q: string;
    }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
    const { q } = await searchParams;
    const query = q || "";

    const results = await searchGlobal(query, 50);

    const reciterResults = results.filter(r => r.type === "reciter");
    const recordingResults = results.filter(r => r.type === "recording");
    const ayahResults = results.filter(r => r.type === "ayah");

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-20">
            {/* Header */}
            <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-40">
                <div className="container mx-auto px-4 py-4 flex items-center gap-4">
                    <Link href="/" className="font-bold text-lg text-emerald-800 dark:text-emerald-400 shrink-0 flex items-center gap-2">
                        <span>🏠</span>
                        <span className="hidden md:inline">الرئيسية</span>
                    </Link>
                    <div className="h-6 w-px bg-slate-300 dark:bg-slate-600"></div>
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                        نتائج البحث عن: <span className="text-emerald-600 dark:text-emerald-400">"{query}"</span>
                    </h1>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8">
                {results.length === 0 ? (
                    <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                        <div className="text-6xl mb-4">🔍</div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                            لم يتم العثور على نتائج
                        </h2>
                        <p className="text-slate-500 dark:text-slate-400">
                            حاول البحث بكلمات مختلفة أو تأكد من صحة الكلمة
                        </p>
                    </div>
                ) : (
                    <div className="space-y-12">
                        {/* Reciters Section */}
                        {reciterResults.length > 0 && (
                            <section>
                                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                                    <span className="text-xl">🎙️</span>
                                    القراء ({reciterResults.length})
                                </h2>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                                    {reciterResults.map(r => (
                                        <ReciterCard
                                            key={r.id}
                                            reciter={{
                                                id: r.id,
                                                name_ar: r.title,
                                                image_url: r.image_url
                                            }}
                                        />
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Ayah Results Section */}
                        {ayahResults.length > 0 && (
                            <section>
                                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                                    <span className="text-xl">📖</span>
                                    الآيات القرآنية ({ayahResults.length})
                                </h2>
                                <div className="space-y-4">
                                    {ayahResults.map(r => (
                                        <div key={r.id} className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
                                            <p className="text-xl font-serif text-slate-800 dark:text-slate-200 mb-4 leading-loose">
                                                {r.title}
                                            </p>
                                            <div className="flex items-center justify-between">
                                                <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                                                    {r.subtitle}
                                                </div>
                                                {/* In future, link to specific ayah audio or Tafsir */}
                                                <span className="text-xs text-slate-400 bg-slate-100 dark:bg-slate-900 px-2 py-1 rounded">
                                                    نص قرآني
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Recordings Section */}
                        {recordingResults.length > 0 && (
                            <section>
                                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                                    <span className="text-xl">📼</span>
                                    التلاوات ({recordingResults.length})
                                </h2>
                                <div className="bg-white dark:bg-slate-800 rounded-xl shadow border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700/50">
                                    {recordingResults.map(r => (
                                        <div key={r.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group flex items-center justify-between gap-4">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold shrink-0">
                                                        ▶
                                                    </div>
                                                    <div>
                                                        <h3 className="font-bold text-slate-900 dark:text-white truncate">
                                                            {r.title}
                                                        </h3>
                                                        <div className="text-sm text-slate-500 dark:text-slate-400">
                                                            {r.subtitle}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <Link
                                                href={r.url}
                                                className="px-4 py-2 text-sm bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-emerald-600 hover:text-white transition-colors"
                                            >
                                                الذهاب للتلاوة
                                            </Link>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}

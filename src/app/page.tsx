import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import SearchBar from "@/components/search/SearchBar";
import ReciterCard from "@/components/reciters/ReciterCard";
import HomeCollections from "@/components/home/HomeCollections";
import HomeRecordings from "@/components/home/HomeRecordings";
import { Database } from "@/types/database";

type Reciter = Database["public"]["Tables"]["reciters"]["Row"];

async function getReciters(): Promise<Reciter[] | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("reciters")
    .select("*")
    .order("name_ar");

  if (error) {
    console.error("Error fetching reciters:", error);
    return null;
  }

  return data || [];
}

async function getFeaturedRecordings() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("recordings")
    .select(`
      *,
      reciters (name_ar),
      sections (name_ar)
    `)
    .eq("is_featured", true)
    .eq("is_published", true)
    .order("created_at", { ascending: false })
    .limit(6);

  if (error) {
    console.error("Error fetching featured recordings:", error);
    return null;
  }

  return data || [];
}

async function getLatestRecordings() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("recordings")
    .select(`
      *,
      reciters (name_ar, image_url),
      sections (name_ar)
    `)
    .eq("is_published", true)
    .order("created_at", { ascending: false })
    .limit(8);

  if (error) {
    console.error("Error fetching latest recordings:", error);
    return null;
  }

  return data || [];
}

async function getFeaturedCollections() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("collections")
    .select("*")
    .eq("is_published", true)
    .eq("is_featured", true)
    .order("created_at", { ascending: false })
    .limit(3);

  if (error) {
    console.error("Error fetching featured collections:", error);
    return null;
  }

  return data || [];
}

async function getStats() {
  const supabase = await createClient();
  const { count: recitersCount } = await supabase.from("reciters").select("*", { count: "exact", head: true });
  const { count: recordingsCount } = await supabase.from("recordings").select("*", { count: "exact", head: true });
  const { data: cities } = await supabase.from("recordings").select("city");

  const uniqueCities = new Set(cities?.map(c => (c as any).city).filter(Boolean));

  return {
    reciters: recitersCount || 0,
    recordings: recordingsCount || 0,
    cities: uniqueCities.size || 0
  };
}

export default async function Home() {
  const [reciters, featured, latest, collections, stats] = await Promise.all([
    getReciters(),
    getFeaturedRecordings(),
    getLatestRecordings(),
    getFeaturedCollections(),
    getStats()
  ]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Hero Section */}
      <section className="relative py-20 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="absolute inset-0 opacity-10 pointer-events-none overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-emerald-500/20 via-transparent to-transparent"></div>
        </div>

        <div className="container mx-auto px-4 relative z-10 text-center space-y-8">
          <div className="space-y-4">
            <h1 className="text-4xl md:text-6xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              أرشيف <span className="text-emerald-600 dark:text-emerald-400">تلاوات</span> القراء
            </h1>
            <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
              أكبر مشروع توثيقي للنوادر القرآنية، يجمع آلاف التسجيلات النادرة لعمالقة القراء في العالم الإسلامي.
            </p>
          </div>

          <div className="max-w-2xl mx-auto">
            <SearchBar />
          </div>

          {/* Stats Bar */}
          <div className="flex flex-wrap justify-center gap-8 md:gap-16 pt-8">
            <div className="text-center">
              <span className="block text-3xl font-bold text-emerald-600 dark:text-emerald-400">{stats.reciters}</span>
              <span className="text-sm text-slate-500 font-medium">قارئ</span>
            </div>
            <div className="text-center border-x border-slate-200 dark:border-slate-800 px-8 md:px-16">
              <span className="block text-3xl font-bold text-emerald-600 dark:text-emerald-400">{stats.recordings}</span>
              <span className="text-sm text-slate-500 font-medium">تلاوة أرشيفية</span>
            </div>
            <div className="text-center">
              <span className="block text-3xl font-bold text-emerald-600 dark:text-emerald-400">{stats.cities}</span>
              <span className="text-sm text-slate-500 font-medium">مدينة وبلد</span>
            </div>
          </div>
        </div>
      </section>

      <main className="container mx-auto px-4 py-16 space-y-24">

        {/* Featured Collections */}
        {collections && collections.length > 0 && (
          <HomeCollections collections={collections} />
        )}

        {/* Reciters Grid */}
        <section>
          <div className="text-center mb-12 space-y-2">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white">
              القراء المسجلون
            </h2>
            <p className="text-slate-500">تصفح الأرشيف حسب القارئ المفضل لديك</p>
          </div>

          {!reciters || reciters.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
              <p className="text-slate-500">لا يوجد قراء مسجلون حالياً</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-6">
              {reciters.map((reciter) => (
                <ReciterCard key={reciter.id} reciter={reciter} />
              ))}
            </div>
          )}
        </section >

        {/* Rarities & Latest Grid */}
        <HomeRecordings featured={featured || []} latest={latest || []} />
      </main>
    </div>
  );
}

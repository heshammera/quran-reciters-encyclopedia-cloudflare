
"use client";

import { useState } from "react";
import { addCollectionItem, removeCollectionItem, reorderCollectionItems } from "@/app/actions/collections";
import { supabase } from "@/lib/supabase/client";
import { useDebounce } from "@/hooks/use-debounce";
import { formatDualYear } from "@/lib/date-utils";

interface CollectionItemsManagerProps {
    collectionId: string;
    items: any[];
}

export default function CollectionItemsManager({ collectionId, items }: CollectionItemsManagerProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const debouncedSearch = useDebounce(searchTerm, 500);

    // Effect for search
    useState(() => {
        if (debouncedSearch.length < 3) {
            setSearchResults([]);
            return;
        }

        const search = async () => {
            setIsSearching(true);

            // Search logic: Search by Surah Name or Reciter Name
            // We need a way to search. Let's try a simple join query.
            // Ideally we should use the existing search API, but let's do a direct query for admin.

            // Note: Supabase text search is best on the indexed columns. 
            // We can search quran_index for surahs, but we want recordings.
            // Let's do a simple exact match on surah number or partial match on reciter name?
            // Actually, let's search for reciter name first.

            const { data, error } = await supabase
                .from("recordings")
                .select(`
                    id,
                    surah_number,
                    reciters!inner(name_ar),
                    sections(name_ar),
                    recording_date,
                    quality_level
                `)
                .textSearch('reciters.name_ar', `'${debouncedSearch}'`)
                .limit(10);

            // Fallback if text search isn't set up on reciter name: simple ILIKE
            if (error || !data || data.length === 0) {
                const { data: fallbackData } = await supabase
                    .from("recordings")
                    .select(`
                        id,
                        surah_number,
                        reciters!inner(name_ar),
                        sections(name_ar),
                        recording_date,
                        quality_level
                    `)
                    .ilike('reciters.name_ar', `%${debouncedSearch}%`)
                    .limit(10);

                setSearchResults(fallbackData || []);
            } else {
                setSearchResults(data);
            }

            setIsSearching(false);
        };

        if (debouncedSearch) search();
    });

    const handleAdd = async (recordingId: string) => {
        try {
            await addCollectionItem(collectionId, recordingId);
            setSearchTerm(""); // Clear search
            setSearchResults([]);
        } catch (e: any) {
            alert(e.message);
        }
    };

    const handleRemove = async (itemId: string) => {
        if (!confirm("هل أنت متأكد من الحذف؟")) return;
        try {
            await removeCollectionItem(itemId, collectionId);
        } catch (e: any) {
            alert(e.message);
        }
    };

    // Simple drag-like reorder via inputs?
    // Let's stick to simple "Move Up/Down" buttons for accessibility and ease of implementation without DND lib.
    const handleMove = async (index: number, direction: 'up' | 'down') => {
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === items.length - 1) return;

        const newItems = [...items];
        const swapIndex = direction === 'up' ? index - 1 : index + 1;

        // Swap display_order values in logic
        const tempOrder = newItems[index].display_order;
        newItems[index].display_order = newItems[swapIndex].display_order;
        newItems[swapIndex].display_order = tempOrder;

        // Optimistic update? No, just send both updates.
        // But better is to just swap the array locally and send batch update.

        // Let's assume display_order is 1-based index or just sequential.
        // We will just swap the items in the array and send their IDs and new orders.

        // 1. Swap in array
        [newItems[index], newItems[swapIndex]] = [newItems[swapIndex], newItems[index]];

        // 2. Prepare payload: update ALL items' display order to match their new index + 1
        const payload = newItems.map((item, idx) => ({
            id: item.id,
            display_order: idx + 1
        }));

        await reorderCollectionItems(payload, collectionId);
    };

    return (
        <div className="space-y-6">
            <h3 className="text-xl font-bold border-b pb-4 mb-4 dark:text-white">محتويات المجموعة</h3>

            {/* Current Items List */}
            <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4 min-h-[100px] space-y-2">
                {items.length === 0 ? (
                    <div className="text-center text-slate-500 py-4">
                        المجموعة فارغة. أضف تسجيلات من الأسفل.
                    </div>
                ) : (
                    items.map((item, idx) => (
                        <div key={item.id} className="bg-white dark:bg-slate-800 p-3 rounded shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <span className="w-6 h-6 flex items-center justify-center bg-slate-200 dark:bg-slate-700 rounded-full text-xs font-bold font-mono">
                                    {idx + 1}
                                </span>
                                <div>
                                    <div className="font-bold text-slate-900 dark:text-white">
                                        سورة {item.recordings.surah_number}
                                    </div>
                                    <div className="text-xs text-slate-500">
                                        {item.recordings.reciters.name_ar} • {item.recordings.sections.name_ar}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <div className="flex flex-col">
                                    <button
                                        disabled={idx === 0}
                                        onClick={() => handleMove(idx, 'up')}
                                        className="text-slate-400 hover:text-emerald-600 disabled:opacity-30 disabled:hover:text-slate-400"
                                    >
                                        ▲
                                    </button>
                                    <button
                                        disabled={idx === items.length - 1}
                                        onClick={() => handleMove(idx, 'down')}
                                        className="text-slate-400 hover:text-emerald-600 disabled:opacity-30 disabled:hover:text-slate-400"
                                    >
                                        ▼
                                    </button>
                                </div>
                                <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 mx-2"></div>
                                <button
                                    onClick={() => handleRemove(item.id)}
                                    className="text-red-500 hover:text-red-700 p-1"
                                    title="إزالة"
                                >
                                    🗑️
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Add Item Section */}
            <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-lg border border-emerald-100 dark:border-emerald-900/50">
                <h4 className="font-bold text-emerald-800 dark:text-emerald-400 mb-2">إضافة تسجيل</h4>
                <div className="relative">
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="ابحث باسم القارئ..."
                        className="w-full p-2 border rounded focus:ring-2 focus:ring-emerald-500 dark:bg-slate-800 dark:text-white"
                    />
                    {isSearching && (
                        <div className="absolute left-3 top-2.5">
                            <div className="animate-spin h-5 w-5 border-2 border-emerald-500 border-t-transparent rounded-full"></div>
                        </div>
                    )}

                    {searchResults.length > 0 && (
                        <div className="absolute w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto">
                            {searchResults.map(rec => (
                                <button
                                    key={rec.id}
                                    onClick={() => handleAdd(rec.id)}
                                    className="w-full text-right p-3 hover:bg-slate-50 dark:hover:bg-slate-700 border-b last:border-0 border-slate-100 dark:border-slate-700 transition-colors flex justify-between items-center group"
                                >
                                    <div>
                                        <div className="font-bold text-slate-800 dark:text-white">
                                            {rec.reciters.name_ar} - سورة {rec.surah_number}
                                        </div>
                                        <div className="text-xs text-slate-500">
                                            {rec.sections.name_ar} • {typeof rec.recording_date === 'object' ? formatDualYear((rec.recording_date as any)?.year) : 'تاريخ غير معروف'}
                                        </div>
                                    </div>
                                    <span className="text-emerald-600 opacity-0 group-hover:opacity-100 text-sm font-bold">
                                        + إضافة
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                <p className="text-xs text-emerald-600 mt-2">
                    ابحث وأضف التسجيلات إلى القائمة أعلاه.
                </p>
            </div>
        </div>
    );
}

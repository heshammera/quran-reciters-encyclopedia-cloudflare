"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { searchGlobal, SearchResult } from "@/app/actions/search";
import Link from "next/link";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";

import { useLeanMode } from "@/context/LeanModeContext";
import { usePlayer } from "@/hooks/usePlayer";

const PLACEHOLDERS = [
    "ابحث عن قارئ (مثال: المنشاوي)...",
    "ابحث عن سورة (مثال: سورة البقرة)...",
    "ابحث عن تلاوة نادرة...",
    "ابحث عن سنة (مثال: 1950)...",
    "تلاوات استوديو أو حفلات خارجية..."
];

export default function SearchBar() {
    const { isLean } = useLeanMode();
    const { playTrack } = usePlayer();
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    // Typewriter state
    const [placeholder, setPlaceholder] = useState(PLACEHOLDERS[0]);
    const [placeholderIndex, setPlaceholderIndex] = useState(0);
    const [charIndex, setCharIndex] = useState(0);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isPaused, setIsPaused] = useState(false);

    const router = useRouter();
    const dropdownRef = useRef<HTMLDivElement>(null);
    const debouncedQuery = useDebounce(query, 300);

    // Typewriter Effect
    useEffect(() => {
        if (isLean) {
            setPlaceholder("ابحث عن القراء، السور، أو التسجيلات...");
            return;
        }

        const currentText = PLACEHOLDERS[placeholderIndex];
        let timer: NodeJS.Timeout;

        if (isPaused) {
            timer = setTimeout(() => {
                setIsPaused(false);
                setIsDeleting(true);
            }, 2000); // Wait before deleting
        } else if (isDeleting) {
            if (charIndex > 0) {
                timer = setTimeout(() => {
                    setPlaceholder(currentText.substring(0, charIndex - 1));
                    setCharIndex(charIndex - 1);
                }, 50); // Deleting speed
            } else {
                setIsDeleting(false);
                setPlaceholderIndex((prev) => (prev + 1) % PLACEHOLDERS.length);
            }
        } else {
            if (charIndex < currentText.length) {
                timer = setTimeout(() => {
                    setPlaceholder(currentText.substring(0, charIndex + 1));
                    setCharIndex(charIndex + 1);
                }, 100); // Typing speed
            } else {
                setIsPaused(true);
            }
        }

        return () => clearTimeout(timer);
    }, [charIndex, isDeleting, isPaused, placeholderIndex, isLean]);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Perform search
    useEffect(() => {
        async function fetchResults() {
            if (debouncedQuery.length < 2) {
                setResults([]);
                return;
            }

            setLoading(true);
            try {
                const data = await searchGlobal(debouncedQuery);
                setResults(data);
                setIsOpen(true);
            } catch (error) {
                console.error("Search error:", error);
            } finally {
                setLoading(false);
            }
        }

        fetchResults();
    }, [debouncedQuery]);

    const handleSearchCheck = (e: React.FormEvent) => {
        e.preventDefault();
        if (query.trim()) {
            setIsOpen(false);
            router.push(`/search?q=${encodeURIComponent(query.trim())}`);
        }
    };

    return (
        <div className="relative w-full max-w-2xl mx-auto" ref={dropdownRef}>
            <form onSubmit={handleSearchCheck} className="relative group">
                <div className="relative overflow-hidden rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 transition-all duration-300 focus-within:ring-4 focus-within:ring-emerald-500/20 focus-within:border-emerald-500">
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            if (e.target.value.length >= 2) setIsOpen(true);
                        }}
                        onFocus={() => {
                            if (query.length >= 2) setIsOpen(true);
                        }}
                        placeholder={placeholder}
                        className="w-full py-4 pr-14 pl-4 bg-transparent border-none text-lg text-slate-800 dark:text-gray-100 placeholder-slate-400 focus:outline-none"
                    />

                    <div className="absolute right-2 top-2 bottom-2 aspect-square">
                        <button
                            type="submit"
                            className="w-full h-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl flex items-center justify-center transition-colors shadow-md"
                        >
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </button>
                    </div>
                </div>
            </form>

            {/* Results Dropdown */}
            {isOpen && (query.length >= 2) && (
                <div className="absolute top-full mt-4 w-full bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 overflow-hidden z-[100] animate-in fade-in slide-in-from-top-2 duration-200">
                    {loading ? (
                        <div className="p-8 text-center text-slate-500">
                            <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto mb-3"></div>
                            <p>جاري البحث في الأرشيف...</p>
                        </div>
                    ) : results.length > 0 ? (
                        <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
                            <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                {results.map((result) => (
                                    <div
                                        key={`${result.type}-${result.id}`}
                                        className="flex items-center gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group cursor-pointer"
                                        onClick={() => {
                                            setIsOpen(false);
                                            router.push(result.url);
                                        }}
                                    >
                                        <div className={cn(
                                            "w-12 h-12 rounded-full flex items-center justify-center shrink-0 text-xl shadow-sm transition-transform group-hover:scale-110",
                                            result.type === 'reciter' ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20" : "bg-blue-50 text-blue-600 dark:bg-blue-900/20"
                                        )}>
                                            {result.type === 'reciter' ? '🎙️' : '📜'}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-bold text-slate-900 dark:text-white text-lg group-hover:text-emerald-600 transition-colors truncate">
                                                {result.title}
                                            </div>
                                            {result.subtitle && (
                                                <div className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 truncate">{result.subtitle}</div>
                                            )}
                                        </div>
                                        {(result.type === 'recording' || result.type === 'ayah') && result.src && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    playTrack({
                                                        id: result.id,
                                                        title: result.title,
                                                        src: result.src!,
                                                        reciterName: result.subtitle?.split('-')[0].trim() || 'قارئ',
                                                    });
                                                }}
                                                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white transition-all text-sm font-bold shadow-sm shrink-0"
                                                title="تشغيل مباشر"
                                            >
                                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                                    <path d="M8 5v14l11-7z" />
                                                </svg>
                                                <span>تشغيل</span>
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="p-8 text-center text-slate-500">
                            <div className="text-4xl mb-2">🔍</div>
                            <p>لا توجد نتائج مطابقة لـ "{query}"</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

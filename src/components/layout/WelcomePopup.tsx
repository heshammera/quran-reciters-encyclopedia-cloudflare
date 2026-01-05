"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

export default function WelcomePopup() {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const hasSeenOnboarding = localStorage.getItem("has_seen_onboarding_v1");
        if (!hasSeenOnboarding) {
            const timer = setTimeout(() => setIsVisible(true), 1500);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleDismiss = () => {
        setIsVisible(false);
        localStorage.setItem("has_seen_onboarding_v1", "true");
    };

    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-500">
            {/* Main Modal */}
            <div className="relative bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl border border-white/20 dark:border-slate-800 max-w-lg w-full max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-300">
                <div className="p-6 md:p-8 text-center space-y-4 md:space-y-6">
                    {/* Logo/Icon */}
                    <div className="mx-auto w-16 h-16 md:w-20 md:h-20 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl flex items-center justify-center text-3xl md:text-4xl shadow-inner">
                        ✨
                    </div>

                    <div className="space-y-2">
                        <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white" style={{ fontFamily: "'Aref Ruqaa', serif" }}>
                            أهلاً بك في الموسوعة الموثقة
                        </h2>
                        <p className="text-sm md:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
                            يسعدنا انضمامك إلينا! لقد أضفنا مزايا جديدة لمساعدتك في رحلتك الاستماعية:
                        </p>
                    </div>

                    <div className="grid grid-cols-1 gap-3 md:gap-4 text-right">
                        <div className="bg-slate-50 dark:bg-slate-800/50 p-3 md:p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                            <h3 className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2 mb-1 text-sm md:text-base">
                                <span>🤖</span> المساعد الذكي
                            </h3>
                            <p className="text-[10px] md:text-xs text-slate-500 dark:text-slate-400">
                                ابحث عن التلاوات، استفسر عن القراء، واطلب السور مباشرة عبر الدردشة.
                            </p>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-800/50 p-3 md:p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                            <h3 className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2 mb-1 text-sm md:text-base">
                                <span>🧘</span> الوضع الهادئ (Lean Mode)
                            </h3>
                            <p className="text-[10px] md:text-xs text-slate-500 dark:text-slate-400">
                                بسط واجهة الموقع، قلل استهلاك البيانات، واستمتع بتجربة استماع خالية من المشتتات.
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={handleDismiss}
                        className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold transition-all shadow-lg hover:shadow-emerald-500/20 transform hover:scale-[1.02] active:scale-95"
                    >
                        فهمت، ابدأ التصفح
                    </button>
                </div>
            </div>

            {/* Arrows Layout Layer - Fixed to screen bounds - Hidden on mobile */}
            <div className="fixed inset-0 pointer-events-none z-[101] hidden md:block">
                {/* Arrow to Lean Mode (Bottom Left) */}
                <div className="absolute bottom-20 left-12 animate-bounce">
                    <div className="relative">
                        <svg className="w-16 h-16 text-emerald-500 dark:text-emerald-400 drop-shadow-md" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" transform="rotate(45 12 12)" />
                        </svg>
                        <span className="absolute -top-8 left-0 whitespace-nowrap bg-emerald-100 dark:bg-emerald-900/80 text-emerald-700 dark:text-emerald-300 px-3 py-1 rounded-full text-[10px] font-bold border border-emerald-200 dark:border-emerald-700">
                            الوضع الهادئ من هنا
                        </span>
                    </div>
                </div>

                {/* Arrow to Assistant (Bottom Right) */}
                <div className="absolute bottom-24 right-16 animate-bounce">
                    <div className="relative">
                        <svg className="w-16 h-16 text-emerald-500 dark:text-emerald-400 drop-shadow-md" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" transform="rotate(-45 12 12)" />
                        </svg>
                        <span className="absolute -top-8 right-0 whitespace-nowrap bg-emerald-100 dark:bg-emerald-900/80 text-emerald-700 dark:text-emerald-300 px-3 py-1 rounded-full text-[10px] font-bold border border-emerald-200 dark:border-emerald-700">
                            تحدث مع المساعد الذكي
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}

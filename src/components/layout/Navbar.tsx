
"use client";

import { useState } from "react";
import Link from "next/link";
import UserNav from "./UserNav";
import ThemeToggle from "./ThemeToggle";
import { usePathname } from "next/navigation";

const links = [
    { href: "/", label: "الرئيسية" },
    { href: "/collections", label: "المجموعات" },
    { href: "/session", label: "🎧 جلسة استماع" },
    { href: "/compare", label: "🎯 مقارنة" },
    { href: "/donate", label: "ادعمنا" },
];

export default function Navbar() {
    const [isOpen, setIsOpen] = useState(false);
    const pathname = usePathname();

    return (
        <nav className="sticky top-0 z-[60] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 h-16">
            <div className="container mx-auto px-4 h-full flex items-center justify-between">
                {/* Logo & Mobile Menu Toggle */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className="md:hidden p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                    >
                        {isOpen ? (
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        ) : (
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                        )}
                    </button>

                    <Link href="/" className="flex items-center gap-3">
                        <div className="relative h-10 w-10 md:h-12 md:w-12 overflow-hidden bg-white rounded-lg border border-slate-100 dark:border-slate-800 shadow-sm transition-transform hover:scale-105">
                            <img
                                src="/logo.png"
                                alt="موسوعة قراء القرآن"
                                className="w-full h-full object-contain p-0.5"
                            />
                        </div>
                        <span
                            className="font-bold text-2xl md:text-3xl text-emerald-700 dark:text-emerald-400 hidden sm:inline-block pt-1"
                            style={{ fontFamily: "'Aref Ruqaa', serif" }}
                        >
                            مَوْسُوعَةُ قُرَّاءِ الْقُرْآنِ
                        </span>
                    </Link>
                </div>

                {/* Desktop Links */}
                <div className="hidden md:flex items-center gap-1">
                    {links.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${pathname === link.href
                                ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
                                : "text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                                }`}
                        >
                            {link.label}
                        </Link>
                    ))}
                </div>

                {/* Right Side: Auth & Theme */}
                <div className="flex items-center gap-3">
                    <ThemeToggle />
                    <UserNav />
                </div>
            </div>

            {/* Mobile Menu */}
            {isOpen && (
                <div className="md:hidden absolute top-16 left-0 right-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-xl animate-in slide-in-from-top duration-200">
                    <div className="p-4 space-y-2">
                        {links.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                onClick={() => setIsOpen(false)}
                                className={`block px-4 py-3 rounded-xl text-base font-bold transition-colors ${pathname === link.href
                                    ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
                                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                                    }`}
                            >
                                {link.label}
                            </Link>
                        ))}
                    </div>
                </div>
            )}
        </nav>
    );
}

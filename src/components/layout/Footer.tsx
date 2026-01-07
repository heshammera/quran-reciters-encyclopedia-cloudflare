import Link from "next/link";

export default function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="bg-slate-900 text-slate-300 border-t border-slate-800 font-sans">
            {/* Main Footer Content */}
            {/* Main Footer Content */}
            <div className="container mx-auto px-4 py-8 md:py-16">
                <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-12">

                    {/* Column 1: Brand & About - Spans 2 cols on mobile for readability */}
                    <div className="col-span-2 md:col-span-1 space-y-4 md:space-y-6">
                        <div className="flex items-center gap-2">
                            <span className="text-2xl md:text-3xl">🎙️</span>
                            <span className="font-bold text-xl md:text-2xl text-white">موسوعة القرّاء</span>
                        </div>
                        <p className="text-slate-400 leading-relaxed text-sm">
                            أضخم أرشيف رقمي مفتوح المصدر لتوثيق تلاوات عمالقة القراء في العالم الإسلامي. نسعى لحفظ التراث الصوتي القرآني وتقديمه بأعلى جودة.
                        </p>
                        <div className="flex gap-4 pt-2">
                            {/* Social Placeholders */}
                            <a href="#" className="w-10 h-10 rounded-full bg-slate-800 hover:bg-blue-500 flex items-center justify-center transition-all duration-300 text-white" aria-label="Telegram">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" /></svg>
                            </a>
                            <a href="#" className="w-10 h-10 rounded-full bg-slate-800 hover:bg-blue-700 flex items-center justify-center transition-all duration-300 text-white" aria-label="Facebook">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.791-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
                            </a>
                            <a href="#" className="w-10 h-10 rounded-full bg-slate-800 hover:bg-red-600 flex items-center justify-center transition-all duration-300 text-white" aria-label="YouTube">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" /></svg>
                            </a>
                        </div>
                    </div>

                    {/* Column 2: Discover - Fits in 1 col on mobile */}
                    <div className="space-y-4 md:space-y-6">
                        <h3 className="text-lg font-bold text-white relative inline-block">
                            اكتشف
                            <span className="absolute -bottom-2 right-0 w-8 h-1 bg-emerald-500 rounded-full"></span>
                        </h3>
                        <ul className="space-y-3 md:space-y-4 text-sm">
                            <li><Link href="/reciters" className="hover:text-emerald-400 transition-colors flex items-center gap-2"><span>👤</span> القراء</Link></li>
                            <li><Link href="/collections" className="hover:text-emerald-400 transition-colors flex items-center gap-2"><span>📂</span> المجموعات</Link></li>
                            <li><Link href="/session" className="hover:text-emerald-400 transition-colors flex items-center gap-2"><span>🎧</span> جلسة</Link></li>
                        </ul>
                    </div>

                    {/* Column 3: Resources - Fits in 1 col on mobile */}
                    <div className="space-y-4 md:space-y-6">
                        <h3 className="text-lg font-bold text-white relative inline-block">
                            موارد
                            <span className="absolute -bottom-2 right-0 w-8 h-1 bg-emerald-500 rounded-full"></span>
                        </h3>
                        <ul className="space-y-3 md:space-y-4 text-sm">
                            <li><Link href="/about" className="hover:text-emerald-400 transition-colors">عن المشروع</Link></li>
                            <li><Link href="/donate" className="hover:text-emerald-400 transition-colors">ادعمنا</Link></li>
                        </ul>
                    </div>

                </div>
            </div>

            {/* Bottom Bar */}
            <div className="border-t border-slate-800 bg-slate-950/50">
                <div className="container mx-auto px-4 py-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500">
                    <p>
                        © {currentYear} جميع الحقوق محفوظة "للمشاع الإبداعي" وقراء القرآن الكريم.
                    </p>
                    <div className="flex items-center gap-6">
                        <Link href="/privacy" className="hover:text-emerald-400 transition-colors">سياسة الخصوصية</Link>
                        <Link href="/terms" className="hover:text-emerald-400 transition-colors">شروط الاستخدام</Link>
                        <span className="flex items-center gap-1">
                            صنع بـ ❤️ لخدمة القرآن
                        </span>
                    </div>
                </div>
            </div>
        </footer>
    );
}

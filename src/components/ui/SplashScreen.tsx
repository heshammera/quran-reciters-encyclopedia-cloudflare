import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { usePathname, useSearchParams } from "next/navigation";

const ADHKAR = [
    "سبحان الله وبحمده، سبحان الله العظيم",
    "لا حول ولا قوة إلا بالله",
    "اللهم صل وسلم على نبينا محمد",
    "أستغفر الله العظيم وأتوب إليه",
    "سبحان الله، والحمد لله، ولا إله إلا الله، والله أكبر",
    "لا إله إلا أنت سبحانك إني كنت من الظالمين",
    "رضيت بالله رباً، وبالإسلام ديناً، وبمحمد نبياً",
    "يا حي يا قيوم برحمتك أستغيث"
];

export default function SplashScreen() {
    const [isVisible, setIsVisible] = useState(false); // Default false, effect will turn it on
    const [adhkarIndex, setAdhkarIndex] = useState(0);
    const pathname = usePathname();
    const searchParams = useSearchParams();

    useEffect(() => {
        // Trigger on mount and navigation
        setIsVisible(true);
        setAdhkarIndex((prev) => (prev + 1) % ADHKAR.length); // Rotate adhkar on new load

        // Cycle through Adhkar while visible
        const interval = setInterval(() => {
            setAdhkarIndex((prev) => (prev + 1) % ADHKAR.length);
        }, 3000);

        // Hide after duration
        const timer = setTimeout(() => {
            setIsVisible(false);
        }, 3500); // 3.5 seconds to read at least one dhikr

        return () => {
            clearInterval(interval);
            clearTimeout(timer);
        };
    }, [pathname, searchParams]);

    if (!isVisible) return null;

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1, ease: "easeInOut" }}
                    className="fixed inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-center overflow-hidden"
                >
                    {/* Background: Geometric Pattern Overlay */}
                    <div className="absolute inset-0 opacity-5 bg-[url('https://www.transparenttextures.com/patterns/arabesque.png')] bg-repeat mix-blend-overlay pointer-events-none" />

                    {/* Background: Floating Particles */}
                    {[...Array(20)].map((_, i) => (
                        <motion.div
                            key={i}
                            className="absolute rounded-full bg-amber-400/20 blur-sm"
                            initial={{
                                x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000),
                                y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 1000),
                                scale: Math.random() * 0.5 + 0.5,
                            }}
                            animate={{
                                y: [null, Math.random() * -100],
                                opacity: [0, 0.5, 0],
                            }}
                            transition={{
                                duration: Math.random() * 5 + 5,
                                repeat: Infinity,
                                ease: "linear"
                            }}
                            style={{
                                width: Math.random() * 4 + 2 + "px",
                                height: Math.random() * 4 + 2 + "px",
                            }}
                        />
                    ))}

                    <div className="relative mb-16 flex items-center justify-center">
                        {/* 1. Core Glow */}
                        <div className="absolute inset-0 bg-emerald-600/30 blur-[80px] rounded-full animate-pulse"></div>

                        {/* 2. Golden Ornamental Ring (SVG) - Rotating Clockwise */}
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                            className="absolute"
                        >
                            <svg width="220" height="220" viewBox="0 0 220 220" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="110" cy="110" r="108" stroke="url(#gold_gradient)" strokeWidth="1" strokeDasharray="4 4" />
                                <defs>
                                    <linearGradient id="gold_gradient" x1="0" y1="0" x2="220" y2="220">
                                        <stop offset="0%" stopColor="#CA8A04" />
                                        <stop offset="50%" stopColor="#FCD34D" />
                                        <stop offset="100%" stopColor="#CA8A04" />
                                    </linearGradient>
                                </defs>
                            </svg>
                        </motion.div>

                        {/* 3. Emerald Geometric Ring (SVG) - Rotating Counter-Clockwise */}
                        <motion.div
                            animate={{ rotate: -360 }}
                            transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                            className="absolute"
                        >
                            <svg width="190" height="190" viewBox="0 0 190 190" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="95" cy="95" r="94" stroke="#10B981" strokeWidth="0.5" strokeOpacity="0.5" />
                                <path d="M95 5 L95 15 M95 175 L95 185 M5 95 L15 95 M175 95 L185 95" stroke="#10B981" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                        </motion.div>

                        {/* 4. Logo Container with Shimmer Effect - White Background */}
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                            className="relative z-10 w-36 h-36 bg-white rounded-full border-4 border-emerald-50 shadow-2xl flex items-center justify-center p-4 overflow-hidden"
                        >
                            {/* Inner Glow/Shadow for depth */}
                            <div className="absolute inset-0 shadow-[inset_0_0_20px_rgba(0,0,0,0.1)] rounded-full z-20 pointer-events-none"></div>

                            {/* Logo */}
                            <img
                                src="/logo.png"
                                alt="Logo"
                                className="relative z-10 w-full h-full object-contain"
                            />

                            {/* Shimmer Sweep Animation */}
                            <motion.div
                                animate={{ left: ["-100%", "200%"] }}
                                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", repeatDelay: 1 }}
                                className="absolute top-0 bottom-0 w-1/2 bg-gradient-to-r from-transparent via-white/40 to-transparent -skew-x-12 z-20 pointer-events-none"
                            />
                        </motion.div>
                    </div>

                    {/* Adhkar Section - Elegant Typography */}
                    <div className="h-20 flex items-center justify-center px-6">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={adhkarIndex}
                                initial={{ opacity: 0, y: 15, filter: "blur(5px)" }}
                                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                                exit={{ opacity: 0, y: -15, filter: "blur(5px)" }}
                                transition={{ duration: 0.8 }}
                                className="text-center"
                            >
                                <p className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-200 via-white to-emerald-200 text-xl md:text-2xl font-medium font-serif leading-relaxed tracking-wide drop-shadow-md">
                                    {ADHKAR[adhkarIndex]}
                                </p>
                                <div className="mx-auto mt-2 w-12 h-0.5 bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent rounded-full" />
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    {/* Simple Elegant Progress Line */}
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-900">
                        <motion.div
                            initial={{ width: "0%" }}
                            animate={{ width: "100%" }}
                            transition={{ duration: 3.5, ease: "easeInOut" }}
                            className="h-full bg-gradient-to-r from-slate-900 via-emerald-500 to-slate-900"
                        />
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

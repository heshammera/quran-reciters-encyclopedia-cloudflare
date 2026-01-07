"use client";

import { motion } from "framer-motion";
import { usePathname } from "next/navigation";

export default function Template({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    return (
        <motion.div
            key={pathname}
            initial={{
                opacity: 0,
                y: 25,
                scale: 0.98,
                filter: "blur(8px)"
            }}
            animate={{
                opacity: 1,
                y: 0,
                scale: 1,
                filter: "blur(0px)"
            }}
            transition={{
                duration: 0.5,
                ease: [0.16, 1, 0.3, 1],
                opacity: { duration: 0.4 },
                scale: { duration: 0.5 },
                filter: { duration: 0.45 }
            }}
        >
            {children}
        </motion.div>
    );
}

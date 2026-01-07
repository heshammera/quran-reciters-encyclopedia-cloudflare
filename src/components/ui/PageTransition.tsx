"use client";

import { motion } from "framer-motion";

export default function PageTransition({
    children,
    className,
}: {
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <motion.div
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
            exit={{
                opacity: 0,
                y: -25,
                scale: 0.98,
                filter: "blur(8px)",
                transition: {
                    duration: 0.3,
                    ease: [0.43, 0.13, 0.23, 0.96]
                }
            }}
            transition={{
                duration: 0.5,
                ease: [0.16, 1, 0.3, 1], // Professional spring-like easing
                opacity: { duration: 0.4 },
                scale: { duration: 0.5 },
                filter: { duration: 0.45 }
            }}
            className={className}
        >
            {children}
        </motion.div>
    );
}

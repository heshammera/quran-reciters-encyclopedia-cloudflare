"use client";

import { usePresence } from "@/hooks/usePresence";

export default function PresenceTracker() {
    usePresence();
    return null;
}

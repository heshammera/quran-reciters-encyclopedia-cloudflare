"use client";

import { usePlayer } from "@/hooks/usePlayer";
import WaveformVisualizer from "@/components/player/WaveformVisualizer";
import { useEffect, useState } from "react";

export default function RecordingHeaderVisualizer({ recordingId }: { recordingId: string }) {
    const { state } = usePlayer();
    const { currentTrack, isPlaying, analyserNode } = state;
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    if (!isMounted) return null;

    const isActive = currentTrack?.id === recordingId;

    if (!isActive) return null;

    return (
        <div className="absolute inset-0 z-0 pointer-events-none opacity-40">
            <WaveformVisualizer
                analyser={analyserNode}
                isPlaying={isPlaying}
                color="#10b981" // emerald-500
                allowSimulation={true}
            />
        </div>
    );
}

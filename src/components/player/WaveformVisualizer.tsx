"use client";

import { useEffect, useRef } from "react";

interface WaveformVisualizerProps {
    analyser: AnalyserNode | null;
    isPlaying: boolean;
    color?: string; // Optional color string, e.g., "#10b981" (emerald-500)
    allowSimulation?: boolean;
}

export default function WaveformVisualizer({ analyser, isPlaying, color = "#10b981", allowSimulation = true }: WaveformVisualizerProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const requestRef = useRef<number | null>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        let bufferLength = 0;
        let dataArray: Uint8Array | null = null;

        if (analyser) {
            // High sensitivity settings
            analyser.fftSize = 256;
            analyser.minDecibels = -90; // Even more sensitive
            analyser.maxDecibels = -10;
            analyser.smoothingTimeConstant = 0.85;
            bufferLength = analyser.frequencyBinCount;
            dataArray = new Uint8Array(bufferLength);
        }

        const draw = () => {
            requestRef.current = requestAnimationFrame(draw);

            if (!isPlaying) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                // Pause state: Thin line
                ctx.fillStyle = color;
                ctx.globalAlpha = 0.3;
                ctx.fillRect(0, canvas.height / 2, canvas.width, 1);
                ctx.globalAlpha = 1.0;
                return;
            }

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            let hasSignal = false;
            // Attempt to get real data
            if (analyser && dataArray) {
                analyser.getByteFrequencyData(dataArray as any);
                // Check signal
                for (let i = 0; i < dataArray.length; i++) {
                    if (dataArray[i] > 1) {
                        hasSignal = true;
                        break;
                    }
                }
            }

            // Draw Mirrored Spectrum
            const barsCount = 50;
            const centerX = canvas.width / 2;
            const barSpacing = 1;
            const barWidth = (canvas.width / barsCount) - barSpacing;

            for (let i = 0; i < barsCount / 2; i++) {
                let barHeight = 0;

                if (hasSignal && dataArray) {
                    // Map bars to frequency bins. focus on lower/middle range
                    const binIndex = Math.floor((i / (barsCount / 2)) * (dataArray.length * 0.6));
                    const value = dataArray[binIndex] || 0;
                    barHeight = (value / 255) * canvas.height;
                } else if (allowSimulation) {
                    // Smart Simulation: Mimic Speech
                    const time = Date.now() / 150;
                    const noise = Math.random() * 0.1;

                    // Shape: Energetic in the center, tapering off
                    const shape = Math.max(0, 1 - (i / (barsCount * 0.4)));

                    // Complex wave for speech-like jitter
                    const w1 = Math.sin(time + i * 0.2);
                    const w2 = Math.cos(time * 0.7 + i * 0.1);
                    const w3 = Math.sin(time * 2.3 + i * 0.5); // Fast jitter

                    // Envelope for pauses/bursts
                    const envelope = (Math.sin(time / 4) + 1.2) / 2.2;

                    const combined = (Math.abs(w1 * w2 + w3 * 0.2) * 0.7 + noise * 0.3) * envelope;
                    barHeight = combined * shape * canvas.height * 0.85;
                }

                barHeight = Math.max(1.5, barHeight);

                ctx.fillStyle = color;
                ctx.globalAlpha = 0.6 + (barHeight / canvas.height) * 0.4;

                const xRight = centerX + (i * (barWidth + barSpacing));
                const xLeft = centerX - (i * (barWidth + barSpacing)) - barWidth;

                const y = (canvas.height - barHeight) / 2;

                ctx.fillRect(xRight, y, barWidth, barHeight);
                ctx.fillRect(xLeft, y, barWidth, barHeight);
            }
            ctx.globalAlpha = 1.0;
        };

        draw();

        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [analyser, isPlaying, color, allowSimulation]);

    return (
        <canvas
            ref={canvasRef}
            width={400}
            height={100}
            className="w-full h-full"
        />
    );
}

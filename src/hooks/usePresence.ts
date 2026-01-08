"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { usePlayer } from "@/hooks/usePlayer";

export function usePresence() {
    const pathname = usePathname();
    const { state } = usePlayer();
    const channelRef = useRef<any>(null);

    useEffect(() => {
        const userAgent = typeof window !== 'undefined' ? window.navigator.userAgent : 'Unknown';
        const isMobile = /iPhone|iPad|iPod|Android/i.test(userAgent);
        const userId = 'user-' + Math.random().toString(36).substring(7);

        const channel = supabase.channel('quran-presence', {
            config: {
                presence: { key: userId },
            },
        });

        channelRef.current = channel;

        const getPresenceState = () => ({
            path: window.location.pathname,
            is_listening: state.isPlaying && !!state.currentTrack,
            track_title: state.isPlaying ? state.currentTrack?.title : null,
            reciter_name: state.isPlaying ? state.currentTrack?.reciterName : null,
            device: isMobile ? 'Mobile' : 'Desktop',
            last_seen: new Date().toISOString(),
        });

        channel
            .on('presence', { event: 'sync' }, () => {
                console.log('Presence synced');
            })
            .subscribe(async (status) => {
                console.log('Presence Status:', status);
                if (status === 'SUBSCRIBED') {
                    await channel.track(getPresenceState());
                }
            });

        return () => {
            channel.unsubscribe();
            channelRef.current = null;
        };
    }, []); // Only once on mount

    // Separate effect to track changes
    useEffect(() => {
        // Only track if we are actually joined/subscribed. 
        // We check this by ensuring we have a channel ref.
        // Note: The channel itself queues messages if not ready, but robust checking is better.
        if (channelRef.current) {
            const trackChange = async () => {
                try {
                    const isMobile = /iPhone|iPad|iPod|Android/i.test(window.navigator.userAgent);
                    const presenceState = {
                        path: pathname,
                        is_listening: state.isPlaying && !!state.currentTrack,
                        track_title: state.isPlaying ? state.currentTrack?.title : null,
                        reciter_name: state.isPlaying ? state.currentTrack?.reciterName : null,
                        device: isMobile ? 'Mobile' : 'Desktop',
                        last_seen: new Date().toISOString(),
                    };
                    console.log('Tracking update:', presenceState);
                    await channelRef.current.track(presenceState);
                } catch (err) {
                    console.error('Tracking failed:', err);
                }
            };
            trackChange();
        }
    }, [pathname, state.isPlaying, state.currentTrack?.id]);
}

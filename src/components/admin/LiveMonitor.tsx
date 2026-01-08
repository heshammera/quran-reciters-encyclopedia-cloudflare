"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase/client";
import { Users, Monitor, Smartphone, Headphones, Eye, RefreshCw } from "lucide-react";

interface PresenceUser {
    presence_ref: string;
    path: string;
    is_listening: boolean;
    track_title?: string;
    reciter_name?: string;
    device: string;
    last_seen: string;
}

export default function LiveMonitor() {
    const [onlineUsers, setOnlineUsers] = useState<Record<string, PresenceUser[]>>({});
    const [status, setStatus] = useState<string>('INITIALIZING');
    const [errors, setErrors] = useState<string[]>([]);

    useEffect(() => {
        console.log('=== LiveMonitor: Starting initialization ===');
        console.log('Supabase client:', supabase);

        try {
            // Create a fresh channel instance
            const channelName = 'monitor-' + Date.now();
            console.log('Creating channel:', channelName);

            const channel = supabase.channel(channelName);
            console.log('Channel created, state:', channel.state);

            const updateState = () => {
                const state = channel.presenceState();
                console.log('=== Presence State ===', state);
                setOnlineUsers(state as any);
            };

            // Subscribe to presence events
            channel
                .on('presence', { event: 'sync' }, () => {
                    console.log('PRESENCE SYNC');
                    updateState();
                })
                .on('presence', { event: 'join' }, ({ key, newPresences }) => {
                    console.log('PRESENCE JOIN:', key, newPresences);
                    updateState();
                })
                .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
                    console.log('PRESENCE LEAVE:', key, leftPresences);
                    updateState();
                })
                .subscribe(async (status, error) => {
                    console.log('=== Channel Status ===', status);
                    if (error) {
                        console.error('=== Channel Error ===', error);
                        setErrors(prev => [...prev, error.message]);
                    }
                    setStatus(status);

                    if (status === 'SUBSCRIBED') {
                        console.log('Channel subscribed! Tracking presence...');

                        // Track admin presence with all required fields
                        const trackData = {
                            path: '/admin',
                            is_listening: false,
                            is_admin: true,
                            track_title: null,
                            reciter_name: null,
                            device: 'Desktop',
                            last_seen: new Date().toISOString(),
                        };

                        console.log('Tracking:', trackData);
                        await channel.track(trackData);

                        // Force immediate state check
                        setTimeout(updateState, 100);
                    }
                });

            return () => {
                console.log('=== LiveMonitor: Cleanup ===');
                channel.unsubscribe();
            };
        } catch (error: any) {
            console.error('=== LiveMonitor Error ===', error);
            setErrors(prev => [...prev, error.message]);
            setStatus('ERROR');
        }
    }, []);

    const sortedUsers = useMemo(() => {
        console.log('=== Processing onlineUsers ===');
        console.log('Raw onlineUsers:', onlineUsers);
        console.log('Object.entries:', Object.entries(onlineUsers));

        const processed = Object.entries(onlineUsers).map(([key, value]) => {
            console.log('Processing entry:', key, value);
            const user = {
                id: key,
                ...value[0], // Presence can have multiple states per user, but we just take the latest
            };
            console.log('Processed user:', user);
            return user;
        });

        console.log('All processed users:', processed);

        const sorted = processed.sort((a, b) => new Date(b.last_seen).getTime() - new Date(a.last_seen).getTime());

        console.log('Sorted users:', sorted);
        return sorted;
    }, [onlineUsers]);

    const stats = useMemo(() => {
        const total = sortedUsers.length;
        const listening = sortedUsers.filter(u => u.is_listening).length;
        console.log('=== Stats ===', { total, listening, browsing: total - listening });
        return { total, listening, browsing: total - listening };
    }, [sortedUsers]);

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col h-full max-h-[600px]">
            {/* Header */}
            <div className="bg-slate-50 dark:bg-slate-900/50 p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                    <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        المتصلون الآن
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${status === 'SUBSCRIBED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {status === 'SUBSCRIBED' ? 'متصل' : status}
                        </span>
                    </h3>
                </div>
                <div className="flex gap-4">
                    <div className="text-xs">
                        <span className="text-slate-500">الإجمالي: </span>
                        <span className="font-bold text-emerald-600">{stats.total}</span>
                    </div>
                    <div className="text-xs">
                        <span className="text-slate-500">يستمعون: </span>
                        <span className="font-bold text-blue-600">{stats.listening}</span>
                    </div>
                </div>
            </div>

            {/* Errors Display */}
            {errors.length > 0 && (
                <div className="bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800 p-3">
                    <p className="text-xs text-red-700 dark:text-red-300 font-bold mb-1">أخطاء الاتصال:</p>
                    {errors.map((err, i) => (
                        <p key={i} className="text-[10px] text-red-600 dark:text-red-400">{err}</p>
                    ))}
                </div>
            )}

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {sortedUsers.length === 0 ? (
                    <div className="text-center py-10 opacity-50 flex flex-col items-center gap-2">
                        <div className="w-10 h-10 border-2 border-dashed border-slate-300 rounded-full" />
                        <p className="text-sm">لا يوجد مستخدمون حالياً</p>
                    </div>
                ) : (
                    sortedUsers.map((user) => (
                        <div
                            key={user.id}
                            className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800 hover:border-emerald-200 dark:hover:border-emerald-800/50 transition-all group scale-animation"
                        >
                            <div className="flex items-center gap-3">
                                {/* Status Icon */}
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${user.is_listening ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                                    {user.is_listening ? (
                                        <div className="relative">
                                            <Headphones className="w-5 h-5" />
                                            <span className="absolute -top-1 -right-1 flex h-2 w-2">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                                            </span>
                                        </div>
                                    ) : (
                                        <Eye className="w-5 h-5" />
                                    )}
                                </div>

                                <div className="min-w-0">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <span className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[150px]">
                                            {user.path === '/' ? 'الصفحة الرئيسية' : user.path}
                                        </span>
                                        <span className="px-1.5 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[8px] text-slate-500 flex items-center gap-1 uppercase font-bold tracking-tighter">
                                            {user.device === 'Mobile' ? <Smartphone className="w-2 h-2" /> : <Monitor className="w-2 h-2" />}
                                            {user.device}
                                        </span>
                                    </div>

                                    {user.is_listening ? (
                                        <div className="flex items-center gap-1.5 text-[10px] text-blue-600 dark:text-blue-400 font-medium">
                                            <span className="animate-pulse">▶</span>
                                            <span className="truncate max-w-[180px]">{user.track_title} - {user.reciter_name}</span>
                                        </div>
                                    ) : (
                                        <span className="text-[10px] text-slate-400">يتصفح الموقع حالياً</span>
                                    )}
                                </div>
                            </div>

                            <div className="text-[9px] text-slate-400 text-right shrink-0">
                                {new Date(user.last_seen).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                        </div>
                    ))
                )}
            </div>

            <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; }
        
        .scale-animation {
            animation: scaleIn 0.3s ease-out;
        }
        @keyframes scaleIn {
            from { transform: scale(0.95); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
        }
      `}</style>
        </div>
    );
}

"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Link from "next/link";
import { usePlayer } from "@/hooks/usePlayer";
import { Track } from "@/types/player";

interface Message {
    role: string;
    content: string;
    id: string;
    [key: string]: any;
}

export default function AssistantChat() {
    const [isOpen, setIsOpen] = useState(false);
    const [showWelcome, setShowWelcome] = useState(false);
    const { dispatch, state } = usePlayer();

    // Draggable logic
    const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const dragStart = useRef({ x: 0, y: 0 });
    const initialPos = useRef({ x: 0, y: 0 });
    const buttonRef = useRef<HTMLButtonElement>(null);
    const dragThreshold = 5; // Pixels to move before considering it a drag

    // Load saved position
    useEffect(() => {
        const saved = localStorage.getItem("assistant_position");
        if (saved) {
            try {
                setPosition(JSON.parse(saved));
            } catch (e) {
                console.error("Error loading position", e);
            }
        }
    }, []);

    // Welcome logic
    useEffect(() => {
        const welcomed = sessionStorage.getItem("assistant_welcomed_v2");
        if (!welcomed && !isOpen) {
            const timer = setTimeout(() => setShowWelcome(true), 1000);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    const welcomeMessage: Message = {
        role: "assistant",
        content: "أهلاً بك! أنا مساعدك الذكي، يمكنني مساعدتك في البحث عن التلاوات والنوادر. كيف يمكنني مساعدتك اليوم؟",
        id: "welcome"
    };

    const dismissWelcome = () => {
        setShowWelcome(false);
        sessionStorage.setItem("assistant_welcomed_v2", "true");
        if (messages.length === 0) {
            setMessages([welcomeMessage]);
        }
    };

    // Fully local state management
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [statusText, setStatusText] = useState("");

    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, statusText]);

    // Ensure welcome message is there if chat is opened
    useEffect(() => {
        if (isOpen && messages.length === 0) {
            setMessages([welcomeMessage]);
        }
    }, [isOpen, messages.length]);

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const content = input.trim();
        if (!content || isLoading) return;

        // Add user message
        const userMessage: Message = {
            role: "user",
            content: content,
            id: Date.now().toString()
        };
        const updatedMessages = [...messages, userMessage];
        setMessages(updatedMessages);
        setInput("");
        setIsLoading(true);
        setStatusText("جاري البحث عن المطلوب...");

        try {
            const response = await fetch("/api/assistant", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: updatedMessages.map(({ id, ...m }) => m)
                }),
            });

            if (!response.ok) {
                const text = await response.text();
                throw new Error(text || `HTTP ${response.status}`);
            }

            if (!response.body) throw new Error("No response body");

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            const assistantId = "ai-" + Date.now();
            setMessages(prev => [...prev, { role: "assistant", content: "", id: assistantId }]);

            let accumulatedContent = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                if (!chunk) continue;

                accumulatedContent += chunk;
                setStatusText("");

                setMessages(prev => prev.map(m =>
                    m.id === assistantId ? { ...m, content: accumulatedContent } : m
                ));
            }

        } catch (error) {
            console.error("Chat error:", error);
            setMessages(prev => [...prev, {
                role: "assistant",
                content: `⚠️ نعتذر، حدث خطأ: ${error instanceof Error ? error.message : "غير معروف"}`,
                id: "err-" + Date.now()
            }]);
        } finally {
            setIsLoading(false);
            setStatusText("");
        }
    };

    // Drag Handlers
    const startDragging = (e: React.MouseEvent | React.TouchEvent) => {
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

        dragStart.current = { x: clientX, y: clientY };

        const rect = buttonRef.current?.getBoundingClientRect();
        if (rect) {
            initialPos.current = { x: rect.left, y: rect.top };
        }

        setIsDragging(false); // Reset at start

        const moveHandler = (moveEvent: MouseEvent | TouchEvent) => {
            const currentX = 'touches' in moveEvent ? moveEvent.touches[0].clientX : moveEvent.clientX;
            const currentY = 'touches' in moveEvent ? moveEvent.touches[0].clientY : moveEvent.clientY;

            const dx = currentX - dragStart.current.x;
            const dy = currentY - dragStart.current.y;

            if (Math.abs(dx) > dragThreshold || Math.abs(dy) > dragThreshold) {
                setIsDragging(true);
                const newX = initialPos.current.x + dx;
                const newY = initialPos.current.y + dy;

                // Bounds checking
                const boundedX = Math.max(10, Math.min(window.innerWidth - 70, newX));
                const boundedY = Math.max(80, Math.min(window.innerHeight - 70, newY)); // Ensure it stays below header (h-16 = 64px)

                const newPos = { x: boundedX, y: boundedY };
                setPosition(newPos);
            }
        };

        const endHandler = () => {
            window.removeEventListener("mousemove", moveHandler);
            window.removeEventListener("mouseup", endHandler);
            window.removeEventListener("touchmove", moveHandler);
            window.removeEventListener("touchend", endHandler);

            // Save position if we dragged
            if (position) {
                localStorage.setItem("assistant_position", JSON.stringify(position));
            }
        };

        window.addEventListener("mousemove", moveHandler);
        window.addEventListener("mouseup", endHandler);
        window.addEventListener("touchmove", moveHandler);
        window.addEventListener("touchend", endHandler);
    };

    const handleButtonClick = () => {
        if (!isDragging) {
            setIsOpen(true);
            dismissWelcome();
        }
    };

    const floatingStyle = position ? {
        left: `${position.x}px`,
        top: `${position.y}px`,
        bottom: 'auto',
        right: 'auto',
        touchAction: 'none'
    } : {
        bottom: '1.5rem',
        right: '1.5rem',
        touchAction: 'none'
    };

    const welcomeStyle = position ? {
        left: `${position.x - 140}px`,
        top: `${position.y - 80}px`,
        bottom: 'auto',
        right: 'auto'
    } : {
        bottom: '6rem',
        right: '1.5rem'
    };

    const chatStyle = position ? {
        left: Math.min(window.innerWidth - 370, Math.max(10, position.x - 300)),
        top: Math.max(80, Math.min(window.innerHeight - 520, position.y - 500))
    } : {
        bottom: '1.5rem',
        right: '1.5rem'
    };

    return (
        <>
            {/* Welcome Bubble */}
            {showWelcome && !isOpen && (
                <div
                    className="fixed z-50 animate-in fade-in slide-in-from-bottom-2 duration-500"
                    style={welcomeStyle}
                >
                    <div className="relative bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-xl max-w-[200px] text-sm font-bold">
                        <button
                            onClick={dismissWelcome}
                            className="absolute -top-2 -right-2 bg-slate-800 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px]"
                        >✕</button>
                        أهلاً بك! أنا مساعدك الذكي، يمكنني مساعدتك في البحث عن التلاوات والنوادر.
                        <div className="absolute bottom-[-8px] md:right-6 left-1/2 md:left-auto -translate-x-1/2 md:translate-x-0 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-emerald-600"></div>
                    </div>
                </div>
            )}

            {/* Floating Button */}
            {!isOpen && (
                <button
                    ref={buttonRef}
                    onMouseDown={startDragging}
                    onTouchStart={startDragging}
                    onClick={handleButtonClick}
                    className="fixed z-50 w-14 h-14 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full shadow-lg transition-transform flex items-center justify-center group transform hover:scale-110 active:scale-95 select-none cursor-grab active:cursor-grabbing"
                    style={floatingStyle}
                >
                    <div className="relative pointer-events-none">
                        {showWelcome && <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-ping"></span>}
                        <svg className="w-6 h-6 border-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                        </svg>
                    </div>
                </button>
            )}

            {/* Chat Panel */}
            {isOpen && (
                <div
                    className="fixed z-50 w-[350px] max-w-[calc(100vw-2rem)] h-[500px] max-h-[calc(100vh-4rem)] bg-white dark:bg-slate-800 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5"
                    style={chatStyle}
                >
                    {/* Header */}
                    <div className="bg-emerald-600 p-5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 bg-white rounded-lg flex items-center justify-center p-1 shadow-sm overflow-hidden">
                                <img src="/logo.png" alt="" className="w-full h-full object-contain" />
                            </div>
                            <div className="text-white">
                                <h3 className="font-bold">المساعد الذكي</h3>
                                <p className="text-[10px] opacity-80 uppercase tracking-widest">Assistant Online</p>
                            </div>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="text-white/70 hover:text-white">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50 dark:bg-slate-900/50">
                        {messages.length === 0 && (
                            <div className="text-center py-10 opacity-50">
                                <p>أهلاً بك! كيف يمكنني مساعدتك اليوم؟</p>
                            </div>
                        )}

                        {messages.map((m) => (
                            <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"} items-end gap-2`}>
                                {m.role === "assistant" && (
                                    <div className="w-8 h-8 rounded-lg bg-white border border-slate-100 dark:border-slate-700 shadow-sm flex-shrink-0 flex items-center justify-center p-0.5 overflow-hidden mb-1">
                                        <img src="/logo.png" alt="" className="w-full h-full object-contain" />
                                    </div>
                                )}
                                <div className={`max-w-[85%] rounded-2xl px-4 py-2 ${m.role === "user"
                                    ? "bg-emerald-600 text-white rounded-br-none"
                                    : "bg-white dark:bg-slate-700 text-slate-900 dark:text-white border border-slate-100 dark:border-slate-600 rounded-bl-none"
                                    } shadow-sm`}>
                                    <div className={`text-sm ${m.role === 'user' ? 'whitespace-pre-wrap' : 'prose dark:prose-invert max-w-none'}`}>
                                        {m.role === 'user' ? (
                                            m.content
                                        ) : (
                                            <ReactMarkdown
                                                remarkPlugins={[remarkGfm]}
                                                urlTransform={(value) => value}
                                                components={{
                                                    p: ({ children }) => <div className="mb-3 last:mb-0">{children}</div>,
                                                    a: ({ node, ...props }) => {
                                                        const href = props.href || "";
                                                        const isDirectPlay = href.startsWith('play:');
                                                        const isInternal = href.startsWith('/');

                                                        if (isDirectPlay) {
                                                            const playUrl = href.substring(5); // Remove "play:" prefix
                                                            const paramsMatch = playUrl.match(/[?&](.+)/);
                                                            const params = paramsMatch ? new URLSearchParams(paramsMatch[1]) : new URLSearchParams();

                                                            const audio = params.get('audio');
                                                            const title = params.get('title') || 'تلاوة';
                                                            const reciter = params.get('reciter') || '';
                                                            const surahName = props.children;

                                                            const handlePlay = (e: React.MouseEvent) => {
                                                                e.preventDefault();
                                                                e.stopPropagation();

                                                                // Validate audio parameter
                                                                if (audio && audio !== 'null' && audio !== 'undefined' && audio.trim() !== '') {
                                                                    dispatch({
                                                                        type: 'PLAY_TRACK',
                                                                        payload: {
                                                                            id: Date.now().toString(),
                                                                            title,
                                                                            reciterName: reciter,
                                                                            src: audio
                                                                        }
                                                                    });
                                                                } else {
                                                                    alert("نعتذر، لم يتم العثور على ملف صوتي صالح لهذه التلاوة حالياً.");
                                                                }
                                                            };

                                                            return (
                                                                <Link
                                                                    href={playUrl}
                                                                    className="block mt-2 group relative bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 transition-all hover:shadow-md hover:bg-slate-50 dark:hover:bg-slate-700/50 overflow-hidden no-underline"
                                                                >
                                                                    {/* Accent Line */}
                                                                    <div className="absolute inset-y-0 right-0 w-1 bg-emerald-500 rounded-l-md" />

                                                                    <div className="flex items-center justify-between gap-3">
                                                                        <div className="min-w-0 flex-1">
                                                                            <div className="flex items-center gap-2 mb-0.5">
                                                                                <span className="text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                                                                                    {surahName}
                                                                                </span>
                                                                            </div>
                                                                            <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                                                                                انقر للاستماع أو الانتقال للصفحة الموثقة
                                                                            </div>
                                                                        </div>

                                                                        <button
                                                                            onClick={handlePlay}
                                                                            className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center hover:bg-emerald-600 hover:text-white transition-colors shrink-0"
                                                                            title="تشغيل مباشر"
                                                                        >
                                                                            <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                                                                                <path d="M8 5v14l11-7z" />
                                                                            </svg>
                                                                        </button>
                                                                    </div>
                                                                </Link>
                                                            );
                                                        }

                                                        if (isInternal) {
                                                            return (
                                                                <Link
                                                                    href={href}
                                                                    className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline"
                                                                >
                                                                    {props.children}
                                                                </Link>
                                                            );
                                                        }
                                                        return <a {...props} target="_blank" rel="noopener noreferrer" className="text-emerald-600 dark:text-emerald-400 hover:underline" />;
                                                    }
                                                }}
                                            >
                                                {m.content}
                                            </ReactMarkdown>
                                        )}
                                    </div>
                                    {/* Show "Thinking..." if content is empty but message exists (e.g. tool call) */}
                                    {!m.content && m.role === 'assistant' && (
                                        <span className="text-xs italic opacity-50 flex items-center gap-1 mt-1">
                                            <span>⚡</span>
                                            جاري البحث عن المطلوب...
                                        </span>
                                    )}
                                    {/* Show explicit tool invocations if available */}
                                    {m.toolInvocations?.map((tool: any, idx: number) => (
                                        <div key={idx} className="mt-2 text-xs bg-slate-100 dark:bg-slate-800 p-2 rounded border border-slate-200 dark:border-slate-600">
                                            <div className="font-mono text-emerald-600">{tool.toolName}</div>
                                            <div className="opacity-70 truncate">{JSON.stringify(tool.args)}</div>
                                            {'result' in tool && <div className="mt-1 text-slate-500 border-t pt-1">✅ تم</div>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}

                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="bg-white dark:bg-slate-700 rounded-2xl px-4 py-2 rounded-bl-none shadow-sm flex flex-col gap-1 min-w-[100px]">
                                    {statusText && <span className="text-xs text-emerald-500 animate-pulse">{statusText}</span>}
                                    <div className="flex items-center gap-1">
                                        <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                                        <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                                        <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" />
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-4 bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700">
                        <form onSubmit={handleFormSubmit} className="relative">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="اكتب سؤالك هنا..."
                                className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm focus:outline-none focus:border-emerald-500"
                                disabled={isLoading}
                            />
                            <button
                                type="submit"
                                disabled={isLoading || !input.trim()}
                                className="absolute left-1.5 top-1.5 bottom-1.5 w-9 h-9 flex items-center justify-center bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 text-white rounded-lg transition-all"
                            >
                                <svg className="w-4 h-4 -rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                </svg>
                            </button>
                        </form>
                    </div>
                </div>
            )}
            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar { width: 5px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
            `}</style>
        </>
    );
}

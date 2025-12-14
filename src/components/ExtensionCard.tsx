
import { useRef, useEffect } from 'react';
import gsap from 'gsap';
import { Phone, PhoneOff, Edit } from 'lucide-react';
import { Extension, ActiveCallDetails } from '@/types/pbx';

interface ExtensionCardProps {
    ext: Extension;
    onCall?: () => void;
    onEdit?: () => void;
    onHangup?: () => void;
    activeCall?: ActiveCallDetails | null;
    heightClass?: string;
}

export const ExtensionCard = ({ ext, onCall, onEdit, onHangup, activeCall, heightClass = "h-[120px]" }: ExtensionCardProps) => {
    const cardRef = useRef<HTMLDivElement>(null)
    const status = ext.status?.toLowerCase() || 'offline';

    // Helper to determine active text color vs muted
    const isOffline = (s: string) => !['online', 'idle', 'ringing', 'busy', 'incall', 'calling', 'connected'].includes(s);
    const offline = isOffline(status);

    const getStatusStyle = (status: string | undefined) => {
        const s = status?.toLowerCase() || 'offline';
        if (s === 'online' || s === 'idle') return "bg-gradient-to-br from-emerald-500 to-teal-600 text-white border-emerald-400/20 shadow-lg shadow-emerald-500/20";
        if (s === 'ringing') return "bg-gradient-to-br from-orange-400 to-amber-500 text-white border-orange-400/20 shadow-lg shadow-orange-500/20 ring-2 ring-orange-300/50";
        if (s === 'calling' || s === 'dialing') return "bg-gradient-to-br from-blue-500 to-cyan-600 text-white border-blue-400/20 shadow-lg shadow-blue-500/20";
        if (s === 'incall' || s === 'connected' || s === 'answer') return "bg-gradient-to-br from-purple-500 to-violet-600 text-white border-purple-400/20 shadow-lg shadow-purple-500/20";
        if (s === 'busy') return "bg-gradient-to-br from-rose-500 to-red-600 text-white border-rose-400/20 shadow-lg shadow-rose-500/20";

        return "bg-gray-200 dark:bg-secondary text-card-foreground border-border hover:border-primary/50 hover:shadow-md";
    }

    const getStatusColor = () => {
        if (status === 'online' || status === 'idle') return "bg-emerald-500";
        if (status === 'ringing') return "bg-orange-500";
        if (status === 'calling' || status === 'dialing') return "bg-blue-500";
        if (status === 'incall' || status === 'connected' || status === 'answer') return "bg-purple-500";
        if (status === 'busy') return "bg-rose-500";
        return "bg-neutral-500";
    }

    const getBorderGradient = () => {
        if (status === 'online' || status === 'idle') return "from-emerald-300/50 to-emerald-600/50";
        if (status === 'ringing') return "from-orange-300/80 to-amber-600/80";
        if (status === 'calling' || status === 'dialing') return "from-blue-300/80 to-cyan-600/80";
        if (status === 'incall' || status === 'connected' || status === 'answer') return "from-purple-300/80 to-violet-600/80";
        if (status === 'busy') return "from-rose-300/80 to-red-600/80";
        return "from-white/20 to-transparent";
    }

    // Check if involved in active call (deprecated for button visibility, useful for visuals if needed)
    const isCaller = activeCall?.from === ext.extensionId || activeCall?.from === ext.mobileNumber;
    const isCallee = activeCall?.to === ext.extensionId || activeCall?.to === ext.mobileNumber;

    // Show Hangup if status implies an active call/attempt
    const showHangup = ['ringing', 'busy', 'incall', 'connected', 'calling', 'dialing'].includes(status);

    useEffect(() => {
        if (!cardRef.current) return;

        gsap.killTweensOf(cardRef.current);
        gsap.set(cardRef.current, { rotation: 0, scale: 1 });

        if (status === 'ringing') {
            const tl = gsap.timeline({ repeat: -1, repeatDelay: 0.1 });
            tl.to(cardRef.current, { rotation: 2, duration: 0.05 })
                .to(cardRef.current, { rotation: -2, duration: 0.05 })
                .to(cardRef.current, { rotation: 2, duration: 0.05 })
                .to(cardRef.current, { rotation: -2, duration: 0.05 })
                .to(cardRef.current, { rotation: 0, duration: 0.05 });
        } else if (status === 'calling' || status === 'dialing') {
            gsap.to(cardRef.current, {
                scale: 1.02,
                duration: 0.5,
                yoyo: true,
                repeat: -1,
                ease: "power1.inOut"
            });
        } else if (status === 'incall' || status === 'connected' || status === 'answer') {
            gsap.to(cardRef.current, {
                boxShadow: "0px 0px 20px rgba(168, 85, 247, 0.5)", // Purple-500
                duration: 1,
                yoyo: true,
                repeat: -1
            });
        } else if (status === 'busy') {
            gsap.to(cardRef.current, {
                boxShadow: "0px 0px 20px rgba(244, 63, 94, 0.5)", // Rose-500
                duration: 1,
                yoyo: true,
                repeat: -1
            });
        } else {
            gsap.to(cardRef.current, { rotation: 0, scale: 1, boxShadow: "none", duration: 0.2 });
        }
    }, [status])

    return (
        <div ref={cardRef} className="relative group">
            {/* Gradient Border Wrapper */}
            <div className={`absolute -inset-[1px] rounded-xl bg-gradient-to-br ${getBorderGradient()} z-0 opacity-70`} />

            {/* Main Card Content */}
            <div
                className={`
                    relative z-10 ${heightClass} rounded-xl p-3 flex flex-col justify-between 
                    transition-all hover:scale-[1.02] 
                    ${getStatusStyle(ext.status).replace(/border-\S+/g, 'border-none')} 
                `}
            >
                <div className="flex justify-between items-start">
                    <div className="flex flex-col gap-1.5">
                        <span className={`font-mono text-xl font-bold tracking-tight ${offline ? 'text-foreground' : 'text-white'}`}>
                            {ext.extensionId}
                        </span>

                        {/* Custom Badge with Dot */}
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-neutral-900 text-white w-fit shadow-sm">
                            <span className={`w-1.5 h-1.5 rounded-full ${getStatusColor()} animate-[pulse_3s_infinite]`} />
                            <span className="text-[8px] font-medium tracking-wide uppercase opacity-90">
                                {ext.status || 'Offline'}
                            </span>
                        </div>

                        {/* Call Direction Indicator */}
                        {isCaller && <span className="text-[8px] font-mono text-white/80">Outbound Call → {activeCall?.to}</span>}
                        {isCallee && <span className="text-[8px] font-mono text-white/80">Incoming Call ← {activeCall?.from}</span>}
                    </div>

                    <div className="flex gap-1.5">
                        {showHangup && onHangup ? (
                            <button
                                onClick={(e) => { e.stopPropagation(); onHangup(); }}
                                className="p-1.5 rounded-full transition-colors backdrop-blur-sm bg-red-500 text-white hover:bg-red-600 shadow-md animate-pulse"
                                title="Hangup"
                            >
                                <PhoneOff className="h-4 w-4" />
                            </button>
                        ) : onCall ? (
                            <button
                                onClick={(e) => { e.stopPropagation(); onCall(); }}
                                className={`
                                    p-1.5 rounded-full transition-colors backdrop-blur-sm
                                    ${offline
                                        ? 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                                        : 'bg-white/10 hover:bg-white/30 text-white shadow-sm'
                                    }
                                `}
                                title="Call"
                            >
                                <Phone className="h-4 w-4" />
                            </button>
                        ) : null}

                        {onEdit && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onEdit(); }}
                                className={`
                                    p-1.5 rounded-full transition-colors backdrop-blur-sm
                                    ${offline
                                        ? 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                                        : 'bg-white/10 hover:bg-white/30 text-white shadow-sm'
                                    }
                                `}
                                title="Edit"
                            >
                                <Edit className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                </div>

                <div className="overflow-hidden">
                    <p className={`font-medium text-[10px] truncate leading-tight ${offline ? 'text-muted-foreground' : 'text-white'}`}>
                        {ext.name || "Unknown"}
                    </p>
                    {ext.email && (
                        <p className={`text-[8px] truncate ${offline ? 'text-muted-foreground/60' : 'text-white/70'}`}>
                            {ext.email}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}

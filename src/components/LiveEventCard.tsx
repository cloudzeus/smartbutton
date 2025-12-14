
import { Activity, CheckCircle, XCircle, AlertTriangle, Info, Clock } from "lucide-react";

interface LiveEvent {
    id: string
    timestamp: string
    eventName: string
    category: string
    message: string
    severity: string
}

export const LiveEventCard = ({ event }: { event: LiveEvent }) => {

    const getStyle = (severity: string) => {
        switch (severity) {
            case 'SUCCESS': return "bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20 border-emerald-400/20";
            case 'ERROR': return "bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-lg shadow-rose-500/20 border-rose-400/20";
            case 'WARNING': return "bg-gradient-to-br from-orange-400 to-amber-500 text-white shadow-lg shadow-orange-500/20 border-orange-400/20";
            case 'INFO':
            case 'LOG':
                return "bg-gradient-to-br from-blue-500 to-cyan-600 text-white shadow-lg shadow-blue-500/20 border-blue-400/20";
            default: return "bg-card text-card-foreground border-border hover:shadow-md bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-800 dark:to-slate-900";
        }
    }

    const getIcon = (severity: string) => {
        switch (severity) {
            case 'SUCCESS': return <CheckCircle className="h-4 w-4 text-emerald-100" />;
            case 'ERROR': return <XCircle className="h-4 w-4 text-rose-100" />;
            case 'WARNING': return <AlertTriangle className="h-4 w-4 text-amber-100" />;
            default: return <Info className="h-4 w-4 text-blue-100" />;
        }
    }

    // Parsing logic for JSON message
    const renderMessage = (msg: string) => {
        try {
            if (msg && msg.trim().startsWith('{')) {
                const parsed = JSON.parse(msg);
                return (
                    <div className="space-y-0.5">
                        {parsed.operation && (
                            <div className="font-bold uppercase text-[9px] opacity-90">
                                {parsed.operation.replace(/_/g, ' ')}
                            </div>
                        )}
                        {parsed.extension && (
                            <div className="flex gap-2">
                                <span className="opacity-70">Ext:</span>
                                <span className="font-mono font-semibold">{parsed.extension}</span>
                            </div>
                        )}
                        {parsed.call_id && (
                            <div className="flex gap-2">
                                <span className="opacity-70">ID:</span>
                                <span className="font-mono opacity-80 truncate max-w-[100px]">{parsed.call_id}</span>
                            </div>
                        )}
                        {parsed.from && <div className="flex gap-2"><span className="opacity-70">From:</span><span className="font-mono">{parsed.from}</span></div>}
                        {parsed.to && <div className="flex gap-2"><span className="opacity-70">To:</span><span className="font-mono">{parsed.to}</span></div>}

                        {!parsed.operation && !parsed.extension && (
                            <div>{JSON.stringify(parsed)}</div>
                        )}
                    </div>
                );
            }
            return msg;
        } catch { return msg; }
    }

    const styleClass = getStyle(event.severity);
    const isDefault = !['SUCCESS', 'ERROR', 'WARNING', 'INFO', 'LOG'].includes(event.severity);

    return (
        <div className={`relative group rounded-xl p-3 flex flex-col justify-between transition-all hover:scale-[1.02] border ${styleClass}`}>
            {/* Header */}
            <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-1.5">
                    {getIcon(event.severity)}
                    <span className={`text-[9px] font-bold uppercase tracking-wider opacity-90 ${isDefault ? 'text-muted-foreground' : 'text-white'}`}>
                        {event.category}
                    </span>
                </div>
                <div className="flex items-center gap-1 opacity-70">
                    <Clock className="h-3 w-3" />
                    <span className="text-[9px] font-mono">
                        {new Date(event.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden">
                <h4 className={`text-xs font-bold leading-tight mb-1 truncate ${isDefault ? 'text-foreground' : 'text-white'}`}>
                    {event.eventName}
                </h4>
                <div className={`text-[10px] leading-relaxed ${isDefault ? 'text-muted-foreground' : 'text-white/90'} overflow-ellipsis overflow-hidden`}>
                    {renderMessage(event.message)}
                </div>
            </div>
        </div>
    )
}

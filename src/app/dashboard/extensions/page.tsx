"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Plus, RefreshCcw, RefreshCw, Search, Trash2, Edit, Phone, Wifi, WifiOff, LayoutGrid, List,
    Copy, CheckCircle, PhoneOff
} from 'lucide-react'
import { Checkbox } from "@/components/ui/checkbox"
import { useSession } from "next-auth/react"
import { useRef } from "react"
import gsap from "gsap"
import { ExtensionCard } from '@/components/ExtensionCard';
import { Extension, ActiveCallDetails } from '@/types/pbx';





export default function ExtensionsPage() {
    const { data: session } = useSession()
    const isAdmin = session?.user?.role === 'ADMIN'

    const [extensions, setExtensions] = useState<Extension[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid')

    // Call Feature States
    const [isCallDialogOpen, setIsCallDialogOpen] = useState(false)
    const [callingExtension, setCallingExtension] = useState<Extension | null>(null)
    const [callerId, setCallerId] = useState("")

    // New Phone Controller State
    const [callStatus, setCallStatus] = useState<'idle' | 'calling' | 'ringing' | 'connected' | 'ended' | 'failed'>('idle')
    const [activeCallId, setActiveCallId] = useState<string | null>(null)
    const [activeCallDetails, setActiveCallDetails] = useState<ActiveCallDetails | null>(null)
    const [autoAnswer, setAutoAnswer] = useState(false)

    // Audio Ref for ringing
    const audioRef = useRef<HTMLAudioElement | null>(null);
    // Announcement Ref
    const announcementRef = useRef<HTMLAudioElement | null>(null);
    const hasPlayedAnnouncement = useRef(false);

    // Reset announcement flag on new call
    useEffect(() => {
        hasPlayedAnnouncement.current = false;
        if (announcementRef.current) {
            announcementRef.current.pause();
            announcementRef.current = null;
        }
    }, [activeCallId]);

    // Audio Logic: Play if any extension is ringing
    useEffect(() => {
        const isAnyRinging = extensions.some(ext => ext.status?.toLowerCase() === 'ringing');

        if (isAnyRinging) {
            if (!audioRef.current) {
                audioRef.current = new Audio('/phonering.mp3');
                audioRef.current.loop = true;
                // Fallback for looping issues
                audioRef.current.addEventListener('ended', () => {
                    audioRef.current?.play().catch(() => { });
                });
            }

            // Ensure loop is set
            audioRef.current.loop = true;

            // Only play if not already playing or if ended
            if (audioRef.current.paused || audioRef.current.ended) {
                const playPromise = audioRef.current.play();
                if (playPromise !== undefined) {
                    playPromise.catch(error => {
                        console.log("Audio playback failed:", error);
                    });
                }
            }
        } else {
            if (audioRef.current && !audioRef.current.paused) {
                audioRef.current.pause();
                audioRef.current.currentTime = 0;
            }
        }
    }, [extensions]);

    // Polling for status updates
    useEffect(() => {
        fetchExtensions();
        const interval = setInterval(fetchExtensions, 3000);
        return () => {
            clearInterval(interval);
            // Cleanup audio on unmount
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
        }
    }, []);

    // Background Job: Cleanup Stale Calls (Timeout > 1m)
    useEffect(() => {
        const runCleanup = () => {
            fetch('/api/pbx/jobs/timeout', { method: 'POST' }).catch(e => console.error("Cleanup job failed", e));
        };
        // Run periodically
        const interval = setInterval(runCleanup, 15000);
        return () => clearInterval(interval);
    }, []);

    // Additional Poll for Active Call specific details (fast poll)
    useEffect(() => {
        if (!activeCallId) return;
        const checkStatus = async () => {
            try {
                const res = await fetch(`/api/pbx/call/status?callId=${activeCallId}`);

                // Handle 404 (Call Gone/Not Found) - Stop polling
                if (res.status === 404) {
                    console.warn("Call not found (404), assumed ended.");
                    setCallStatus('ended');
                    setActiveCallId(null);
                    setIsCallDialogOpen(false);
                    return;
                }

                const data = await res.json();

                if (data.success && data.data) {
                    const s = data.data.status?.toLowerCase() || '';
                    let newStatus: any = callStatus;

                    if (s.includes('ring') || s.includes('progress') || s.includes('alert')) newStatus = 'ringing';
                    else if (s.includes('connect') || s.includes('link') || s.includes('up') || s.includes('answer')) newStatus = 'connected';
                    else if (s.includes('end') || s.includes('hangup') || s.includes('complete') || s.includes('bye') || s.includes('term')) newStatus = 'ended';
                    else if (s.includes('fail') || s.includes('busy') || s.includes('cancel')) newStatus = 'failed';
                    else if (s === 'active') newStatus = 'calling';

                    // CLOSE MODAL ON RINGING OR CONNECTED
                    if ((newStatus === 'ringing' || newStatus === 'connected') && isCallDialogOpen) {
                        console.log("Closing modal due to status:", newStatus);
                        setIsCallDialogOpen(false);
                    }

                    if (newStatus !== callStatus) {
                        setCallStatus(newStatus);
                    }

                    // Play Announcement on Connect (Once)
                    if (newStatus === 'connected' && !hasPlayedAnnouncement.current) {
                        hasPlayedAnnouncement.current = true;
                        const callerNum = data.data.fromNumber;
                        if (callerNum) {
                            console.log("Announcement: Playing for caller", callerNum);
                            const audio = new Audio(`/api/pbx/announcement?caller=${encodeURIComponent(callerNum)}`);
                            announcementRef.current = audio;
                            audio.play().catch(e => console.error("Announcement playback failed:", e));
                        }
                    }

                    // Update active call details for UI
                    setActiveCallDetails({
                        callId: activeCallId,
                        from: data.data.fromNumber,
                        to: data.data.toNumber,
                        status: newStatus
                    });
                }
            } catch (e) {
                console.error("Failed to poll call status", e);
            }
        };
        const timer = setInterval(checkStatus, 1000);
        return () => clearInterval(timer);
    }, [activeCallId, callStatus, isCallDialogOpen]);

    const getStatusStyle = (status: string | undefined | null) => {
        const s = status?.toLowerCase() || 'offline';
        // Sleek gradients for "active" states
        if (s === 'online' || s === 'idle') return "bg-gradient-to-br from-emerald-500 to-teal-600 text-white border-emerald-400/20 shadow-lg shadow-emerald-500/20";
        if (s === 'ringing') return "bg-gradient-to-br from-orange-400 to-amber-500 text-white border-orange-400/20 shadow-lg shadow-orange-500/20 ring-2 ring-orange-300/50";
        if (s === 'calling' || s === 'dialing') return "bg-gradient-to-br from-blue-500 to-cyan-600 text-white border-blue-400/20 shadow-lg shadow-blue-500/20";
        if (s === 'busy' || s === 'incall' || s === 'connected') return "bg-gradient-to-br from-rose-500 to-red-600 text-white border-rose-400/20 shadow-lg shadow-rose-500/20";

        // Offline / Default
        return "bg-gray-200 dark:bg-secondary text-card-foreground border-border hover:border-primary/50 hover:shadow-md";
    }

    // Helper to determine active text color vs muted depending on background
    const isOffline = (status: string | undefined | null) => {
        const s = status?.toLowerCase() || 'offline';
        return !['online', 'idle', 'ringing', 'busy', 'incall', 'calling', 'connected'].includes(s);
    }

    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingExtension, setEditingExtension] = useState<Extension | null>(null)
    const [copiedField, setCopiedField] = useState<string | null>(null)

    const [formData, setFormData] = useState({
        extensionId: "",
        name: "",
        sipServer: "",
        sipUser: "",
        sipPassword: "",
    })
    const [syncToPbx, setSyncToPbx] = useState(false)



    // Reset state when closing dialog
    useEffect(() => {
        if (!isCallDialogOpen) {
            // If call ended or idle, reset completely. 
            // If connected, we might want to keep activeCallId if we support background calls, 
            // but for now we reset UI state if user closes it (or we warned them).
            if (callStatus === 'ended' || callStatus === 'failed') {
                setCallStatus('idle')
                setActiveCallId(null)
                setCallerId("")
            }
        }
    }, [isCallDialogOpen, callStatus])

    // Poll for active call status
    useEffect(() => {
        if (!activeCallId || callStatus === 'ended' || callStatus === 'failed' || callStatus === 'idle') return;

        const checkStatus = async () => {
            try {
                const res = await fetch(`/api/pbx/call/status?callId=${activeCallId}`);
                const data = await res.json();

                if (data.success && data.data) {
                    const s = data.data.status?.toLowerCase() || '';

                    // Map backend status to frontend status
                    // Explicitly type newStatus to avoid narrowing issues from the early return above
                    let newStatus: 'idle' | 'calling' | 'ringing' | 'connected' | 'ended' | 'failed' = callStatus;

                    if (s.includes('ring')) newStatus = 'ringing';
                    else if (s.includes('connect') || s.includes('link') || s.includes('up') || s.includes('answer')) newStatus = 'connected';
                    else if (s.includes('end') || s.includes('hangup') || s.includes('complete') || s.includes('bye')) newStatus = 'ended';
                    else if (s.includes('fail') || s.includes('busy') || s.includes('cancel')) newStatus = 'failed';
                    else if (s === 'active') newStatus = 'calling'; // Default active but unknown state

                    if (newStatus !== callStatus) {
                        setCallStatus(newStatus);
                    }
                }
            } catch (e) {
                console.error("Failed to poll call status", e);
            }
        };

        // Poll every 1s
        const timer = setInterval(checkStatus, 1000);
        return () => clearInterval(timer);
    }, [activeCallId, callStatus]);

    // Bulk selection state
    const [selectedExtensions, setSelectedExtensions] = useState<string[]>([])

    const toggleSelectAll = () => {
        if (selectedExtensions.length === extensions.length) {
            setSelectedExtensions([])
        } else {
            setSelectedExtensions(extensions.map(ext => ext.id))
        }
    }

    const toggleSelectExtension = (id: string) => {
        if (selectedExtensions.includes(id)) {
            setSelectedExtensions(selectedExtensions.filter(extId => extId !== id))
        } else {
            setSelectedExtensions([...selectedExtensions, id])
        }
    }

    const handleBulkDelete = async () => {
        if (!confirm(`Are you sure you want to delete ${selectedExtensions.length} extensions?`)) {
            return
        }

        setIsLoading(true)
        try {
            // Execute deletions in parallel
            await Promise.all(selectedExtensions.map(id =>
                fetch(`/api/extensions/${id}`, { method: 'DELETE' })
            ))

            alert("Selected extensions deleted successfully")
            setSelectedExtensions([])
            fetchExtensions()
        } catch (error) {
            console.error("Error performing bulk delete:", error)
            alert("Failed to delete some extensions")
        } finally {
            setIsLoading(false)
        }
    }

    const handleCallClick = (extension: Extension) => {
        setCallingExtension(extension)
        setCallerId("") // Clear previous input
        setCallStatus('idle')
        setActiveCallId(null) // Ensure no active call is tracked
        setActiveCallDetails(null)
        setIsCallDialogOpen(true)
    }

    const handleCallSubmit = async () => {
        if (!callingExtension || !callerId) {
            return
        }

        setCallStatus('calling');

        try {
            const response = await fetch("/api/pbx/call/dial", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    caller: callingExtension.extensionId, // SOURCE: The extension card you clicked (YOUR phone)
                    callee: callerId, // DESTINATION: The number you typed (who to call)
                    auto_answer: autoAnswer
                }),
            })

            const data = await response.json()

            if (data.success) {
                // We got a success, maybe with a data.data.call_id
                const callId = data.data?.call_id || data.data?.callid || data.data?.callId;
                if (callId) {
                    setActiveCallId(callId);
                    // Stay 'calling'
                } else {
                    setCallStatus('ringing');
                }
                // Notify user to pick up
                alert(`Call Initiated! Please ANSWER your extension (${callingExtension.extensionId}) to connect to ${callerId}.`);
            } else {
                setCallStatus('failed');
                alert(data.error || "Failed to initiate call")
            }
        } catch (error) {
            console.error("Error making call:", error)
            setCallStatus('failed');
            alert("Failed to make call")
        }
    }

    const handleHangup = async (ext?: Extension) => {
        const targetExtId = ext?.extensionId || callingExtension?.extensionId;
        // Allow hangup if we have an extension ID OR an active call ID
        if (!activeCallId && !targetExtId) return;

        try {
            const response = await fetch("/api/pbx/call/hangup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    callId: activeCallId,
                    extension: targetExtId
                }),
            })

            setCallStatus('ended');
            setTimeout(() => {
                if (isCallDialogOpen) setIsCallDialogOpen(false);
                setCallStatus('idle');
            }, 1000);

        } catch (error) {
            console.error("Hangup failed", error);
        }
    }

    useEffect(() => {
        fetchExtensions()
    }, [])

    const fetchExtensions = async () => {
        try {
            const response = await fetch("/api/extensions")
            const data = await response.json()

            if (data.success) {
                setExtensions(data.extensions)
            }
        } catch (error) {
            console.error("Error fetching extensions:", error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        try {
            const url = editingExtension
                ? `/api/extensions/${editingExtension.id}`
                : "/api/extensions"

            const body = {
                ...formData,
                syncToPbx: !editingExtension && syncToPbx
            }

            const response = await fetch(url, {
                method: editingExtension ? "PUT" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            })

            const data = await response.json()

            if (data.success) {
                alert(editingExtension ? "Extension updated!" : "Extension created!")
                setIsDialogOpen(false)
                resetForm()
                fetchExtensions()
            } else {
                alert(data.error || "Failed to save extension")
            }
        } catch (error) {
            console.error("Error saving extension:", error)
            alert("Failed to save extension")
        }
    }

    const handleEdit = (extension: Extension) => {
        setEditingExtension(extension)
        setFormData({
            extensionId: extension.extensionId,
            name: extension.name || "",
            sipServer: extension.sipServer || "",
            sipUser: extension.sipUser || "",
            sipPassword: extension.sipPassword || "",
        })
        setIsDialogOpen(true)
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this extension?")) {
            return
        }

        try {
            const response = await fetch(`/api/extensions/${id}`, {
                method: "DELETE",
            })

            const data = await response.json()

            if (data.success) {
                alert("Extension deleted!")
                fetchExtensions()
            }
        } catch (error) {
            console.error("Error deleting extension:", error)
            alert("Failed to delete extension")
        }
    }

    const resetForm = () => {
        setFormData({
            extensionId: "",
            name: "",
            sipServer: "",
            sipUser: "",
            sipPassword: "",
        })
        setEditingExtension(null)
    }

    const copyToClipboard = (text: string, field: string) => {
        navigator.clipboard.writeText(text)
        setCopiedField(field)
        setTimeout(() => setCopiedField(null), 2000)
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="page-header">
                    <h1>Extensions</h1>
                    <p>
                        Manage PBX extensions and SIP configurations
                    </p>
                </div>
                <div className="flex gap-2">
                    {selectedExtensions.length > 0 && (
                        <Button
                            variant="destructive"
                            onClick={handleBulkDelete}
                            className="gap-2"
                        >
                            <Trash2 className="h-4 w-4" />
                            Delete ({selectedExtensions.length})
                        </Button>
                    )}
                    <Button
                        variant="outline"
                        onClick={async () => {
                            if (confirm('Sync extensions from Yeastar PBX? This will import new extensions.')) {
                                setIsLoading(true);
                                try {
                                    const res = await fetch('/api/extensions/sync', { method: 'POST' });
                                    const data = await res.json();
                                    if (data.success) {
                                        alert(data.message);
                                        fetchExtensions();
                                    } else {
                                        alert('Sync failed: ' + data.error);
                                    }
                                } catch (e) {
                                    alert('Sync error');
                                } finally {
                                    setIsLoading(false);
                                }
                            }
                        }}
                        className="gap-2"
                    >
                        <RefreshCw className="h-4 w-4" />
                        Sync from PBX
                    </Button>
                    <Button
                        onClick={() => {
                            resetForm()
                            setIsDialogOpen(true)
                        }}
                        className="gap-2"
                    >
                        <Plus className="h-4 w-4" />
                        Add Extension
                    </Button>
                </div>
            </div>

            {/* Controls Row */}
            <div className="flex items-center justify-between gap-4">
                <div className="flex bg-muted p-1 rounded-lg">
                    <Button
                        variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => setViewMode('grid')}
                        className="h-8 w-8 p-0"
                    >
                        <LayoutGrid className="h-4 w-4" />
                    </Button>
                    <Button
                        variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => setViewMode('list')}
                        className="h-8 w-8 p-0"
                    >
                        <List className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            <Card className="border-none shadow-none bg-transparent">
                {/* No Header for Grid View to keep it clean, or optional */}
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="text-center py-8 text-muted-foreground">
                            Loading extensions...
                        </div>
                    ) : extensions.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <Phone className="h-12 w-12 mx-auto mb-2 opacity-50" />
                            <p>No extensions configured yet.</p>
                        </div>
                    ) : (
                        viewMode === 'grid' ? (
                            <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
                                {extensions.map(ext => (
                                    <ExtensionCard
                                        key={ext.id}
                                        ext={ext}
                                        onCall={() => handleCallClick(ext)}
                                        onEdit={() => handleEdit(ext)}
                                        onHangup={() => handleHangup(ext)}
                                        activeCall={activeCallDetails}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="overflow-x-auto rounded-lg border bg-card">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[50px]">
                                                <Checkbox
                                                    checked={extensions.length > 0 && selectedExtensions.length === extensions.length}
                                                    onCheckedChange={toggleSelectAll}
                                                />
                                            </TableHead>
                                            <TableHead>Extension</TableHead>
                                            <TableHead>Name</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {extensions.map((ext) => (
                                            <TableRow key={ext.id}>
                                                <TableCell>
                                                    <Checkbox
                                                        checked={selectedExtensions.includes(ext.id)}
                                                        onCheckedChange={() => toggleSelectExtension(ext.id)}
                                                    />
                                                </TableCell>
                                                <TableCell className="font-mono font-semibold">
                                                    {ext.extensionId}
                                                </TableCell>
                                                <TableCell>{ext.name || "-"}</TableCell>
                                                <TableCell>
                                                    <Badge
                                                        className={getStatusStyle(ext.status).replace('bg-gradient-to-br', '').split(' ')[0] + ' bg-opacity-10 text-xs'}
                                                        variant="outline"
                                                    >
                                                        {ext.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex gap-2">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleCallClick(ext)}
                                                            title="Call this extension"
                                                        >
                                                            <Phone className="h-3 w-3" />
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleEdit(ext)}
                                                        >
                                                            <Edit className="h-3 w-3" />
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleDelete(ext.id)}
                                                        >
                                                            <Trash2 className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )
                    )}
                </CardContent>
            </Card>

            {/* existing Dialog for Add/Edit */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>
                            {editingExtension ? "Edit Extension" : "Add Extension"}
                        </DialogTitle>
                        <DialogDescription>
                            Configure SIP extension settings for testing
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit}>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="extensionId">Extension Number *</Label>
                                    <Input
                                        id="extensionId"
                                        value={formData.extensionId}
                                        onChange={(e) =>
                                            setFormData({ ...formData, extensionId: e.target.value })
                                        }
                                        placeholder="100"
                                        required
                                        disabled={!!editingExtension}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="name">Display Name</Label>
                                    <Input
                                        id="name"
                                        value={formData.name}
                                        onChange={(e) =>
                                            setFormData({ ...formData, name: e.target.value })
                                        }
                                        placeholder="Reception"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="sipServer">SIP Server</Label>
                                <div className="flex gap-2">
                                    <Input
                                        id="sipServer"
                                        value={formData.sipServer}
                                        onChange={(e) =>
                                            setFormData({ ...formData, sipServer: e.target.value })
                                        }
                                        placeholder="sip.example.com or 192.168.1.100"
                                        className="font-mono"
                                    />
                                    {formData.sipServer && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() =>
                                                copyToClipboard(formData.sipServer, "server")
                                            }
                                        >
                                            {copiedField === "server" ? (
                                                <CheckCircle className="h-4 w-4" />
                                            ) : (
                                                <Copy className="h-4 w-4" />
                                            )}
                                        </Button>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="sipUser">SIP Username</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            id="sipUser"
                                            value={formData.sipUser}
                                            onChange={(e) =>
                                                setFormData({ ...formData, sipUser: e.target.value })
                                            }
                                            placeholder="100"
                                            className="font-mono"
                                        />
                                        {formData.sipUser && (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() =>
                                                    copyToClipboard(formData.sipUser, "user")
                                                }
                                            >
                                                {copiedField === "user" ? (
                                                    <CheckCircle className="h-4 w-4" />
                                                ) : (
                                                    <Copy className="h-4 w-4" />
                                                )}
                                            </Button>
                                        )}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="sipPassword">SIP Password</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            id="sipPassword"
                                            type="password"
                                            value={formData.sipPassword}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    sipPassword: e.target.value,
                                                })
                                            }
                                            placeholder="••••••••"
                                            className="font-mono"
                                        />
                                        {formData.sipPassword && (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() =>
                                                    copyToClipboard(formData.sipPassword, "password")
                                                }
                                            >
                                                {copiedField === "password" ? (
                                                    <CheckCircle className="h-4 w-4" />
                                                ) : (
                                                    <Copy className="h-4 w-4" />
                                                )}
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-lg bg-muted p-4 text-xs text-muted-foreground">
                                <p className="font-semibold mb-2">SIP Client Configuration:</p>
                                <ul className="space-y-1 list-disc list-inside">
                                    <li>Use these credentials in your SIP client (softphone)</li>
                                    <li>Transport: UDP (default port 5060) or TCP</li>
                                    <li>Codec: G.711 (PCMU/PCMA) recommended</li>
                                    <li>STUN server: Optional for NAT traversal</li>
                                </ul>
                            </div>

                            {!editingExtension && (
                                <div className="flex items-center space-x-2 pt-2">
                                    <Checkbox
                                        id="syncToPbx"
                                        checked={syncToPbx}
                                        onCheckedChange={(checked) => setSyncToPbx(!!checked)}
                                    />
                                    <Label htmlFor="syncToPbx">Create on PBX (Yeastar)</Label>
                                </div>
                            )}
                        </div>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    setIsDialogOpen(false)
                                    resetForm()
                                }}
                            >
                                Cancel
                            </Button>
                            <Button type="submit">
                                {editingExtension ? "Update" : "Create"} Extension
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Call Dialog / Phone Controller */}
            <Dialog open={isCallDialogOpen} onOpenChange={(open) => {
                // Prevent closing if call is active unless explicitly stopped? 
                // For now, allow close but maybe warn? Or just close modal.
                if (!open && (callStatus === 'calling' || callStatus === 'connected')) {
                    if (!confirm("Call is active. Close control window?")) return;
                }
                setIsCallDialogOpen(open);
            }}>
                <DialogContent className="max-w-sm sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <span className="p-2 bg-primary/10 rounded-full">
                                <Phone className="h-5 w-5 text-primary" />
                            </span>
                            Phone Controller
                        </DialogTitle>
                        <DialogDescription>
                            Control call from <strong>{callingExtension?.name}</strong> ({callingExtension?.extensionId})
                        </DialogDescription>
                    </DialogHeader>

                    {/* Phone Status Display - Styled like Extension Card */}
                    <div className={`
                        flex flex-col items-center justify-center py-8 space-y-6 rounded-xl border
                        bg-gradient-to-br 
                        ${callStatus === 'idle' || callStatus === 'ended' ? "from-gray-100 to-gray-200 border-gray-200" : ""}
                        ${callStatus === 'calling' ? "from-blue-500/10 to-cyan-500/10 border-blue-200" : ""}
                        ${callStatus === 'ringing' ? "from-orange-500/10 to-amber-500/10 border-orange-200" : ""}
                        ${callStatus === 'connected' ? "from-emerald-500/10 to-teal-500/10 border-emerald-200" : ""}
                        ${callStatus === 'failed' ? "from-red-500/10 to-rose-500/10 border-red-200" : ""}
                    `}>
                        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-900 text-white shadow-sm">
                            <span className={`w-2 h-2 rounded-full animate-[pulse_3s_infinite]
                                ${callStatus === 'idle' ? "bg-emerald-500" : ""}
                                ${callStatus === 'calling' ? "bg-blue-500" : ""}
                                ${callStatus === 'ringing' ? "bg-orange-500" : ""}
                                ${callStatus === 'connected' ? "bg-rose-500" : ""}
                                ${callStatus === 'ended' ? "bg-gray-500" : ""}
                                ${callStatus === 'failed' ? "bg-red-500" : ""}
                            `} />
                            <span className="text-[10px] font-medium tracking-wide uppercase opacity-90">
                                {callStatus === 'idle' ? 'Ready' : callStatus}
                            </span>
                        </div>

                        <div className="text-center space-y-1">
                            <div className={`text-4xl font-mono font-bold tracking-tighter 
                                ${callStatus === 'calling' || callStatus === 'ringing' ? "animate-pulse" : ""}
                             `}>
                                {callerId || "..."}
                            </div>
                            <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                                Destination
                            </p>
                        </div>
                    </div>

                    {/* Controls */}
                    <div className="space-y-4 py-2">
                        {callStatus === 'idle' || callStatus === 'ended' || callStatus === 'failed' ? (
                            <>
                                <div className="space-y-2">
                                    <Label htmlFor="callerId" className="text-xs uppercase font-semibold text-muted-foreground">Number to Call</Label>
                                    <Input
                                        id="callerId"
                                        value={callerId}
                                        onChange={(e) => setCallerId(e.target.value)}
                                        placeholder="Extension or Mobile"
                                        autoFocus
                                        className="text-lg font-mono tracking-tight h-12"
                                    />
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="autoAnswer"
                                        checked={autoAnswer}
                                        onCheckedChange={(checked) => setAutoAnswer(!!checked)}
                                    />
                                    <Label htmlFor="autoAnswer" className="cursor-pointer">
                                        Enable Speakers (Auto-Answer)
                                    </Label>
                                </div>
                            </>
                        ) : (
                            <div className="text-center text-sm p-2 text-muted-foreground">
                                Call in progress...
                            </div>
                        )}
                    </div>

                    <DialogFooter className="sm:justify-between gap-2">
                        <div className="flex-1"></div> {/* Spacer */}

                        {(callStatus === 'idle' || callStatus === 'ended' || callStatus === 'failed') ? (
                            <div className="flex gap-2 w-full sm:w-auto">
                                <Button
                                    variant="outline"
                                    onClick={() => setIsCallDialogOpen(false)}
                                    className="flex-1 sm:flex-none"
                                >
                                    Close
                                </Button>
                                <Button
                                    onClick={handleCallSubmit}
                                    className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700"
                                    disabled={!callerId}
                                >
                                    <Phone className="mr-2 h-4 w-4" />
                                    Dial
                                </Button>
                            </div>
                        ) : (
                            <Button
                                onClick={() => handleHangup()}
                                variant="destructive"
                                className="w-full sm:w-auto"
                            >
                                <span className="mr-2 text-lg">■</span>
                                End Call
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

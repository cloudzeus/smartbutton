"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Phone, Activity, Wifi, WifiOff, Plus, CheckCircle, XCircle, Clock } from "lucide-react"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"

interface LiveEvent {
    id: string
    timestamp: string
    eventName: string
    category: string
    message: string
    severity: string
}


import { ExtensionCard } from "@/components/ExtensionCard"
import { LiveEventCard } from "@/components/LiveEventCard"
import { Extension } from "@/types/pbx"
import { AnimatePresence, motion } from "framer-motion"

export default function PBXStatusPage() {
    const [liveEvents, setLiveEvents] = useState<LiveEvent[]>([])
    const [extensions, setExtensions] = useState<Extension[]>([])
    const [isConnected, setIsConnected] = useState(false)
    const [isCreatingDemo, setIsCreatingDemo] = useState(false)
    const [systemInfo, setSystemInfo] = useState<any>(null)

    useEffect(() => {
        fetchExtensions()
        fetchSystemInfo()

        // Poll extensions every 3 seconds to keep status updated
        const extensionPoll = setInterval(fetchExtensions, 3000);

        // Setup SSE for real-time events
        const eventSource = new EventSource('/api/pbx/logs/stream')

        eventSource.onopen = () => {
            setIsConnected(true)
        }

        eventSource.onmessage = (event) => {
            const data = JSON.parse(event.data)

            if (data.type === 'logs' && data.logs.length > 0) {
                // Get the 6 most recent events, prepend new ones
                setLiveEvents(prev => [...data.logs.reverse(), ...prev].slice(0, 6))
                // Refresh extensions when events come in
                fetchExtensions()
            }
        }

        eventSource.onerror = () => {
            setIsConnected(false)
        }

        return () => {
            eventSource.close()
            clearInterval(extensionPoll)
        }
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
        }
    }

    const fetchSystemInfo = async () => {
        try {
            const res = await fetch('/api/pbx/info')
            const data = await res.json()
            if (data.success) {
                setSystemInfo(data.info)
            }
        } catch (e) {
            console.error('Failed to fetch PBX info', e)
        }
    }

    const createDemoExtensions = async () => {
        setIsCreatingDemo(true)

        const demoExtensions = [
            { extensionId: "100", name: "Reception", sipServer: "192.168.1.100", sipUser: "100", sipPassword: "demo100" },
            { extensionId: "101", name: "Room 101", sipServer: "192.168.1.100", sipUser: "101", sipPassword: "demo101" },
            { extensionId: "102", name: "Room 102", sipServer: "192.168.1.100", sipUser: "102", sipPassword: "demo102" },
            { extensionId: "103", name: "Room 103", sipServer: "192.168.1.100", sipUser: "103", sipPassword: "demo103" },
            { extensionId: "104", name: "Manager", sipServer: "192.168.1.100", sipUser: "104", sipPassword: "demo104" },
        ]

        try {
            for (const ext of demoExtensions) {
                await fetch("/api/extensions", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(ext),
                })
            }

            alert("Demo extensions created successfully!")
            fetchExtensions()
        } catch (error) {
            console.error("Error creating demo extensions:", error)
            alert("Failed to create demo extensions")
        } finally {
            setIsCreatingDemo(false)
        }
    }



    useEffect(() => {
        // Auto-cleanup events older than 15 seconds to keep the list "Real-Time"
        const interval = setInterval(() => {
            setLiveEvents(prev => {
                const now = Date.now();
                const fresh = prev.filter(e => {
                    const eventTime = new Date(e.timestamp).getTime();
                    return (now - eventTime) < 30000; // 30 seconds TTL
                });
                return fresh.length !== prev.length ? fresh : prev;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="page-header">
                    <h1>PBX Status</h1>
                    <p>
                        Real-time PBX monitoring and live events
                    </p>
                </div>
                <div className="flex gap-2">
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger>
                                <Badge variant={isConnected ? "connected" : "disconnected"} className="gap-1 cursor-help">
                                    {isConnected ? (
                                        <>
                                            <Wifi className="h-3 w-3" />
                                            Connected
                                        </>
                                    ) : (
                                        <>
                                            <WifiOff className="h-3 w-3" />
                                            Disconnected
                                        </>
                                    )}
                                </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                                {systemInfo ? (
                                    <div className="text-xs space-y-1">
                                        <p className="font-semibold">PBX System Info</p>
                                        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                            <span className="opacity-70">Product:</span>
                                            <span>{systemInfo.product_name}</span>
                                            <span className="opacity-70">Serial:</span>
                                            <span className="font-mono">{systemInfo.sn}</span>
                                            <span className="opacity-70">Version:</span>
                                            <span>{systemInfo.firmware}</span>
                                            <span className="opacity-70">Uptime:</span>
                                            <span>{systemInfo.uptime}</span>
                                        </div>
                                    </div>
                                ) : (
                                    <p>Loading PBX info...</p>
                                )}
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
            </div>

            {/* Extensions Overview */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <Phone className="h-5 w-5" />
                                Extensions
                            </CardTitle>
                            <CardDescription>
                                Configured PBX extensions
                            </CardDescription>
                        </div>
                        <Button
                            onClick={createDemoExtensions}
                            disabled={isCreatingDemo || extensions.length > 0}
                            className="gap-2"
                        >
                            <Plus className="h-4 w-4" />
                            Add Demo Extensions
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {extensions.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <Phone className="h-12 w-12 mx-auto mb-2 opacity-50" />
                            <p>No extensions configured yet.</p>
                            <p className="text-sm">Click "Add Demo Extensions" to get started.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
                            {extensions.map((ext) => (
                                <ExtensionCard key={ext.id} ext={ext} heightClass="h-[90px]" />
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Live Events */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5" />
                        Live Events
                    </CardTitle>
                    <CardDescription>
                        Real-time PBX events as they happen
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {liveEvents.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
                            <p>Waiting for PBX events...</p>
                            <p className="text-sm">Events will appear here in real-time</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-4">
                            <AnimatePresence mode="popLayout">
                                {liveEvents.map((event) => (
                                    <motion.div
                                        layout
                                        key={event.id}
                                        initial={{ opacity: 0, y: -20, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        <LiveEventCard event={event} />
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}

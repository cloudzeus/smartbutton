"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { RefreshCw, Search, Phone, Wifi, WifiOff, Battery, BatteryLow, AlertTriangle, Building2, Server } from "lucide-react"
import gsap from "gsap"

interface SystemViewRoom {
    id: string
    extensionId: string
    name: string | null
    status: string // PBX Extension Status
    roomNumber: string | null
    milesightDevices: {
        id: string
        deviceName: string
        attributes: any // { connectStatus: 'ONLINE'|'OFFLINE', electricity: number }
        lastSyncedAt: string
    }[]
}

export default function SystemViewPage() {
    const [rooms, setRooms] = useState<SystemViewRoom[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [searchTerm, setSearchTerm] = useState("")

    useEffect(() => {
        loadData()
        // Auto refresh every 3 seconds for real-time status (Ringing)
        const interval = setInterval(loadData, 3000)
        return () => clearInterval(interval)
    }, [])

    // Audio Ref for Ringing Sound
    const audioRef = useRef<HTMLAudioElement | null>(null)

    // GSAP Refs
    const cardRefs = useRef<{ [key: string]: HTMLDivElement | null }>({})

    // Initialize Audio
    useEffect(() => {
        if (typeof window !== 'undefined') {
            audioRef.current = new Audio('/phonering.mp3')
            audioRef.current.loop = true
        }
        return () => {
            if (audioRef.current) {
                audioRef.current.pause()
                audioRef.current = null
            }
        }
    }, [])

    // Play/Pause Audio based on Ringing State
    useEffect(() => {
        const isRinging = rooms.some(r => r.status?.toLowerCase() === 'ringing')

        if (isRinging) {
            // Attempt to play (browser might block if no interaction)
            audioRef.current?.play().catch((err: any) => {
                console.log("Audio play blocked (needs interaction):", err)
            })
        } else {
            audioRef.current?.pause()
            if (audioRef.current) audioRef.current.currentTime = 0
        }
    }, [rooms])

    // GSAP Animation Effect
    useEffect(() => {
        rooms.forEach((room) => {
            const el = cardRefs.current[room.id]
            if (!el) return

            const status = room.status?.toLowerCase()

            // Reset Animation
            gsap.killTweensOf(el)
            gsap.set(el, { rotation: 0, scale: 1, x: 0 })

            // Apply Animation based on Status (Matching ExtensionCard logic)
            if (status === 'ringing') {
                const tl = gsap.timeline({ repeat: -1, repeatDelay: 0.1 });
                tl.to(el, { rotation: 2, duration: 0.05 })
                    .to(el, { rotation: -2, duration: 0.05 })
                    .to(el, { rotation: 2, duration: 0.05 })
                    .to(el, { rotation: -2, duration: 0.05 })
                    .to(el, { rotation: 0, duration: 0.05 });
            }
            else if (status === 'calling' || status === 'dialing') {
                gsap.to(el, {
                    scale: 1.02,
                    duration: 0.5,
                    yoyo: true,
                    repeat: -1,
                    ease: "power1.inOut"
                });
            }
            // Add other status animations if needed, but Ringing is the priority request
        })
    }, [rooms]) // Re-run when rooms/status update

    const loadData = async () => {
        try {
            const response = await fetch('/api/system-view')
            const data = await response.json()
            if (data.success) {
                setRooms(data.rooms)
            }
        } catch (error) {
            console.error('Error loading system view:', error)
        } finally {
            setIsLoading(false)
            setIsRefreshing(false)
        }
    }

    // Refresh Logic
    const handleRefresh = () => {
        setIsRefreshing(true)
        loadData()
    }

    const filteredRooms = rooms.filter(room =>
        (room.roomNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
        room.extensionId.includes(searchTerm) ||
        (room.name?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
    )

    // Helper for PBX Extension Status Color
    const getExtensionStatusColor = (status: string) => {
        const s = status.toLowerCase()
        if (s === 'online' || s === 'idle') return 'bg-green-500 hover:bg-green-600'
        if (s === 'busy' || s === 'incall' || s === 'ringing') return 'bg-blue-500 hover:bg-blue-600'
        if (s === 'offline' || s === 'unavailable') return 'bg-gray-400 hover:bg-gray-500' // Visual noise reduction for offline
        return 'bg-gray-500'
    }

    // Helper for Smart Button Status Color
    const getDeviceStatusColor = (device: SystemViewRoom['milesightDevices'][0] | undefined) => {
        if (!device) return 'bg-orange-500 hover:bg-orange-600' // Missing device
        const status = device.attributes?.connectStatus?.toLowerCase()
        if (status === 'online') return 'bg-green-500 hover:bg-green-600'
        return 'bg-red-500 hover:bg-red-600' // Offline device is critical
    }

    // Stats
    const totalRooms = rooms.length
    const onlineExtensions = rooms.filter(r => ['online', 'idle', 'busy', 'incall', 'ringing'].includes(r.status.toLowerCase())).length
    const onlineButtons = rooms.filter(r => r.milesightDevices.length > 0 && r.milesightDevices[0].attributes?.connectStatus === 'ONLINE').length
    const missingButtons = rooms.filter(r => r.milesightDevices.length === 0).length

    return (
        <div className="space-y-4 h-[calc(100vh-4rem)] flex flex-col">
            <div className="flex items-center justify-between shrink-0 p-1">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Server className="h-6 w-6" />
                        System View
                    </h1>
                    <p className="text-muted-foreground text-sm">
                        Live monitoring of {totalRooms} rooms
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative w-64">
                        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search room, extension..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-8 h-9"
                        />
                    </div>
                    <Button
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                        variant="outline"
                        size="sm"
                        className="gap-2 h-9"
                    >
                        <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Status Summary Bar */}
            <div className="grid grid-cols-4 gap-3 shrink-0">
                <Card className="p-3 flex flex-col justify-center items-center bg-card/50">
                    <span className="text-xs text-muted-foreground uppercase font-bold">Total Rooms</span>
                    <span className="text-2xl font-bold">{totalRooms}</span>
                </Card>
                <Card className="p-3 flex flex-col justify-center items-center bg-card/50">
                    <span className="text-xs text-muted-foreground uppercase font-bold text-green-600">Ext. Online</span>
                    <span className="text-2xl font-bold text-green-600">{onlineExtensions}</span>
                </Card>
                <Card className="p-3 flex flex-col justify-center items-center bg-card/50">
                    <span className="text-xs text-muted-foreground uppercase font-bold text-blue-600">Button Online</span>
                    <span className="text-2xl font-bold text-blue-600">{onlineButtons}</span>
                </Card>
                <Card className="p-3 flex flex-col justify-center items-center bg-card/50">
                    <span className="text-xs text-muted-foreground uppercase font-bold text-orange-500">Missing/Issues</span>
                    <span className="text-2xl font-bold text-orange-500">{missingButtons + (rooms.length - onlineButtons)}</span>
                </Card>
            </div>

            {/* Main Grid */}
            <div className="flex-1 overflow-y-auto min-h-0 bg-muted/20 p-4 rounded-lg border">
                {isLoading ? (
                    <div className="flex h-full items-center justify-center text-muted-foreground">
                        Loading system status...
                    </div>
                ) : filteredRooms.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-muted-foreground flex-col gap-2">
                        <Building2 className="h-8 w-8 opacity-20" />
                        <p>No rooms found matching your search</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-8 xl:grid-cols-10 gap-3">
                        {filteredRooms.map((room) => {
                            const device = room.milesightDevices[0]
                            const battery = device?.attributes?.electricity
                            const isLowBattery = battery !== undefined && battery < 20


                            const status = room.status?.toLowerCase() || 'offline'
                            const isPbxActive = ['online', 'idle', 'ringing', 'busy', 'incall', 'calling', 'connected'].includes(status)
                            const isButtonOnline = device && device.attributes?.connectStatus === 'ONLINE'
                            const hasProblem = !isPbxActive || !isButtonOnline

                            // Correct text color logic: If problem OR active status, it's white text
                            const useWhiteText = hasProblem || status !== 'offline' // 'offline' is covered by hasProblem, so basically always white except maybe specialized idle?
                            // Actually, if we use gradients for everything now, text is always white.
                            // The only time it was dark was for the "white/gray" card style.
                            // If user wants "different gradient" for problems, it implies problems now use a gradient too (so white text).

                            // Status Style Logic (Matching Extensions Page but with Problem Override)
                            const getCardStyle = () => {
                                // 🚨 PROBLEM STATE (High Priority)
                                if (!isPbxActive || !isButtonOnline) {
                                    return "bg-gradient-to-br from-red-600 to-rose-700 border-red-500/30 text-white shadow-red-900/20"
                                }

                                // Normal Active States
                                if (status === 'online' || status === 'idle') return "bg-gradient-to-br from-emerald-500 to-teal-600 border-emerald-400/20 text-white"
                                if (status === 'ringing') return "bg-gradient-to-br from-orange-400 to-amber-500 border-orange-400/20 text-white ring-2 ring-orange-300/50"
                                if (status === 'calling' || status === 'dialing') return "bg-gradient-to-br from-blue-500 to-cyan-600 border-blue-400/20 text-white"
                                if (status === 'incall' || status === 'connected') return "bg-gradient-to-br from-purple-500 to-violet-600 border-purple-400/20 text-white"
                                if (status === 'busy') return "bg-gradient-to-br from-pink-500 to-rose-500 border-pink-400/20 text-white"

                                // Fallback (Should be caught by Problem State usually, but just in case)
                                return "bg-white dark:bg-zinc-900 border-border text-card-foreground"
                            }

                            // Dot Color Logic
                            const getDotColor = () => {
                                if (status === 'online' || status === 'idle') return "bg-emerald-500"
                                if (status === 'ringing') return "bg-orange-500"
                                if (status === 'calling' || status === 'dialing') return "bg-blue-500"
                                if (status === 'incall' || status === 'connected') return "bg-purple-500"
                                if (status === 'busy') return "bg-rose-500"
                                return "bg-neutral-400"
                            }

                            // Smart Button Status Color
                            const getButtonDotColor = () => {
                                if (!device) return "bg-orange-500"
                                if (device.attributes?.connectStatus === 'ONLINE') return "bg-blue-500"
                                return "bg-red-500"
                            }

                            return (
                                <Card
                                    key={room.id}
                                    ref={el => { if (el) cardRefs.current[room.id] = el }}
                                    className={`
                                        overflow-hidden transition-all hover:scale-[1.02] hover:shadow-lg
                                        ${getCardStyle()}
                                        border
                                    `}
                                >
                                    <div className="p-2 flex flex-col justify-between h-[65px]">
                                        {/* Top Section */}
                                        <div>
                                            <div className="flex items-start justify-between leading-none mb-0.5">
                                                <span className="text-sm font-bold text-white">
                                                    {room.roomNumber || <span className="opacity-50 text-xs">--</span>}
                                                </span>
                                                <span className="text-[9px] font-mono opacity-80 text-white/80">
                                                    #{room.extensionId}
                                                </span>
                                            </div>
                                            <div className="text-[9px] truncate text-white/70">
                                                {room.name || '-'}
                                            </div>
                                        </div>

                                        {/* Footer Badges */}
                                        <div className="flex items-end gap-1">
                                            {/* PBX Status Badge */}
                                            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-gray-900 text-white border border-white/10 shadow-sm h-4">
                                                <span className={`w-1 h-1 rounded-full ${getDotColor()} ${status === 'ringing' ? 'animate-pulse' : ''}`} />
                                                <span className="text-[8px] font-medium tracking-wider uppercase leading-none opacity-90">
                                                    {status}
                                                </span>
                                            </div>

                                            {/* Smart Button Badge */}
                                            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-gray-900 text-white border border-white/10 shadow-sm h-4">
                                                <span className={`w-1 h-1 rounded-full ${getButtonDotColor()}`} />
                                                {device ? (
                                                    <span className="text-[8px] font-medium tracking-wider uppercase flex items-center gap-1 leading-none opacity-90">
                                                        BTN
                                                        {battery !== undefined && (
                                                            <span className={isLowBattery ? "text-red-400 font-bold" : "opacity-75"}>
                                                                {battery}%
                                                            </span>
                                                        )}
                                                    </span>
                                                ) : (
                                                    <span className="text-[8px] font-medium tracking-wider uppercase text-orange-200 leading-none opacity-90">
                                                        NO BTN
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}

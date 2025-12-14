"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Phone, ArrowUpRight, ArrowDownLeft, Clock } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface Call {
    id: string
    callId: string
    fromNumber: string
    toNumber: string
    direction: string
    status: string
    startTime: string
    duration: number | null
    extension: {
        name: string | null
        extensionId: string
    }
}

export default function CallHistoryPage() {
    const [calls, setCalls] = useState<Call[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        fetchCalls()
    }, [])

    const fetchCalls = async () => {
        try {
            const res = await fetch('/api/pbx/calls')
            const data = await res.json()
            if (data.success) {
                setCalls(data.data)
            }
        } catch (error) {
            console.error("Failed to fetch calls", error)
        } finally {
            setIsLoading(false)
        }
    }

    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case 'connected': return "bg-green-100 text-green-800 border-green-200"
            case 'ringing': return "bg-yellow-100 text-yellow-800 border-yellow-200"
            case 'missed': return "bg-red-100 text-red-800 border-red-200"
            case 'failed': return "bg-red-100 text-red-800 border-red-200"
            case 'ended': return "bg-gray-100 text-gray-800 border-gray-200"
            default: return "bg-gray-100 text-gray-800 border-gray-200"
        }
    }

    const formatDuration = (seconds: number | null) => {
        if (!seconds) return "-"
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Call History</h1>
                <p className="text-muted-foreground">
                    Recent inbound and outbound calls
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5" />
                        Recent Calls
                    </CardTitle>
                    <CardDescription>
                        Displaying last 50 calls
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Type</TableHead>
                                <TableHead>From</TableHead>
                                <TableHead>To</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Duration</TableHead>
                                <TableHead>Time</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8">
                                        Loading...
                                    </TableCell>
                                </TableRow>
                            ) : calls.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                        No calls recorded yet
                                    </TableCell>
                                </TableRow>
                            ) : (
                                calls.map((call) => (
                                    <TableRow key={call.id}>
                                        <TableCell>
                                            {call.direction === 'inbound' ? (
                                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 gap-1">
                                                    <ArrowDownLeft className="h-3 w-3" /> Inbound
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 gap-1">
                                                    <ArrowUpRight className="h-3 w-3" /> Outbound
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="font-mono">{call.fromNumber}</TableCell>
                                        <TableCell className="font-mono">{call.toNumber}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={getStatusColor(call.status)}>
                                                {call.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="font-mono text-xs">
                                            {formatDuration(call.duration)}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-xs">
                                            {new Date(call.startTime).toLocaleString()}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}

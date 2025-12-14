"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Phone, RefreshCw, Search, AlertCircle, CheckCircle, Info, XCircle, Wifi, WifiOff } from "lucide-react"

interface PBXLog {
    id: string
    timestamp: string
    level: "INFO" | "SUCCESS" | "WARNING" | "ERROR"
    category: string
    eventName: string
    message: string
    details?: any
}

export default function PBXLogsPage() {
    const [logs, setLogs] = useState<PBXLog[]>([])
    const [filteredLogs, setFilteredLogs] = useState<PBXLog[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isConnected, setIsConnected] = useState(false)
    const [filterLevel, setFilterLevel] = useState<string>("ALL")
    const [searchQuery, setSearchQuery] = useState("")

    useEffect(() => {
        // Initial load
        fetchLogs()

        // Setup SSE for real-time updates
        const eventSource = new EventSource('/api/pbx/logs/stream')

        eventSource.onopen = () => {
            console.log('✅ Connected to PBX logs stream')
            setIsConnected(true)
        }

        eventSource.onmessage = (event) => {
            const data = JSON.parse(event.data)

            if (data.type === 'logs') {
                setLogs(data.logs)
                setIsLoading(false)
            }
        }

        eventSource.onerror = () => {
            console.error('❌ SSE connection error')
            setIsConnected(false)
        }

        return () => {
            eventSource.close()
        }
    }, [])

    useEffect(() => {
        filterLogs()
    }, [logs, filterLevel, searchQuery])

    const fetchLogs = async () => {
        try {
            const response = await fetch("/api/pbx/logs")
            const data = await response.json()

            if (data.success) {
                setLogs(data.logs)
            }
        } catch (error) {
            console.error("Error fetching logs:", error)
        } finally {
            setIsLoading(false)
        }
    }

    const filterLogs = () => {
        let filtered = logs

        // Filter by level
        if (filterLevel !== "ALL") {
            filtered = filtered.filter(log => log.level === filterLevel)
        }

        // Filter by search query
        if (searchQuery) {
            filtered = filtered.filter(log =>
                log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
                log.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
                log.eventName.toLowerCase().includes(searchQuery.toLowerCase())
            )
        }

        setFilteredLogs(filtered)
    }

    const getLevelIcon = (level: string) => {
        switch (level) {
            case "SUCCESS":
                return <CheckCircle className="h-4 w-4 text-green-500" />
            case "INFO":
                return <Info className="h-4 w-4 text-blue-500" />
            case "WARNING":
                return <AlertCircle className="h-4 w-4 text-amber-500" />
            case "ERROR":
                return <XCircle className="h-4 w-4 text-red-500" />
            default:
                return <Info className="h-4 w-4" />
        }
    }

    const getLevelBadgeVariant = (level: string): "success" | "info" | "warning" | "error" | "outline" => {
        switch (level) {
            case "SUCCESS":
                return "success"
            case "INFO":
                return "info"
            case "WARNING":
                return "warning"
            case "ERROR":
                return "error"
            default:
                return "outline"
        }
    }

    const clearLogs = async () => {
        if (!confirm("Are you sure you want to clear all logs?")) {
            return
        }

        try {
            const response = await fetch("/api/pbx/logs", {
                method: "DELETE",
            })

            const data = await response.json()
            if (data.success) {
                setLogs([])
                alert("Logs cleared successfully")
            }
        } catch (error) {
            console.error("Error clearing logs:", error)
            alert("Failed to clear logs")
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">PBX Logs</h1>
                    <p className="text-muted-foreground">
                        Real-time PBX events, errors, and responses
                    </p>
                </div>
                <div className="flex gap-2 items-center">
                    <Badge variant={isConnected ? "connected" : "disconnected"} className="gap-1">
                        {isConnected ? (
                            <>
                                <Wifi className="h-3 w-3" />
                                Live
                            </>
                        ) : (
                            <>
                                <WifiOff className="h-3 w-3" />
                                Disconnected
                            </>
                        )}
                    </Badge>
                    <Button
                        variant="outline"
                        onClick={fetchLogs}
                        disabled={isLoading}
                        className="gap-2"
                    >
                        <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                        Refresh
                    </Button>
                    <Button
                        variant="outline"
                        onClick={clearLogs}
                        className="gap-2"
                    >
                        Clear Logs
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Phone className="h-5 w-5" />
                        Log Filters
                    </CardTitle>
                    <CardDescription>
                        Filter and search through PBX logs
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-4">
                        <div className="flex-1">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder="Search logs..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9"
                                />
                            </div>
                        </div>
                        <Select value={filterLevel} onValueChange={setFilterLevel}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Filter by level" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">All Levels</SelectItem>
                                <SelectItem value="SUCCESS">Success</SelectItem>
                                <SelectItem value="INFO">Info</SelectItem>
                                <SelectItem value="WARNING">Warning</SelectItem>
                                <SelectItem value="ERROR">Error</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                            <Phone className="h-5 w-5" />
                            Recent Logs
                        </span>
                        <Badge variant="pbx">
                            {filteredLogs.length} {filteredLogs.length === 1 ? "log" : "logs"}
                        </Badge>
                    </CardTitle>
                    <CardDescription>
                        Real-time PBX event logs and system messages
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="text-center py-8 text-muted-foreground">
                            Loading logs...
                        </div>
                    ) : filteredLogs.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <Phone className="h-12 w-12 mx-auto mb-2 opacity-50" />
                            <p>No logs found. Waiting for PBX events...</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[180px]">Timestamp</TableHead>
                                        <TableHead className="w-[100px]">Level</TableHead>
                                        <TableHead className="w-[120px]">Category</TableHead>
                                        <TableHead className="w-[150px]">Event</TableHead>
                                        <TableHead>Description</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredLogs.map((log) => (
                                        <TableRow key={log.id}>
                                            <TableCell className="font-mono text-xs">
                                                {new Date(log.timestamp).toLocaleString()}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    {getLevelIcon(log.level)}
                                                    <Badge variant={getLevelBadgeVariant(log.level)}>
                                                        {log.level}
                                                    </Badge>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="pbx" className="font-mono">
                                                    {log.category}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="font-mono">
                                                    {log.eventName}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="max-w-md">
                                                <div className="space-y-1">
                                                    <p className="text-sm">{log.message}</p>
                                                    {log.details && (
                                                        <details className="text-xs text-muted-foreground">
                                                            <summary className="cursor-pointer hover:text-foreground">
                                                                View details
                                                            </summary>
                                                            <pre className="mt-2 bg-muted p-2 rounded overflow-x-auto">
                                                                {JSON.stringify(log.details, null, 2)}
                                                            </pre>
                                                        </details>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}

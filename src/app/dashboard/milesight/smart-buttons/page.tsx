"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { RefreshCw, Search, Smartphone, Battery, Wifi, WifiOff, AlertCircle } from "lucide-react"

interface MilesightDevice {
    id: string
    deviceId: string
    deviceName: string
    deviceType: string | null
    deviceModel: string | null
    serialNumber: string | null
    attributes: any
    assignedExtensionId: string | null
    assignedExtension: {
        id: string
        extensionId: string
        name: string | null
    } | null
    lastSyncedAt: string
    isActive: boolean
}

interface Extension {
    id: string
    extensionId: string
    name: string | null
}

export default function SmartButtonsPage() {
    const [devices, setDevices] = useState<MilesightDevice[]>([])
    const [extensions, setExtensions] = useState<Extension[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isSyncing, setIsSyncing] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")

    useEffect(() => {
        loadDevices()
        loadExtensions()
    }, [])

    const loadDevices = async () => {
        try {
            const response = await fetch('/api/milesight/devices')
            const data = await response.json()

            if (data.success) {
                setDevices(data.devices)
            }
        } catch (error) {
            console.error('Error loading devices:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const loadExtensions = async () => {
        try {
            const response = await fetch('/api/extensions')
            const data = await response.json()

            if (data.success) {
                setExtensions(data.extensions)
            }
        } catch (error) {
            console.error('Error loading extensions:', error)
        }
    }

    const handleSync = async () => {
        setIsSyncing(true)
        try {
            const response = await fetch('/api/milesight/devices', {
                method: 'POST'
            })

            const data = await response.json()

            if (data.success) {
                alert(`Sync complete! ${data.stats.created} created, ${data.stats.updated} updated`)
                await loadDevices()
            } else {
                alert(data.error || 'Sync failed')
            }
        } catch (error) {
            console.error('Error syncing devices:', error)
            alert('Sync failed')
        } finally {
            setIsSyncing(false)
        }
    }

    const handleAssignExtension = async (deviceId: string, extensionId: string | null) => {
        try {
            const response = await fetch('/api/milesight/devices', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    deviceId,
                    assignedExtensionId: extensionId
                })
            })

            const data = await response.json()

            if (data.success) {
                // Update local state
                setDevices(devices.map(d =>
                    d.deviceId === deviceId ? data.device : d
                ))
            } else {
                alert(data.error || 'Assignment failed')
            }
        } catch (error) {
            console.error('Error assigning extension:', error)
            alert('Assignment failed')
        }
    }

    const filteredDevices = devices.filter(device =>
        device.deviceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        device.deviceId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        device.serialNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        device.deviceModel?.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const getStatusIcon = (device: MilesightDevice) => {
        const status = device.attributes?.connectStatus
        if (status === 'ONLINE') return <Wifi className="h-4 w-4 text-green-500" />
        if (status === 'OFFLINE') return <WifiOff className="h-4 w-4 text-gray-400" />
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
    }

    const getStatusBadge = (device: MilesightDevice) => {
        const status = device.attributes?.connectStatus
        if (status === 'ONLINE') return <Badge variant="default" className="bg-green-500">Online</Badge>
        if (status === 'OFFLINE') return <Badge variant="secondary">Offline</Badge>
        return <Badge variant="outline">Disconnected</Badge>
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Smart Buttons - Extensions</h1>
                    <p className="text-muted-foreground mt-1">
                        Manage Milesight smart button devices and assign them to PBX extensions
                    </p>
                </div>
                <Button
                    onClick={handleSync}
                    disabled={isSyncing}
                    className="gap-2"
                >
                    <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                    {isSyncing ? 'Syncing...' : 'Sync Devices'}
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Smartphone className="h-5 w-5" />
                        Milesight Devices
                    </CardTitle>
                    <CardDescription>
                        {devices.length} devices synced from Milesight platform
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="mb-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search devices..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="text-center py-12 text-muted-foreground">
                            Loading devices...
                        </div>
                    ) : filteredDevices.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <Smartphone className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>No devices found</p>
                            <p className="text-sm mt-2">Click "Sync Devices" to fetch from Milesight platform</p>
                        </div>
                    ) : (
                        <div className="border rounded-lg overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Device Name</TableHead>
                                        <TableHead>Model</TableHead>
                                        <TableHead>Serial Number</TableHead>
                                        <TableHead>Battery</TableHead>
                                        <TableHead>Assigned Extension</TableHead>
                                        <TableHead>Last Synced</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredDevices.map((device) => (
                                        <TableRow key={device.id}>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    {getStatusIcon(device)}
                                                    {getStatusBadge(device)}
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                {device.deviceName}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline">
                                                    {device.deviceModel || 'Unknown'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="font-mono text-sm">
                                                {device.serialNumber || 'N/A'}
                                            </TableCell>
                                            <TableCell>
                                                {device.attributes?.electricity !== undefined ? (
                                                    <div className="flex items-center gap-2">
                                                        <Battery className="h-4 w-4" />
                                                        <span>{device.attributes.electricity}%</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-muted-foreground">N/A</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Select
                                                    value={device.assignedExtensionId || "none"}
                                                    onValueChange={(value) =>
                                                        handleAssignExtension(
                                                            device.deviceId,
                                                            value === "none" ? null : value
                                                        )
                                                    }
                                                >
                                                    <SelectTrigger className="w-[200px]">
                                                        <SelectValue placeholder="Select extension" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="none">
                                                            <span className="text-muted-foreground">No assignment</span>
                                                        </SelectItem>
                                                        {extensions.map((ext) => (
                                                            <SelectItem key={ext.id} value={ext.id}>
                                                                Extension {ext.extensionId} {ext.name ? `- ${ext.name}` : ''}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {new Date(device.lastSyncedAt).toLocaleString()}
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

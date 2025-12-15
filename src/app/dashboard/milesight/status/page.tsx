"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { RefreshCw, Smartphone, Wifi, WifiOff, Battery, BatteryLow, AlertTriangle, CheckCircle2 } from "lucide-react"

interface MilesightDevice {
    id: string
    deviceId: string
    deviceName: string
    deviceModel: string | null
    serialNumber: string | null
    attributes: any
    assignedExtension: {
        extensionId: string
        name: string | null
    } | null
    lastSyncedAt: string
    isActive: boolean
}

export default function MilesightStatusPage() {
    const [devices, setDevices] = useState<MilesightDevice[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [recipientEmail, setRecipientEmail] = useState("")
    const [isSendingAlert, setIsSendingAlert] = useState(false)

    useEffect(() => {
        loadDevices()
        // Auto-refresh every 30 seconds
        const interval = setInterval(loadDevices, 30000)
        return () => clearInterval(interval)
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
            setIsRefreshing(false)
        }
    }

    const handleRefresh = () => {
        setIsRefreshing(true)
        loadDevices()
    }

    const handleSendAlerts = async () => {
        if (!recipientEmail) {
            alert('Please enter an email address')
            return
        }

        setIsSendingAlert(true)
        try {
            const response = await fetch('/api/alerts/unassigned-extensions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    recipientEmail,
                    checkUnassigned: true,
                    checkOffline: true
                })
            })

            const data = await response.json()

            if (data.success) {
                const message = `Alerts sent successfully!\n\n` +
                    `Unassigned Extensions: ${data.results.unassignedExtensions?.count || 0}\n` +
                    `Offline Devices: ${data.results.offlineDevices?.count || 0}\n` +
                    `Emails Sent: ${data.results.emailsSent.length}`
                alert(message)
            } else {
                alert(data.error || 'Failed to send alerts')
            }
        } catch (error) {
            console.error('Error sending alerts:', error)
            alert('Failed to send alerts')
        } finally {
            setIsSendingAlert(false)
        }
    }

    const onlineDevices = devices.filter(d => d.attributes?.connectStatus === 'ONLINE')
    const offlineDevices = devices.filter(d => d.attributes?.connectStatus === 'OFFLINE')
    const disconnectedDevices = devices.filter(d => d.attributes?.connectStatus === 'DISCONNECT')
    const lowBatteryDevices = devices.filter(d => d.attributes?.electricity && d.attributes.electricity < 20)

    const getStatusColor = (status: string) => {
        if (status === 'ONLINE') return 'text-green-500'
        if (status === 'OFFLINE') return 'text-gray-400'
        return 'text-yellow-500'
    }

    const getStatusIcon = (status: string) => {
        if (status === 'ONLINE') return <Wifi className="h-5 w-5 text-green-500" />
        if (status === 'OFFLINE') return <WifiOff className="h-5 w-5 text-gray-400" />
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />
    }

    const getBatteryIcon = (level: number | undefined) => {
        if (!level) return <Battery className="h-5 w-5 text-gray-400" />
        if (level < 20) return <BatteryLow className="h-5 w-5 text-red-500" />
        return <Battery className="h-5 w-5 text-green-500" />
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Milesight Status Dashboard</h1>
                    <p className="text-muted-foreground mt-1">
                        Real-time monitoring of all Milesight smart button devices
                    </p>
                </div>
                <Button
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    variant="outline"
                    className="gap-2"
                >
                    <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Total Devices
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2">
                            <Smartphone className="h-8 w-8 text-blue-500" />
                            <span className="text-3xl font-bold">{devices.length}</span>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Online
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-8 w-8 text-green-500" />
                            <span className="text-3xl font-bold text-green-500">{onlineDevices.length}</span>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Offline
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2">
                            <WifiOff className="h-8 w-8 text-gray-400" />
                            <span className="text-3xl font-bold text-gray-400">{offlineDevices.length}</span>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Low Battery
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2">
                            <BatteryLow className="h-8 w-8 text-red-500" />
                            <span className="text-3xl font-bold text-red-500">{lowBatteryDevices.length}</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Alerts */}
            {(offlineDevices.length > 0 || lowBatteryDevices.length > 0) && (
                <div className="space-y-3">
                    {offlineDevices.length > 0 && (
                        <Alert variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>
                                <strong>{offlineDevices.length} device(s) offline:</strong>{' '}
                                {offlineDevices.map(d => d.deviceName).join(', ')}
                            </AlertDescription>
                        </Alert>
                    )}
                    {lowBatteryDevices.length > 0 && (
                        <Alert className="border-yellow-500 bg-yellow-50">
                            <BatteryLow className="h-4 w-4 text-yellow-600" />
                            <AlertDescription className="text-yellow-800">
                                <strong>{lowBatteryDevices.length} device(s) with low battery:</strong>{' '}
                                {lowBatteryDevices.map(d => `${d.deviceName} (${d.attributes.electricity}%)`).join(', ')}
                            </AlertDescription>
                        </Alert>
                    )}
                </div>
            )}

            {/* Email Alerts */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5" />
                        Email Alerts
                    </CardTitle>
                    <CardDescription>
                        Send email notifications for unassigned extensions and offline devices
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-3">
                        <div className="flex-1">
                            <input
                                type="email"
                                placeholder="admin@hotel.com"
                                value={recipientEmail}
                                onChange={(e) => setRecipientEmail(e.target.value)}
                                className="w-full px-3 py-2 border rounded-md"
                            />
                        </div>
                        <Button
                            onClick={handleSendAlerts}
                            disabled={isSendingAlert || !recipientEmail}
                            className="gap-2"
                        >
                            {isSendingAlert ? (
                                <>
                                    <RefreshCw className="h-4 w-4 animate-spin" />
                                    Sending...
                                </>
                            ) : (
                                <>
                                    <AlertTriangle className="h-4 w-4" />
                                    Send Alerts
                                </>
                            )}
                        </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                        This will send an email with:
                        • Extensions without assigned smart buttons
                        • Offline devices
                        • Low battery devices
                    </p>
                </CardContent>
            </Card>

            {/* Device List */}
            <Card>
                <CardHeader>
                    <CardTitle>All Devices</CardTitle>
                    <CardDescription>
                        Last updated: {new Date().toLocaleTimeString()}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="text-center py-12 text-muted-foreground">
                            Loading devices...
                        </div>
                    ) : devices.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <Smartphone className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>No devices found</p>
                            <p className="text-sm mt-2">Sync devices from Milesight platform</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {devices.map((device) => (
                                <Card key={device.id} className="relative">
                                    <CardHeader className="pb-3">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <CardTitle className="text-base">
                                                    {device.deviceName}
                                                </CardTitle>
                                                <CardDescription className="text-xs mt-1">
                                                    {device.deviceModel || 'Unknown Model'}
                                                </CardDescription>
                                            </div>
                                            {getStatusIcon(device.attributes?.connectStatus || 'DISCONNECT')}
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-muted-foreground">Status:</span>
                                            <Badge
                                                variant={device.attributes?.connectStatus === 'ONLINE' ? 'default' : 'secondary'}
                                                className={device.attributes?.connectStatus === 'ONLINE' ? 'bg-green-500' : ''}
                                            >
                                                {device.attributes?.connectStatus || 'Unknown'}
                                            </Badge>
                                        </div>

                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-muted-foreground">Battery:</span>
                                            <div className="flex items-center gap-2">
                                                {getBatteryIcon(device.attributes?.electricity)}
                                                <span className={device.attributes?.electricity < 20 ? 'text-red-500 font-semibold' : ''}>
                                                    {device.attributes?.electricity !== undefined
                                                        ? `${device.attributes.electricity}%`
                                                        : 'N/A'}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-muted-foreground">Extension:</span>
                                            <span className="font-medium">
                                                {device.assignedExtension
                                                    ? `${device.assignedExtension.extensionId}${device.assignedExtension.name ? ` - ${device.assignedExtension.name}` : ''}`
                                                    : 'Not assigned'}
                                            </span>
                                        </div>

                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-muted-foreground">Serial:</span>
                                            <span className="font-mono text-xs">
                                                {device.serialNumber || 'N/A'}
                                            </span>
                                        </div>

                                        <div className="text-xs text-muted-foreground pt-2 border-t">
                                            Last synced: {new Date(device.lastSyncedAt).toLocaleString()}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}

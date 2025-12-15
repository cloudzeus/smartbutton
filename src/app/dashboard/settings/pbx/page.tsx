"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Settings, Phone, CheckCircle, XCircle, Loader2 } from "lucide-react"

export default function PBXSettingsPage() {
    const [settings, setSettings] = useState({
        pbxIp: "",
        pbxPort: "",
        clientId: "",
        clientSecret: "",
        websocketUrl: "",
        webhookSecret: "",
        demoExtensions: "100,101,102,103,104",
    })

    const [isConnected, setIsConnected] = useState<boolean | null>(null)
    const [isTesting, setIsTesting] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)

    useEffect(() => {
        loadSettings()
    }, [])

    const loadSettings = async () => {
        try {
            const response = await fetch("/api/pbx/settings")

            if (!response.ok) {
                console.warn("Could not load PBX settings:", response.status)
                setIsLoading(false)
                return
            }

            const data = await response.json()

            if (data.success && data.settings) {
                setSettings({
                    pbxIp: data.settings.pbxIp || "",
                    pbxPort: data.settings.pbxPort || "",
                    clientId: data.settings.clientId || "",
                    clientSecret: data.settings.clientSecret || "",
                    websocketUrl: data.settings.websocketUrl || "",
                    webhookSecret: data.settings.webhookSecret || "",
                    demoExtensions: "100,101,102,103,104",
                })
            }
        } catch (error) {
            console.error("Error loading settings:", error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleTestConnection = async () => {
        setIsTesting(true)
        try {
            const response = await fetch("/api/pbx/test-connection", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    ip: settings.pbxIp,
                    port: settings.pbxPort,
                }),
            })

            const data = await response.json()
            setIsConnected(data.success)

            if (data.success) {
                alert("Connection successful!")
            } else {
                alert(`Connection failed: ${data.error}`)
            }
        } catch (error) {
            console.error("Error testing connection:", error)
            setIsConnected(false)
            alert("Connection test failed")
        } finally {
            setIsTesting(false)
        }
    }

    const handleSave = async () => {
        setIsSaving(true)
        try {
            const response = await fetch("/api/pbx/settings", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    pbxIp: settings.pbxIp,
                    pbxPort: settings.pbxPort,
                    clientId: settings.clientId,
                    clientSecret: settings.clientSecret,
                    websocketUrl: settings.websocketUrl,
                    webhookSecret: settings.webhookSecret,
                }),
            })

            if (!response.ok) {
                const errorText = await response.text()
                console.error("Save failed:", errorText)
                alert(`Failed to save settings: ${response.status}`)
                return
            }

            const data = await response.json()

            if (data.success) {
                alert("✅ Settings saved successfully to database!")
                // Reload settings to confirm
                await loadSettings()
            } else {
                alert(data.error || "Failed to save settings")
            }
        } catch (error) {
            console.error("Error saving settings:", error)
            alert("Failed to save settings: " + error)
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">PBX Settings</h1>
                <p className="text-muted-foreground">
                    Configure Yearstar PBX connection settings
                </p>
            </div>

            <Card className="border-primary/50 bg-primary/5">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Phone className="h-5 w-5" />
                        Webhook URL for PBX Events
                    </CardTitle>
                    <CardDescription>
                        Configure this URL in your Yearstar PBX to receive push events
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Webhook Endpoint</Label>
                        <div className="flex gap-2">
                            <Input
                                value={`${typeof window !== 'undefined' ? window.location.origin : ''}/api/pbx/webhook`}
                                readOnly
                                className="font-mono text-sm"
                            />
                            <Button
                                variant="outline"
                                onClick={() => {
                                    navigator.clipboard.writeText(`${window.location.origin}/api/pbx/webhook`)
                                    alert('Webhook URL copied to clipboard!')
                                }}
                            >
                                Copy
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Use this URL to configure push notifications in your Yearstar PBX settings
                        </p>
                    </div>

                    <div className="rounded-lg bg-muted p-4 space-y-2">
                        <p className="text-sm font-semibold">Setup Instructions:</p>
                        <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                            <li>Log in to your Yearstar PBX web interface</li>
                            <li>Navigate to Settings → Advanced → Push Notifications or Webhooks</li>
                            <li>Add a new webhook endpoint with the URL above</li>
                            <li>Select the events you want to receive (Call Events, Extension Status, etc.)</li>
                            <li>Set the method to POST and content type to application/json</li>
                            <li>Save the configuration and test the connection</li>
                        </ol>
                    </div>

                    <div className="flex items-start gap-2 text-xs text-muted-foreground">
                        <Badge variant="info">ℹ️</Badge>
                        <p>
                            The webhook endpoint will automatically log all received events and update the database.
                            You can view all events in the PBX Logs page.
                        </p>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Phone className="h-5 w-5" />
                        Connection Settings
                    </CardTitle>
                    <CardDescription>
                        Configure the connection details for your Yearstar P550 PBX gateway
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="pbxIp">PBX IP Address / Hostname</Label>
                            <Input
                                id="pbxIp"
                                value={settings.pbxIp}
                                onChange={(e) => setSettings({ ...settings, pbxIp: e.target.value })}
                                placeholder="6f3808d865a0.sn.mynetname.net"
                            />
                            <p className="text-xs text-muted-foreground">
                                The IP address or hostname of your PBX server
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="pbxPort">WebSocket Port</Label>
                            <Input
                                id="pbxPort"
                                value={settings.pbxPort}
                                onChange={(e) => setSettings({ ...settings, pbxPort: e.target.value })}
                                placeholder="39987"
                            />
                            <p className="text-xs text-muted-foreground">
                                The WebSocket port for PBX communication
                            </p>
                        </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="clientId">Client ID</Label>
                            <Input
                                id="clientId"
                                type="password"
                                value={settings.clientId}
                                onChange={(e) => setSettings({ ...settings, clientId: e.target.value })}
                                placeholder="Enter client ID"
                            />
                            <p className="text-xs text-muted-foreground">
                                OAuth client ID for PBX authentication
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="clientSecret">Client Secret</Label>
                            <Input
                                id="clientSecret"
                                type="password"
                                value={settings.clientSecret}
                                onChange={(e) => setSettings({ ...settings, clientSecret: e.target.value })}
                                placeholder="Enter client secret"
                            />
                            <p className="text-xs text-muted-foreground">
                                OAuth client secret for PBX authentication
                            </p>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="webhookSecret">Webhook Secret</Label>
                        <Input
                            id="webhookSecret"
                            type="password"
                            value={settings.webhookSecret}
                            onChange={(e) => setSettings({ ...settings, webhookSecret: e.target.value })}
                            placeholder="eC6CcUtxTBHAG68waWX7YhElOPmWRKnI"
                        />
                        <p className="text-xs text-muted-foreground">
                            Secret key for validating webhook requests from PBX
                        </p>
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                        <Button
                            onClick={handleTestConnection}
                            disabled={isTesting}
                            variant="outline"
                            className="gap-2"
                        >
                            {isTesting ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Testing...
                                </>
                            ) : (
                                <>
                                    <Phone className="h-4 w-4" />
                                    Test Connection
                                </>
                            )}
                        </Button>

                        {isConnected !== null && (
                            <Badge variant={isConnected ? "connected" : "disconnected"} className="gap-1">
                                {isConnected ? (
                                    <>
                                        <CheckCircle className="h-3 w-3" />
                                        Connected
                                    </>
                                ) : (
                                    <>
                                        <XCircle className="h-3 w-3" />
                                        Failed
                                    </>
                                )}
                            </Badge>
                        )}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Phone className="h-5 w-5" />
                        Audio Prompts
                    </CardTitle>
                    <CardDescription>
                        Custom audio files played during calls
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Alert Sound (alert.mp3)</Label>
                        <p className="text-xs text-muted-foreground">
                            This audio file is played automatically when a call is answered. The file is served from the public folder.
                        </p>
                    </div>

                    <div className="rounded-lg bg-muted p-4 space-y-2">
                        <p className="text-sm font-semibold">✅ Automatic Playback Enabled</p>
                        <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                            <li>alert.mp3 is located in the /public folder</li>
                            <li>When a call is answered, the alert plays automatically to the caller</li>
                            <li>After the alert, a TTS announcement plays with the caller's number</li>
                            <li>No upload needed - the audio is served directly from this server</li>
                        </ol>
                    </div>

                    <div className="flex items-start gap-2 text-xs text-muted-foreground">
                        <Badge variant="info">ℹ️</Badge>
                        <p>
                            To change the alert sound, replace /public/alert.mp3 with your own audio file (keep the same filename).
                            Supported formats: MP3, WAV. Recommended: 8kHz-16kHz sample rate for telephony.
                        </p>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Settings className="h-5 w-5" />
                        Demo Extensions
                    </CardTitle>
                    <CardDescription>
                        Configure demo extension numbers for testing
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="demoExtensions">Extension Numbers (comma-separated)</Label>
                        <Input
                            id="demoExtensions"
                            value={settings.demoExtensions}
                            onChange={(e) => setSettings({ ...settings, demoExtensions: e.target.value })}
                            placeholder="100,101,102,103,104"
                        />
                        <p className="text-xs text-muted-foreground">
                            Enter extension numbers separated by commas for quick testing
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {settings.demoExtensions.split(',').map((ext, index) => (
                            <Badge key={index} variant="extension">
                                Ext {ext.trim()}
                            </Badge>
                        ))}
                    </div>
                </CardContent>
            </Card>

            <div className="flex justify-end gap-2">
                <Button
                    variant="outline"
                    onClick={() => window.location.reload()}
                >
                    Reset
                </Button>
                <Button
                    onClick={handleSave}
                    className="gap-2 bg-gradient-to-r from-primary to-chart-2 hover:from-chart-2 hover:to-primary"
                >
                    <Settings className="h-4 w-4" />
                    Save Settings
                </Button>
            </div>

            <Card className="border-amber-500/50 bg-amber-500/5">
                <CardContent className="pt-6">
                    <div className="flex gap-3">
                        <div className="text-amber-500">
                            <Settings className="h-5 w-5" />
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm font-semibold">Configuration Note</p>
                            <p className="text-xs text-muted-foreground">
                                PBX connection settings are currently configured via environment variables.
                                Changes made here are for testing purposes only. To permanently update settings,
                                modify the <code className="bg-muted px-1 py-0.5 rounded text-[10px]">.env</code> file
                                and restart the application.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

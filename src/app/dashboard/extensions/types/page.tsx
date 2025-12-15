"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
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
import { Search, Save, RefreshCw, Building2, UserCog, HelpCircle } from "lucide-react"

interface Extension {
    id: string
    extensionId: string
    name: string | null
    extensionType: 'ROOM' | 'ADMIN' | 'OTHER'
    roomNumber: string | null
    status: string
}

export default function ExtensionTypesPage() {
    const [extensions, setExtensions] = useState<Extension[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")
    const [isSaving, setIsSaving] = useState<string | null>(null)

    useEffect(() => {
        loadExtensions()
    }, [])

    const loadExtensions = async () => {
        try {
            const response = await fetch('/api/extensions')
            const data = await response.json()

            if (data.success) {
                setExtensions(data.extensions)
            }
        } catch (error) {
            console.error('Error loading extensions:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleTypeChange = async (extensionId: string, type: 'ROOM' | 'ADMIN' | 'OTHER') => {
        const extension = extensions.find(e => e.id === extensionId)
        if (!extension) return

        setIsSaving(extensionId)
        try {
            const response = await fetch(`/api/extensions/${extensionId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    extensionType: type,
                    // Clear room number if changing from ROOM to something else
                    ...(type !== 'ROOM' && { roomNumber: null })
                })
            })

            const data = await response.json()

            if (data.success) {
                setExtensions(prev => prev.map(e =>
                    e.id === extensionId
                        ? { ...e, extensionType: type, ...(type !== 'ROOM' && { roomNumber: null }) }
                        : e
                ))
            } else {
                alert(data.error || 'Failed to update extension type')
            }
        } catch (error) {
            console.error('Error updating extension type:', error)
            alert('Failed to update extension type')
        } finally {
            setIsSaving(null)
        }
    }

    const handleRoomNumberChange = async (extensionId: string, roomNumber: string) => {
        setIsSaving(extensionId)
        try {
            const response = await fetch(`/api/extensions/${extensionId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ roomNumber: roomNumber || null })
            })

            const data = await response.json()

            if (data.success) {
                setExtensions(prev => prev.map(e =>
                    e.id === extensionId ? { ...e, roomNumber } : e
                ))
            } else {
                alert(data.error || 'Failed to update room number')
            }
        } catch (error) {
            console.error('Error updating room number:', error)
            alert('Failed to update room number')
        } finally {
            setIsSaving(null)
        }
    }

    const filteredExtensions = extensions.filter(ext =>
        ext.extensionId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ext.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ext.roomNumber?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const roomCount = extensions.filter(e => e.extensionType === 'ROOM').length
    const adminCount = extensions.filter(e => e.extensionType === 'ADMIN').length
    const otherCount = extensions.filter(e => e.extensionType === 'OTHER').length

    const getTypeIcon = (type: string) => {
        if (type === 'ROOM') return <Building2 className="h-4 w-4" />
        if (type === 'ADMIN') return <UserCog className="h-4 w-4" />
        return <HelpCircle className="h-4 w-4" />
    }

    const getTypeBadgeColor = (type: string) => {
        if (type === 'ROOM') return 'bg-blue-500'
        if (type === 'ADMIN') return 'bg-purple-500'
        return 'bg-gray-500'
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Extension Types</h1>
                <p className="text-muted-foreground mt-1">
                    Configure which extensions are rooms, admin, or other types
                </p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <Building2 className="h-4 w-4" />
                            Room Extensions
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <span className="text-3xl font-bold text-blue-500">{roomCount}</span>
                        <p className="text-xs text-muted-foreground mt-1">Need smart buttons</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <UserCog className="h-4 w-4" />
                            Admin Extensions
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <span className="text-3xl font-bold text-purple-500">{adminCount}</span>
                        <p className="text-xs text-muted-foreground mt-1">Staff/management</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <HelpCircle className="h-4 w-4" />
                            Other Extensions
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <span className="text-3xl font-bold text-gray-500">{otherCount}</span>
                        <p className="text-xs text-muted-foreground mt-1">Uncategorized</p>
                    </CardContent>
                </Card>
            </div>

            {/* Main Table */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>All Extensions</CardTitle>
                            <CardDescription>
                                Set extension type and room number for each extension
                            </CardDescription>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={loadExtensions}
                            className="gap-2"
                        >
                            <RefreshCw className="h-4 w-4" />
                            Refresh
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search extensions..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10"
                            />
                        </div>

                        {/* Table */}
                        {isLoading ? (
                            <div className="text-center py-12 text-muted-foreground">
                                Loading extensions...
                            </div>
                        ) : (
                            <div className="border rounded-lg">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Extension</TableHead>
                                            <TableHead>Name</TableHead>
                                            <TableHead>Type</TableHead>
                                            <TableHead>Room Number</TableHead>
                                            <TableHead>Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredExtensions.map((ext) => (
                                            <TableRow key={ext.id}>
                                                <TableCell className="font-mono font-semibold">
                                                    {ext.extensionId}
                                                </TableCell>
                                                <TableCell>{ext.name || '-'}</TableCell>
                                                <TableCell>
                                                    <Select
                                                        value={ext.extensionType}
                                                        onValueChange={(value: 'ROOM' | 'ADMIN' | 'OTHER') =>
                                                            handleTypeChange(ext.id, value)
                                                        }
                                                        disabled={isSaving === ext.id}
                                                    >
                                                        <SelectTrigger className="w-[140px]">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="ROOM">
                                                                <div className="flex items-center gap-2">
                                                                    <Building2 className="h-4 w-4" />
                                                                    Room
                                                                </div>
                                                            </SelectItem>
                                                            <SelectItem value="ADMIN">
                                                                <div className="flex items-center gap-2">
                                                                    <UserCog className="h-4 w-4" />
                                                                    Admin
                                                                </div>
                                                            </SelectItem>
                                                            <SelectItem value="OTHER">
                                                                <div className="flex items-center gap-2">
                                                                    <HelpCircle className="h-4 w-4" />
                                                                    Other
                                                                </div>
                                                            </SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </TableCell>
                                                <TableCell>
                                                    {ext.extensionType === 'ROOM' ? (
                                                        <Input
                                                            placeholder="e.g., 101"
                                                            value={ext.roomNumber || ''}
                                                            onChange={(e) => handleRoomNumberChange(ext.id, e.target.value)}
                                                            disabled={isSaving === ext.id}
                                                            className="w-[120px]"
                                                        />
                                                    ) : (
                                                        <span className="text-muted-foreground text-sm">N/A</span>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className={getTypeBadgeColor(ext.extensionType)}>
                                                        {ext.status}
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

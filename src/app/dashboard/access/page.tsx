"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Lock, Save, RefreshCw } from "lucide-react"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

interface PagePermission {
    path: string
    label: string
    group: string
    permissions: {
        [role: string]: {
            canView: boolean
            canCreate: boolean
            canEdit: boolean
            canDelete: boolean
        }
    }
}

const roles = ["ADMIN", "MANAGER", "EMPLOYEE"]

// Define all available pages in the application
// Add new pages here as you create them
const availablePages = [
    { path: "/dashboard", label: "Dashboard Overview", group: "Dashboard" },
    { path: "/dashboard/pbx", label: "PBX Status & Live Events", group: "PBX System" },
    { path: "/dashboard/extensions", label: "Extensions Management", group: "PBX System" },
    { path: "/dashboard/pbx/logs", label: "PBX Event Logs", group: "PBX System" },
    { path: "/dashboard/users", label: "User Management", group: "Users & Authentication" },
    { path: "/dashboard/roles", label: "Role Management", group: "Users & Authentication" },
    { path: "/dashboard/access", label: "Access Management", group: "Users & Authentication" },
    { path: "/dashboard/settings/pbx", label: "PBX Settings", group: "Settings" },
]

export default function AccessManagementPage() {
    const [permissions, setPermissions] = useState<PagePermission[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)

    useEffect(() => {
        loadPermissions()
    }, [])

    const loadPermissions = async () => {
        try {
            const response = await fetch("/api/page-permissions")
            const data = await response.json()

            if (data.success && data.permissions) {
                // Merge saved permissions with available pages
                const mergedPermissions = availablePages.map(page => {
                    const savedPage = data.permissions.find((p: any) => p.path === page.path)
                    return savedPage || {
                        ...page,
                        permissions: {
                            ADMIN: { canView: true, canCreate: true, canEdit: true, canDelete: true },
                            MANAGER: { canView: true, canCreate: false, canEdit: false, canDelete: false },
                            EMPLOYEE: { canView: false, canCreate: false, canEdit: false, canDelete: false },
                        }
                    }
                })
                setPermissions(mergedPermissions)
            } else {
                // Initialize with defaults if no saved permissions
                initializeDefaults()
            }
        } catch (error) {
            console.error("Error loading permissions:", error)
            initializeDefaults()
        } finally {
            setIsLoading(false)
        }
    }

    const initializeDefaults = () => {
        const initialPermissions: PagePermission[] = availablePages.map(page => ({
            ...page,
            permissions: {
                ADMIN: { canView: true, canCreate: true, canEdit: true, canDelete: true },
                MANAGER: { canView: true, canCreate: false, canEdit: false, canDelete: false },
                EMPLOYEE: { canView: false, canCreate: false, canEdit: false, canDelete: false },
            }
        }))
        setPermissions(initialPermissions)
    }

    const updatePermission = (
        path: string,
        role: string,
        field: "canView" | "canCreate" | "canEdit" | "canDelete",
        value: boolean
    ) => {
        setPermissions(prev =>
            prev.map(page =>
                page.path === path
                    ? {
                        ...page,
                        permissions: {
                            ...page.permissions,
                            [role]: {
                                ...page.permissions[role],
                                [field]: value
                            }
                        }
                    }
                    : page
            )
        )
    }

    const handleSave = async () => {
        setIsSaving(true)
        try {
            const response = await fetch("/api/page-permissions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ permissions }),
            })

            const data = await response.json()

            if (data.success) {
                alert("Permissions saved successfully!")
            } else {
                alert(data.error || "Failed to save permissions")
            }
        } catch (error) {
            console.error("Error saving permissions:", error)
            alert("Failed to save permissions")
        } finally {
            setIsSaving(false)
        }
    }

    const groupedPages = permissions.reduce((acc, page) => {
        if (!acc[page.group]) {
            acc[page.group] = []
        }
        acc[page.group].push(page)
        return acc
    }, {} as Record<string, PagePermission[]>)

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="page-header">
                    <h1>Access Management</h1>
                    <p>
                        Define which pages and features are accessible to each role
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        onClick={loadPermissions}
                        disabled={isLoading}
                        className="gap-2"
                    >
                        <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                        Refresh
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="gap-2 bg-gradient-to-r from-primary to-chart-2 hover:from-chart-2 hover:to-primary"
                    >
                        <Save className="h-4 w-4" />
                        {isSaving ? "Saving..." : "Save Changes"}
                    </Button>
                </div>
            </div>

            {isLoading ? (
                <Card>
                    <CardContent className="py-8">
                        <div className="text-center text-muted-foreground">
                            Loading permissions...
                        </div>
                    </CardContent>
                </Card>
            ) : (
                Object.entries(groupedPages).map(([groupName, pages]) => (
                    <Card key={groupName}>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Lock className="h-5 w-5" />
                                {groupName}
                            </CardTitle>
                            <CardDescription>
                                Configure access permissions for {groupName.toLowerCase()} pages
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[250px]">Page</TableHead>
                                            <TableHead className="w-[200px]">Path</TableHead>
                                            {roles.map((role) => (
                                                <TableHead key={role} className="text-center min-w-[280px]">
                                                    <Badge variant="outline" className="mb-2">{role}</Badge>
                                                    <div className="flex justify-center gap-4 text-xs text-muted-foreground mt-1">
                                                        <span className="w-12">View</span>
                                                        <span className="w-12">Create</span>
                                                        <span className="w-12">Edit</span>
                                                        <span className="w-12">Delete</span>
                                                    </div>
                                                </TableHead>
                                            ))}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {pages.map((page) => (
                                            <TableRow key={page.path}>
                                                <TableCell className="font-medium">
                                                    {page.label}
                                                </TableCell>
                                                <TableCell className="font-mono text-xs text-muted-foreground">
                                                    {page.path}
                                                </TableCell>
                                                {roles.map((role) => {
                                                    const rolePerms = page.permissions[role]
                                                    return (
                                                        <TableCell key={role}>
                                                            <div className="flex items-center justify-center gap-4">
                                                                <div className="flex flex-col items-center gap-1">
                                                                    <Switch
                                                                        checked={rolePerms.canView}
                                                                        onCheckedChange={(checked) =>
                                                                            updatePermission(
                                                                                page.path,
                                                                                role,
                                                                                "canView",
                                                                                checked as boolean
                                                                            )
                                                                        }
                                                                        disabled={role === "ADMIN"}
                                                                        aria-label="View Permission"
                                                                        className="h-6 w-10 border-none bg-gradient-to-r from-slate-400 to-slate-500 data-[state=checked]:from-blue-500 data-[state=checked]:to-cyan-600 [&_span]:size-5 [&_span]:!translate-x-0.25 data-[state=checked]:[&_span]:!translate-x-4.75"
                                                                    />
                                                                </div>
                                                                <div className="flex flex-col items-center gap-1">
                                                                    <Switch
                                                                        checked={rolePerms.canCreate}
                                                                        onCheckedChange={(checked) =>
                                                                            updatePermission(
                                                                                page.path,
                                                                                role,
                                                                                "canCreate",
                                                                                checked as boolean
                                                                            )
                                                                        }
                                                                        disabled={role === "ADMIN"}
                                                                        aria-label="Create Permission"
                                                                        className="h-6 w-10 border-none bg-gradient-to-r from-slate-400 to-slate-500 data-[state=checked]:from-blue-500 data-[state=checked]:to-cyan-600 [&_span]:size-5 [&_span]:!translate-x-0.25 data-[state=checked]:[&_span]:!translate-x-4.75"
                                                                    />
                                                                </div>
                                                                <div className="flex flex-col items-center gap-1">
                                                                    <Switch
                                                                        checked={rolePerms.canEdit}
                                                                        onCheckedChange={(checked) =>
                                                                            updatePermission(
                                                                                page.path,
                                                                                role,
                                                                                "canEdit",
                                                                                checked as boolean
                                                                            )
                                                                        }
                                                                        disabled={role === "ADMIN"}
                                                                        aria-label="Edit Permission"
                                                                        className="h-6 w-10 border-none bg-gradient-to-r from-slate-400 to-slate-500 data-[state=checked]:from-blue-500 data-[state=checked]:to-cyan-600 [&_span]:size-5 [&_span]:!translate-x-0.25 data-[state=checked]:[&_span]:!translate-x-4.75"
                                                                    />
                                                                </div>
                                                                <div className="flex flex-col items-center gap-1">
                                                                    <Switch
                                                                        checked={rolePerms.canDelete}
                                                                        onCheckedChange={(checked) =>
                                                                            updatePermission(
                                                                                page.path,
                                                                                role,
                                                                                "canDelete",
                                                                                checked as boolean
                                                                            )
                                                                        }
                                                                        disabled={role === "ADMIN"}
                                                                        aria-label="Delete Permission"
                                                                        className="h-6 w-10 border-none bg-gradient-to-r from-slate-400 to-slate-500 data-[state=checked]:from-blue-500 data-[state=checked]:to-cyan-600 [&_span]:size-5 [&_span]:!translate-x-0.25 data-[state=checked]:[&_span]:!translate-x-4.75"
                                                                    />
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                    )
                                                })}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                ))
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Permission Legend</CardTitle>
                    <CardDescription>
                        Understanding access control settings
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                        <div>
                            <p className="text-xs font-semibold mb-1">View Permission</p>
                            <p className="text-xs text-muted-foreground">
                                Allows the role to see and access the page. Required for all other permissions.
                            </p>
                        </div>
                        <div>
                            <p className="text-xs font-semibold mb-1">Create Permission</p>
                            <p className="text-xs text-muted-foreground">
                                Allows the role to create new records or items on the page (e.g., Add User button).
                            </p>
                        </div>
                        <div>
                            <p className="text-xs font-semibold mb-1">Edit Permission</p>
                            <p className="text-xs text-muted-foreground">
                                Allows the role to modify existing records or items on the page (e.g., Edit button).
                            </p>
                        </div>
                        <div>
                            <p className="text-xs font-semibold mb-1">Delete Permission</p>
                            <p className="text-xs text-muted-foreground">
                                Allows the role to remove records or items from the page (e.g., Delete button).
                            </p>
                        </div>
                    </div>
                    <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                        <p className="text-xs font-semibold mb-1.5">Important Notes:</p>
                        <ul className="text-xs text-muted-foreground space-y-0.5">
                            <li>• ADMIN roles automatically have full access to all features (switches are disabled)</li>
                            <li>• View permission must be enabled for Create, Edit, and Delete to work</li>
                            <li>• Pages will only appear in the sidebar if the user has View permission</li>
                            <li>• Action buttons (Add, Edit, Delete) will be hidden if the user lacks the corresponding permission</li>
                            <li>• <strong>To add new pages:</strong> Update the <code className="bg-muted px-1 py-0.5 rounded text-[10px]">availablePages</code> array in this file</li>
                        </ul>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

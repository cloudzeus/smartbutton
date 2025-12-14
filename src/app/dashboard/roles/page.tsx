"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Shield, Users, Briefcase } from "lucide-react"

const roles = [
    {
        name: "ADMIN",
        label: "Administrator",
        description: "Full system access with all permissions. Can manage users, roles, and system settings.",
        icon: Shield,
        color: "from-amber-500 to-orange-500",
        permissions: [
            "Full user management",
            "Role and permission management",
            "System configuration",
            "Complete PBX management",
            "Extensions management (create, edit, delete)",
            "Make and control all calls",
            "View live events and logs",
            "Access all features",
        ],
    },
    {
        name: "MANAGER",
        label: "Manager",
        description: "Manage team operations and view reports. Limited administrative capabilities.",
        icon: Briefcase,
        color: "from-blue-500 to-cyan-600",
        permissions: [
            "View users",
            "Manage PBX operations",
            "View and manage extensions",
            "Make and control calls",
            "View live events and logs",
            "View reports and analytics",
            "Monitor call status",
        ],
    },
    {
        name: "EMPLOYEE",
        label: "Employee",
        description: "Basic access to view and use core features. Limited to assigned tasks.",
        icon: Users,
        color: "from-emerald-500 to-teal-600",
        permissions: [
            "View dashboard",
            "Use PBX features",
            "View assigned extensions",
            "Make calls from assigned extensions",
            "View live events",
            "Basic reporting",
        ],
    },
]

export default function RoleManagementPage() {
    return (
        <div className="space-y-6">
            <div className="page-header">
                <h1>Role Management</h1>
                <p>
                    System roles and their permissions
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {roles.map((role) => (
                    <Card key={role.name} className="relative overflow-hidden">
                        <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${role.color}`} />
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg bg-gradient-to-br ${role.color}`}>
                                    <role.icon className="h-5 w-5 text-white" />
                                </div>
                                <div className="flex-1">
                                    <CardTitle className="flex items-center gap-2">
                                        {role.label}
                                        <Badge variant="outline" className="font-mono text-xs">
                                            {role.name}
                                        </Badge>
                                    </CardTitle>
                                </div>
                            </div>
                            <CardDescription className="mt-2">
                                {role.description}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                <p className="text-sm font-semibold text-muted-foreground">
                                    Permissions:
                                </p>
                                <ul className="space-y-1">
                                    {role.permissions.map((permission, index) => (
                                        <li
                                            key={index}
                                            className="text-sm flex items-start gap-2"
                                        >
                                            <span className="text-primary mt-0.5">•</span>
                                            <span>{permission}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Role Hierarchy</CardTitle>
                    <CardDescription>
                        Understanding the permission levels in the system
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="flex items-center gap-4">
                            <div className="flex-shrink-0 w-32 text-sm font-semibold">
                                Highest Access
                            </div>
                            <div className="flex-1 flex items-center gap-2">
                                <Badge className="bg-gradient-to-r from-amber-500 to-orange-500">
                                    ADMIN
                                </Badge>
                                <span className="text-muted-foreground">→</span>
                                <Badge className="bg-gradient-to-r from-blue-500 to-cyan-600">
                                    MANAGER
                                </Badge>
                                <span className="text-muted-foreground">→</span>
                                <Badge className="bg-gradient-to-r from-emerald-500 to-teal-600">
                                    EMPLOYEE
                                </Badge>
                            </div>
                            <div className="flex-shrink-0 w-32 text-sm font-semibold text-right">
                                Basic Access
                            </div>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Each role inherits permissions from roles below it. Administrators have all permissions,
                            Managers have Employee permissions plus management capabilities, and Employees have basic access.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

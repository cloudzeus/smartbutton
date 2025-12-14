"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { useSession, signOut } from "next-auth/react"
import {
    Users,
    Shield,
    Lock,
    ChevronDown,
    LogOut,
    User,
    Settings,
    Activity,
    Phone,
    LayoutDashboard,
    FileText,
    History
} from "lucide-react"

import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { usePermissions } from "@/hooks/use-permissions"

const menuData = [
    {
        title: "Dashboard",
        icon: LayoutDashboard,
        items: [
            {
                title: "Overview",
                url: "/dashboard",
                icon: Activity,
            },
        ],
    },
    {
        title: "PBX Monitor",
        icon: Phone,
        items: [
            {
                title: "PBX Status",
                url: "/dashboard/pbx",
                icon: Activity,
            },
            {
                title: "PBX Logs",
                url: "/dashboard/pbx/logs",
                icon: FileText,
            },
            {
                title: "Extensions",
                url: "/dashboard/extensions",
                icon: Phone,
            },
            {
                title: "Call History",
                url: "/dashboard/pbx/history",
                icon: History,
            },
        ],
    },
    {
        title: "Users & Authentication",
        icon: Shield,
        items: [
            {
                title: "User Management",
                url: "/dashboard/users",
                icon: Users,
            },
            {
                title: "Role Management",
                url: "/dashboard/roles",
                icon: Shield,
            },
            {
                title: "Access Management",
                url: "/dashboard/access",
                icon: Lock,
            },
        ],
    },
    {
        title: "Settings",
        icon: Settings,
        items: [
            {
                title: "PBX Settings",
                url: "/dashboard/settings/pbx",
                icon: Phone,
            },
        ],
    },
]

export function AppSidebar() {
    const pathname = usePathname()
    const { data: session } = useSession()
    const { canViewPage, isLoading } = usePermissions()

    const getInitials = (name?: string | null) => {
        if (!name) return "U"
        return name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2)
    }

    // Filter menu items based on permissions
    const filteredMenuData = menuData.map(group => ({
        ...group,
        items: group.items.filter(item => canViewPage(item.url))
    })).filter(group => group.items.length > 0)

    return (
        <Sidebar>
            <SidebarHeader className="border-b border-sidebar-border p-4">
                <Link href="/dashboard" className="flex items-center gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-chart-2">
                        <Phone className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm font-semibold">Hotel Smart Button</span>
                        <span className="text-xs text-muted-foreground">PBX Dashboard</span>
                    </div>
                </Link>
            </SidebarHeader>

            <SidebarContent>
                {!isLoading && filteredMenuData.map((group) => (
                    <SidebarGroup key={group.title}>
                        <SidebarGroupLabel className="flex items-center gap-2 uppercase tracking-wider text-xs font-semibold">
                            <group.icon className="h-3.5 w-3.5" />
                            {group.title}
                        </SidebarGroupLabel>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                {group.items.map((item) => (
                                    <SidebarMenuItem key={item.title}>
                                        <SidebarMenuButton
                                            asChild
                                            isActive={pathname === item.url}
                                            tooltip={item.title}
                                            className="pl-8"
                                        >
                                            <Link href={item.url}>
                                                <item.icon className="h-4 w-4" />
                                                <span>{item.title}</span>
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                ))}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                ))}
            </SidebarContent>

            <SidebarFooter className="border-t border-sidebar-border p-2">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <SidebarMenuButton
                                    size="lg"
                                    className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                                >
                                    <Avatar className="h-8 w-8">
                                        <AvatarImage src={session?.user?.image || undefined} />
                                        <AvatarFallback className="bg-gradient-to-br from-primary to-chart-2 text-primary-foreground text-xs">
                                            {getInitials(session?.user?.name)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex flex-1 flex-col items-start text-left text-sm leading-tight">
                                        <span className="truncate font-semibold">
                                            {session?.user?.name || session?.user?.email}
                                        </span>
                                        <span className="truncate text-xs">
                                            <Badge
                                                variant={
                                                    session?.user?.role === "ADMIN" ? "admin" :
                                                        session?.user?.role === "MANAGER" ? "manager" :
                                                            "employee"
                                                }
                                            >
                                                {session?.user?.role}
                                            </Badge>
                                        </span>
                                    </div>
                                    <ChevronDown className="ml-auto h-4 w-4" />
                                </SidebarMenuButton>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                                className="w-[--radix-dropdown-menu-trigger-width] min-w-56"
                                side="top"
                                align="end"
                                sideOffset={4}
                            >
                                <DropdownMenuItem asChild>
                                    <Link href="/dashboard/profile" className="cursor-pointer">
                                        <User className="mr-2 h-4 w-4" />
                                        <span>Edit Profile</span>
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                    <Link href="/dashboard/settings" className="cursor-pointer">
                                        <Settings className="mr-2 h-4 w-4" />
                                        <span>Settings</span>
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    className="cursor-pointer text-destructive focus:text-destructive"
                                    onClick={() => signOut({ callbackUrl: "/auth/signin" })}
                                >
                                    <LogOut className="mr-2 h-4 w-4" />
                                    <span>Log out</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
        </Sidebar>
    )
}

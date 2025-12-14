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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Plus, Pencil, Trash2, Users as UsersIcon } from "lucide-react"
import { useSession } from "next-auth/react"
import { usePermissions } from "@/hooks/use-permissions"

interface User {
    id: string
    name: string | null
    email: string
    role: string
    createdAt: string
    updatedAt: string
}

export default function UserManagementPage() {
    const { data: session } = useSession()
    const { canCreate, canEdit, canDelete } = usePermissions()
    const [users, setUsers] = useState<User[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingUser, setEditingUser] = useState<User | null>(null)
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: "",
        role: "EMPLOYEE",
    })

    useEffect(() => {
        fetchUsers()
    }, [])

    const fetchUsers = async () => {
        try {
            const response = await fetch("/api/users")
            const data = await response.json()
            if (data.success) {
                setUsers(data.users)
            }
        } catch (error) {
            console.error("Error fetching users:", error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleOpenDialog = (user?: User) => {
        if (user) {
            setEditingUser(user)
            setFormData({
                name: user.name || "",
                email: user.email,
                password: "",
                role: user.role,
            })
        } else {
            setEditingUser(null)
            setFormData({
                name: "",
                email: "",
                password: "",
                role: "EMPLOYEE",
            })
        }
        setIsDialogOpen(true)
    }

    const handleCloseDialog = () => {
        setIsDialogOpen(false)
        setEditingUser(null)
        setFormData({
            name: "",
            email: "",
            password: "",
            role: "EMPLOYEE",
        })
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        try {
            const url = editingUser ? `/api/users/${editingUser.id}` : "/api/users"
            const method = editingUser ? "PUT" : "POST"

            const response = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(formData),
            })

            const data = await response.json()

            if (data.success) {
                await fetchUsers()
                handleCloseDialog()
            } else {
                alert(data.error || "Failed to save user")
            }
        } catch (error) {
            console.error("Error saving user:", error)
            alert("Failed to save user")
        }
    }

    const handleDelete = async (userId: string) => {
        if (!confirm("Are you sure you want to delete this user?")) {
            return
        }

        try {
            const response = await fetch(`/api/users/${userId}`, {
                method: "DELETE",
            })

            const data = await response.json()

            if (data.success) {
                await fetchUsers()
            } else {
                alert(data.error || "Failed to delete user")
            }
        } catch (error) {
            console.error("Error deleting user:", error)
            alert("Failed to delete user")
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="page-header">
                    <h1>User Management</h1>
                    <p>
                        Manage system users and their roles
                    </p>
                </div>
                {canCreate("/dashboard/users") && (
                    <button
                        onClick={() => handleOpenDialog()}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-600 text-white font-medium text-sm shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105 active:scale-95"
                    >
                        <Plus className="h-4 w-4" />
                        Add User
                    </button>
                )}
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <UsersIcon className="h-5 w-5" />
                        All Users
                    </CardTitle>
                    <CardDescription>
                        A list of all users in the system including their name, email, and role.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="text-center py-8 text-muted-foreground">
                            Loading users...
                        </div>
                    ) : users.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            No users found. Create your first user.
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead>Created</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {users.map((user) => (
                                    <TableRow key={user.id}>
                                        <TableCell className="font-medium">
                                            {user.name || "—"}
                                        </TableCell>
                                        <TableCell>{user.email}</TableCell>
                                        <TableCell>
                                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-white shadow-sm text-xs font-medium tracking-wide uppercase transition-all duration-200 ${user.role === 'ADMIN' ? 'bg-gradient-to-r from-amber-500 to-orange-500' :
                                                user.role === 'MANAGER' ? 'bg-gradient-to-r from-blue-500 to-cyan-600' :
                                                    'bg-gradient-to-r from-emerald-500 to-teal-600'
                                                }`}>
                                                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                                {user.role}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            {new Date(user.createdAt).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                {canEdit("/dashboard/users") && (
                                                    <button
                                                        onClick={() => handleOpenDialog(user)}
                                                        className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-600 text-white font-medium text-xs shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105 active:scale-95"
                                                    >
                                                        <Pencil className="h-3.5 w-3.5" />
                                                    </button>
                                                )}
                                                {canDelete("/dashboard/users") && (
                                                    <button
                                                        onClick={() => handleDelete(user.id)}
                                                        disabled={user.id === session?.user?.id}
                                                        className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-red-600 to-rose-600 text-white font-medium text-xs shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <form onSubmit={handleSubmit}>
                        <DialogHeader>
                            <DialogTitle>
                                {editingUser ? "Edit User" : "Create New User"}
                            </DialogTitle>
                            <DialogDescription>
                                {editingUser
                                    ? "Update user information and role."
                                    : "Add a new user to the system."}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="name">Name</Label>
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) =>
                                        setFormData({ ...formData, name: e.target.value })
                                    }
                                    placeholder="John Doe"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="email">Email *</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) =>
                                        setFormData({ ...formData, email: e.target.value })
                                    }
                                    placeholder="john@example.com"
                                    required
                                    disabled={!!editingUser}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="password">
                                    Password {editingUser && "(leave blank to keep current)"}
                                </Label>
                                <Input
                                    id="password"
                                    type="password"
                                    value={formData.password}
                                    onChange={(e) =>
                                        setFormData({ ...formData, password: e.target.value })
                                    }
                                    placeholder="••••••••"
                                    required={!editingUser}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="role">Role *</Label>
                                <Select
                                    value={formData.role}
                                    onValueChange={(value) =>
                                        setFormData({ ...formData, role: value })
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="EMPLOYEE">Employee</SelectItem>
                                        <SelectItem value="MANAGER">Manager</SelectItem>
                                        <SelectItem value="ADMIN">Admin</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <DialogFooter>
                            <button
                                type="button"
                                onClick={handleCloseDialog}
                                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-slate-600 to-slate-700 text-white font-medium text-sm shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105 active:scale-95"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-600 text-white font-medium text-sm shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105 active:scale-95"
                            >
                                {editingUser ? "Update User" : "Create User"}
                            </button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}

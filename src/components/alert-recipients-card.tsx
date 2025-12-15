"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Bell, Plus, Trash2, GripVertical, Phone, User } from "lucide-react"

interface AlertRecipient {
    id: string
    number: string
    label: string
    type: 'EXTENSION' | 'EXTERNAL'
    order: number
    isActive: boolean
}

export default function AlertRecipientsCard() {
    const [recipients, setRecipients] = useState<AlertRecipient[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [draggedItem, setDraggedItem] = useState<AlertRecipient | null>(null)

    // Form state
    const [formData, setFormData] = useState({
        number: '',
        label: '',
        type: 'EXTENSION' as 'EXTENSION' | 'EXTERNAL'
    })

    useEffect(() => {
        loadRecipients()
    }, [])

    const loadRecipients = async () => {
        try {
            const response = await fetch('/api/alert-recipients')
            const data = await response.json()

            if (data.success) {
                setRecipients(data.recipients)
            }
        } catch (error) {
            console.error('Error loading alert recipients:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleAdd = async () => {
        if (!formData.number || !formData.label) {
            alert('Please fill in all fields')
            return
        }

        try {
            const response = await fetch('/api/alert-recipients', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })

            const data = await response.json()

            if (data.success) {
                await loadRecipients()
                setIsDialogOpen(false)
                setFormData({ number: '', label: '', type: 'EXTENSION' })
            } else {
                alert(data.error || 'Failed to add recipient')
            }
        } catch (error) {
            console.error('Error adding recipient:', error)
            alert('Failed to add recipient')
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this recipient?')) return

        try {
            const response = await fetch(`/api/alert-recipients?id=${id}`, {
                method: 'DELETE'
            })

            const data = await response.json()

            if (data.success) {
                await loadRecipients()
            } else {
                alert(data.error || 'Failed to delete recipient')
            }
        } catch (error) {
            console.error('Error deleting recipient:', error)
            alert('Failed to delete recipient')
        }
    }

    const handleDragStart = (e: React.DragEvent, recipient: AlertRecipient) => {
        setDraggedItem(recipient)
        e.dataTransfer.effectAllowed = 'move'
    }

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
    }

    const handleDrop = async (e: React.DragEvent, targetRecipient: AlertRecipient) => {
        e.preventDefault()

        if (!draggedItem || draggedItem.id === targetRecipient.id) {
            setDraggedItem(null)
            return
        }

        // Reorder the list
        const newRecipients = [...recipients]
        const draggedIndex = newRecipients.findIndex(r => r.id === draggedItem.id)
        const targetIndex = newRecipients.findIndex(r => r.id === targetRecipient.id)

        // Remove dragged item and insert at new position
        newRecipients.splice(draggedIndex, 1)
        newRecipients.splice(targetIndex, 0, draggedItem)

        // Update order values
        const reorderList = newRecipients.map((r, index) => ({
            id: r.id,
            order: index
        }))

        // Optimistically update UI
        setRecipients(newRecipients.map((r, index) => ({ ...r, order: index })))
        setDraggedItem(null)

        // Save to backend
        try {
            await fetch('/api/alert-recipients', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reorderList })
            })
        } catch (error) {
            console.error('Error reordering recipients:', error)
            // Reload on error
            loadRecipients()
        }
    }

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Bell className="h-5 w-5" />
                        Alert Recipients
                    </CardTitle>
                    <CardDescription>
                        Configure numbers to call when smart button is pressed. Drag to reorder call priority.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {isLoading ? (
                        <div className="text-center py-8 text-muted-foreground">
                            Loading recipients...
                        </div>
                    ) : recipients.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <Bell className="h-12 w-12 mx-auto mb-2 opacity-50" />
                            <p>No alert recipients configured</p>
                            <p className="text-xs mt-1">Add numbers to call when smart button is pressed</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {recipients.map((recipient, index) => (
                                <div
                                    key={recipient.id}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, recipient)}
                                    onDragOver={handleDragOver}
                                    onDrop={(e) => handleDrop(e, recipient)}
                                    className="flex items-center gap-3 p-3 border rounded-lg bg-card hover:bg-accent/50 cursor-move transition-colors"
                                >
                                    <GripVertical className="h-4 w-4 text-muted-foreground" />

                                    <Badge variant="outline" className="font-mono">
                                        #{index + 1}
                                    </Badge>

                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            {recipient.type === 'EXTENSION' ? (
                                                <User className="h-4 w-4 text-blue-500" />
                                            ) : (
                                                <Phone className="h-4 w-4 text-green-500" />
                                            )}
                                            <span className="font-semibold">{recipient.label}</span>
                                        </div>
                                        <div className="text-sm text-muted-foreground">
                                            {recipient.number}
                                        </div>
                                    </div>

                                    <Badge variant={recipient.type === 'EXTENSION' ? 'default' : 'secondary'}>
                                        {recipient.type}
                                    </Badge>

                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleDelete(recipient.id)}
                                        className="text-destructive hover:text-destructive"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}

                    <Button
                        onClick={() => setIsDialogOpen(true)}
                        className="w-full gap-2"
                        variant="outline"
                    >
                        <Plus className="h-4 w-4" />
                        Add Recipient
                    </Button>
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add Alert Recipient</DialogTitle>
                        <DialogDescription>
                            Add a number to call when the smart button is pressed
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="type">Type</Label>
                            <Select
                                value={formData.type}
                                onValueChange={(value: 'EXTENSION' | 'EXTERNAL') =>
                                    setFormData({ ...formData, type: value })
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="EXTENSION">Extension</SelectItem>
                                    <SelectItem value="EXTERNAL">External Number</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="number">Number</Label>
                            <Input
                                id="number"
                                placeholder={formData.type === 'EXTENSION' ? 'e.g., 100' : 'e.g., 6940960701'}
                                value={formData.number}
                                onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="label">Label</Label>
                            <Input
                                id="label"
                                placeholder="e.g., Reception, Manager, Security"
                                value={formData.label}
                                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleAdd}>
                            Add Recipient
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}

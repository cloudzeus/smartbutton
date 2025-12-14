import { useSession } from "next-auth/react"
import { useEffect, useState } from "react"

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

export function usePermissions() {
    const { data: session } = useSession()
    const [permissions, setPermissions] = useState<PagePermission[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const fetchPermissions = async () => {
            try {
                const response = await fetch("/api/page-permissions")

                // If response is not ok, it might be a 403 or other error
                if (!response.ok) {
                    console.warn("Could not fetch permissions:", response.status)
                    setIsLoading(false)
                    return
                }

                const data = await response.json()

                if (data.success && data.permissions) {
                    setPermissions(data.permissions)
                }
            } catch (error) {
                console.error("Error fetching permissions:", error)
                // Don't throw - just log and continue with empty permissions
            } finally {
                setIsLoading(false)
            }
        }

        if (session?.user?.role) {
            fetchPermissions()
        } else {
            setIsLoading(false)
        }
    }, [session?.user?.role])

    const hasPermission = (
        path: string,
        action: "canView" | "canCreate" | "canEdit" | "canDelete"
    ): boolean => {
        // Admin always has all permissions
        if (session?.user?.role === "ADMIN") {
            return true
        }

        // If no permissions loaded, default to allowing view for all authenticated users
        if (permissions.length === 0) {
            return action === "canView"
        }

        // Find the page permission
        const page = permissions.find((p) => p.path === path)
        if (!page) {
            // If no permission is set, allow view by default for authenticated users
            return action === "canView"
        }

        // Get the permission for this user's role
        const rolePermission = page.permissions[session?.user?.role || ""]
        if (!rolePermission) {
            return action === "canView"
        }

        return rolePermission[action]
    }

    const canViewPage = (path: string) => hasPermission(path, "canView")
    const canCreate = (path: string) => hasPermission(path, "canCreate")
    const canEdit = (path: string) => hasPermission(path, "canEdit")
    const canDelete = (path: string) => hasPermission(path, "canDelete")

    return {
        hasPermission,
        canViewPage,
        canCreate,
        canEdit,
        canDelete,
        isLoading,
    }
}

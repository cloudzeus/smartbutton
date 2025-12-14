import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <SidebarProvider>
            <AppSidebar />
            <main className="flex-1 w-full">
                <div className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4">
                    <SidebarTrigger />
                    <div className="flex-1" />
                </div>
                <div className="flex-1 p-6">
                    {children}
                </div>
            </main>
        </SidebarProvider>
    )
}

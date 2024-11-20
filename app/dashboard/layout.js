'use client'

import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { StudentSidebar } from '@/components/student-sidebar'

function DashboardContent({ children }) {
  return (
    <div className="relative flex h-screen w-full">
      <StudentSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="container mx-auto py-6">{children}</div>
      </main>
      <div className="fixed bottom-6 right-6 z-40 md:hidden">
        <SidebarTrigger className="h-10 w-10 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90" />
      </div>
    </div>
  )
}

export default function DashboardLayout({ children }) {
  return (
    <SidebarProvider>
      <DashboardContent>{children}</DashboardContent>
    </SidebarProvider>
  )
}

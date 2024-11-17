'use client'

import { SidebarProvider } from '@/components/ui/sidebar'
import { StudentSidebar } from '@/components/student-sidebar'

export default function DashboardLayout({ children }) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen">
        <StudentSidebar />
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </SidebarProvider>
  )
}

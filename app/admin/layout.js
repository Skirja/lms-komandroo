'use client'

import { SidebarProvider } from '@/components/ui/sidebar'
import { AdminSidebar } from '@/components/admin-sidebar'

export default function AdminLayout({ children }) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen">
        <AdminSidebar />
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </SidebarProvider>
  )
}

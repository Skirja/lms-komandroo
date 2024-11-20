'use client'

import { SidebarProvider } from '@/components/ui/sidebar'
import { AdminSidebar } from '@/components/admin-sidebar'

export default function AdminLayout({ children }) {
  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <AdminSidebar />
        <main className="flex-1 w-full">
          <div className="p-6 w-full">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  )
}

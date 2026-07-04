'use client';

import dynamic from 'next/dynamic';

// Dynamic import to prevent SSR issues with localStorage usage
const AdminDashboard = dynamic(
  () => import('@/components/AdminDashboard'),
  { 
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
          <p className="text-gray-500 text-sm font-medium">Loading dashboard...</p>
        </div>
      </div>
    ),
  }
);

export default function DashboardPage() {
  return <AdminDashboard />;
}

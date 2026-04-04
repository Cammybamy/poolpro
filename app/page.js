'use client'
import Link from 'next/link'
import { supabase } from '../lib/supabase'
import { getProfile } from '../lib/profile'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function Home() {
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [stats, setStats] = useState({ customers: 0, todayJobs: 0, unpaidInvoices: 0, pendingJobs: 0 })

  useEffect(() => {
    loadProfile()
  }, [])

  async function loadProfile() {
    const p = await getProfile()
    setProfile(p)
    if (p?.role === 'owner' || p?.role === 'manager') {
      fetchStats()
    }
  }

  async function fetchStats() {
    const today = new Date().toISOString().split('T')[0]
    const [customers, todayJobs, unpaidInvoices, pendingJobs] = await Promise.all([
      supabase.from('customers').select('id', { count: 'exact', head: true }),
      supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('scheduled_date', today),
      supabase.from('invoices').select('id', { count: 'exact', head: true }).eq('status', 'unpaid'),
      supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    ])
    setStats({
      customers: customers.count || 0,
      todayJobs: todayJobs.count || 0,
      unpaidInvoices: unpaidInvoices.count || 0,
      pendingJobs: pendingJobs.count || 0,
    })
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (!profile) return <div className="p-6 text-gray-400">Loading...</div>

  const isTech = profile.role === 'technician'

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-blue-600 text-white p-6 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">PoolPro</h1>
          <p className="text-blue-100 mt-1">{profile.companies?.name}</p>
          <p className="text-blue-200 text-xs mt-1 capitalize">{profile.role} — {profile.full_name}</p>
        </div>
        <button onClick={handleSignOut} className="text-blue-200 text-sm mt-1 hover:text-white">
          Sign Out
        </button>
      </div>

      {!isTech && (
        <div className="p-4 max-w-lg mx-auto mt-4 grid grid-cols-2 gap-3">
          <div className="bg-white rounded-xl shadow p-4 text-center">
            <div className="text-3xl font-bold text-blue-600">{stats.todayJobs}</div>
            <div className="text-gray-500 text-sm mt-1">Jobs Today</div>
          </div>
          <div className="bg-white rounded-xl shadow p-4 text-center">
            <div className="text-3xl font-bold text-yellow-500">{stats.pendingJobs}</div>
            <div className="text-gray-500 text-sm mt-1">Pending Jobs</div>
          </div>
          <div className="bg-white rounded-xl shadow p-4 text-center">
            <div className="text-3xl font-bold text-green-600">{stats.customers}</div>
            <div className="text-gray-500 text-sm mt-1">Total Customers</div>
          </div>
          <div className="bg-white rounded-xl shadow p-4 text-center">
            <div className="text-3xl font-bold text-red-500">{stats.unpaidInvoices}</div>
            <div className="text-gray-500 text-sm mt-1">Unpaid Invoices</div>
          </div>
        </div>
      )}

      <div className="p-4 grid grid-cols-2 gap-4 max-w-lg mx-auto">
        {!isTech && (
          <>
            <Link href="/customers" className="bg-white rounded-xl shadow p-6 text-center hover:shadow-md transition">
              <div className="text-4xl mb-2">👥</div>
              <div className="font-semibold text-gray-700">Customers</div>
            </Link>

            <Link href="/jobs" className="bg-white rounded-xl shadow p-6 text-center hover:shadow-md transition">
              <div className="text-4xl mb-2">🔧</div>
              <div className="font-semibold text-gray-700">Jobs</div>
            </Link>

            <Link href="/chemicals" className="bg-white rounded-xl shadow p-6 text-center hover:shadow-md transition">
              <div className="text-4xl mb-2">🧪</div>
              <div className="font-semibold text-gray-700">Chemical Logs</div>
            </Link>

            <Link href="/invoices" className="bg-white rounded-xl shadow p-6 text-center hover:shadow-md transition">
              <div className="text-4xl mb-2">🧾</div>
              <div className="font-semibold text-gray-700">Invoices</div>
            </Link>
          </>
        )}

        <Link href="/route" className={`${isTech ? 'col-span-2' : 'col-span-2'} bg-blue-50 rounded-xl shadow p-6 text-center hover:shadow-md transition`}>
          <div className="text-4xl mb-2">🗺️</div>
          <div className="font-semibold text-gray-700">Daily Route</div>
        </Link>

        {isTech && (
          <Link href="/my-jobs" className="col-span-2 bg-white rounded-xl shadow p-6 text-center hover:shadow-md transition">
            <div className="text-4xl mb-2">🔧</div>
            <div className="font-semibold text-gray-700">My Jobs</div>
          </Link>
        )}

        {profile.role === 'owner' && (
          <Link href="/users" className="col-span-2 bg-gray-50 rounded-xl shadow p-6 text-center hover:shadow-md transition">
            <div className="text-4xl mb-2">⚙️</div>
            <div className="font-semibold text-gray-700">Manage Users</div>
          </Link>
        )}
      </div>
    </div>
  )
}

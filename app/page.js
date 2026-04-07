'use client'
import Link from 'next/link'
import { supabase } from '../lib/supabase'
import { getProfile } from '../lib/profile'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import dynamic from 'next/dynamic'
import AddressInput from './components/AddressInput'

const RouteMap = dynamic(() => import('./components/RouteMap'), { ssr: false })

export default function Home() {
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [activeTab, setActiveTab] = useState('dashboard')

  // Dashboard
  const [stats, setStats] = useState({ customers: 0, todayJobs: 0, unpaidInvoices: 0, pendingJobs: 0 })
  const [todayJobs, setTodayJobs] = useState([])
  const [unpaidInvoices, setUnpaidInvoices] = useState([])
  const [monthlyRevenue, setMonthlyRevenue] = useState([])

  // Weather
  const [weather, setWeather] = useState([])
  const [weatherCity, setWeatherCity] = useState('')
  const [weatherLoading, setWeatherLoading] = useState(false)
  const [weatherError, setWeatherError] = useState('')

  // Calendar
  const [calendarMonth, setCalendarMonth] = useState(new Date())
  const [calendarJobs, setCalendarJobs] = useState([])
  const [selectedDay, setSelectedDay] = useState(null)

  // Customers
  const [customers, setCustomers] = useState([])
  const [customerForm, setCustomerForm] = useState({ name: '', address: '', phone: '', email: '', notes: '', service_frequency: 'none', monthly_rate: '', pool_size_gallons: '', pool_type: '', filter_type: '', equipment_brand: '', equipment_notes: '' })
  const [showCustomerForm, setShowCustomerForm] = useState(false)
  const [customerError, setCustomerError] = useState('')
  const [newCustomerPhotos, setNewCustomerPhotos] = useState([])
  const [newCustomerUploading, setNewCustomerUploading] = useState(false)
  const newCustomerFileRef = useRef()

  // Jobs
  const [jobs, setJobs] = useState([])
  const [jobForm, setJobForm] = useState({ customer_id: '', scheduled_date: '', technician: '', notes: '', status: 'pending' })
  const [showJobForm, setShowJobForm] = useState(false)
  const [technicians, setTechnicians] = useState([])

  // Route
  const [routeDate, setRouteDate] = useState(new Date().toISOString().split('T')[0])
  const [routeJobs, setRouteJobs] = useState([])
  const [routeDriveTimes, setRouteDriveTimes] = useState([])
  const [techRouteDriveTimes, setTechRouteDriveTimes] = useState([])
  const [techRouteStartTime, setTechRouteStartTime] = useState(null)
  const [techUserLocation, setTechUserLocation] = useState(null)
  const [optimizing, setOptimizing] = useState(false)
  const [optimizeError, setOptimizeError] = useState('')

  // Revenue forecast
  const [forecast, setForecast] = useState(0)

  // Chemicals
  const [chemLogs, setChemLogs] = useState([])

  // Invoices
  const [invoices, setInvoices] = useState([])

  // Reports
  const [reportCustomers, setReportCustomers] = useState([])
  const [selectedReportCustomer, setSelectedReportCustomer] = useState('')
  const [reportLogs, setReportLogs] = useState([])

  // Team
  const [teamUsers, setTeamUsers] = useState([])
  const [showTeamForm, setShowTeamForm] = useState(false)
  const [teamForm, setTeamForm] = useState({ email: '', full_name: '', role: 'technician' })
  const [teamMessage, setTeamMessage] = useState('')
  const [teamLoading, setTeamLoading] = useState(false)
  const [teamJobStats, setTeamJobStats] = useState({})

  // Tech
  const [techTab, setTechTab] = useState('jobs')
  const [techTodayJobs, setTechTodayJobs] = useState([])
  const [techUpcomingJobs, setTechUpcomingJobs] = useState([])
  const [techRouteDate, setTechRouteDate] = useState(new Date().toISOString().split('T')[0])
  const [techRouteJobs, setTechRouteJobs] = useState([])

  const [adminView, setAdminView] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    loadProfile()
  }, [])

  useEffect(() => {
    if (!profile) return
    if (activeTab === 'dashboard') { fetchDashboard(); fetchWeather(); fetchCalendarJobs(calendarMonth) }
    if (activeTab === 'customers') fetchCustomers()
    if (activeTab === 'jobs') { fetchJobs(); fetchCustomers(); fetchTechnicians() }
    if (activeTab === 'route') fetchRouteJobs(routeDate)
    if (activeTab === 'chemicals') fetchChemicals()
    if (activeTab === 'invoices') fetchInvoices()
    if (activeTab === 'reports') fetchReportCustomers()
    if (activeTab === 'users') fetchTeamUsers()
  }, [activeTab, profile])

  useEffect(() => {
    if (activeTab === 'route') fetchRouteJobs(routeDate)
  }, [routeDate])

  async function loadProfile() {
    // Check for admin impersonation
    const adminViewRaw = typeof window !== 'undefined' ? sessionStorage.getItem('adminView') : null
    if (adminViewRaw) {
      const av = JSON.parse(adminViewRaw)
      setAdminView(av)
      const p = await getProfile()
      // Override role and company for the impersonated view
      setProfile({ ...p, role: av.role, company_id: av.company_id, full_name: av.user_name, companies: { name: av.company_name } })
      if (av.role === 'technician') {
        fetchTechJobs(av.user_name)
        fetchTechRoute(av.user_name, new Date().toISOString().split('T')[0])
      }
      return
    }
    const p = await getProfile()
    // Super admins go straight to the admin panel unless previewing
    const isPreviewing = typeof window !== 'undefined' && sessionStorage.getItem('adminPreview') === 'true'
    if (p?.super_admin && !isPreviewing) {
      router.push('/admin')
      return
    }
    if (p?.super_admin && isPreviewing) setAdminView({ preview: true })
    if (p?.needs_password_change) { router.push('/join?setup=1'); return }
    setProfile(p)
    if (p?.role === 'technician') {
      fetchTechJobs(p.full_name)
      fetchTechRoute(p.full_name, new Date().toISOString().split('T')[0])
    }
  }

  function exitAdminView() {
    sessionStorage.removeItem('adminView')
    sessionStorage.removeItem('adminPreview')
    router.push('/admin')
  }

  async function fetchTechJobs(name) {
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase
      .from('jobs')
      .select('*, customers(name, address, phone)')
      .eq('technician', name)
      .neq('status', 'complete')
      .order('scheduled_date', { ascending: true })
    const todayList = (data || []).filter(j => j.scheduled_date === today)
    const upcoming = (data || []).filter(j => j.scheduled_date > today)
    setTechTodayJobs(todayList)
    setTechUpcomingJobs(upcoming)
  }

  async function fetchTechRoute(name, date) {
    const { data } = await supabase
      .from('jobs')
      .select('*, customers(name, address, phone)')
      .eq('technician', name)
      .eq('scheduled_date', date)
      .order('route_order', { ascending: true })
    setTechRouteJobs(data || [])
  }

  async function fetchDashboard() {
    const today = new Date().toISOString().split('T')[0]
    const [cRes, tRes, uRes, pRes, tjRes, uiRes, mrRes, fcRes] = await Promise.all([
      supabase.from('customers').select('id', { count: 'exact', head: true }),
      supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('scheduled_date', today),
      supabase.from('invoices').select('id', { count: 'exact', head: true }).eq('status', 'unpaid'),
      supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('jobs').select('*, customers(name, address)').eq('scheduled_date', today).order('route_order'),
      supabase.from('invoices').select('*, customers(name)').eq('status', 'unpaid').order('due_date').limit(5),
      supabase.from('monthly_revenue').select('*').limit(6),
      supabase.from('customers').select('monthly_rate'),
    ])
    setStats({ customers: cRes.count || 0, todayJobs: tRes.count || 0, unpaidInvoices: uRes.count || 0, pendingJobs: pRes.count || 0 })
    setTodayJobs(tjRes.data || [])
    setUnpaidInvoices(uiRes.data || [])
    setMonthlyRevenue(mrRes.data || [])
    const total = (fcRes.data || []).reduce((sum, c) => sum + (parseFloat(c.monthly_rate) || 0), 0)
    setForecast(total)
  }

  async function fetchWeather() {
    setWeatherLoading(true)
    setWeatherError('')
    try {
      let lat, lon
      // Try GPS first
      if (navigator.geolocation) {
        try {
          const pos = await new Promise((resolve, reject) =>
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 6000 })
          )
          lat = pos.coords.latitude
          lon = pos.coords.longitude
        } catch (e) {}
      }
      // Fall back to IP-based location
      if (!lat || !lon) {
        const ipRes = await fetch('https://ipapi.co/json/')
        const ipData = await ipRes.json()
        lat = ipData.latitude
        lon = ipData.longitude
      }
      if (!lat || !lon) { setWeatherError('Could not determine location.'); setWeatherLoading(false); return }
      const res = await fetch(`/api/weather?lat=${lat}&lon=${lon}`)
      const data = await res.json()
      if (data.error) { setWeatherError(`Weather API error: ${data.error}`); setWeatherLoading(false); return }
      setWeather(data.forecast || [])
      setWeatherCity(data.city || '')
    } catch (e) {
      setWeatherError(`Failed to load weather: ${e.message}`)
    }
    setWeatherLoading(false)
  }

  async function fetchCalendarJobs(month) {
    const year = month.getFullYear()
    const m = month.getMonth()
    const start = new Date(year, m, 1).toISOString().split('T')[0]
    const end = new Date(year, m + 1, 0).toISOString().split('T')[0]
    const { data } = await supabase.from('jobs').select('id, scheduled_date, status, technician, customers(name)').gte('scheduled_date', start).lte('scheduled_date', end).order('scheduled_date')
    setCalendarJobs(data || [])
  }

  async function fetchCustomers() {
    const { data } = await supabase.from('customers').select('*').order('name')
    setCustomers(data || [])
  }

  async function addCustomer() {
    if (!customerForm.name) return
    setCustomerError('')
    const payload = {
      ...customerForm,
      monthly_rate: customerForm.monthly_rate !== '' ? customerForm.monthly_rate : null,
      pool_size_gallons: customerForm.pool_size_gallons !== '' ? customerForm.pool_size_gallons : null,
    }
    const { data: newCust, error: insertError } = await supabase.from('customers').insert([payload]).select().single()
    if (insertError) {
      setCustomerError(insertError.message)
      return
    }
    if (newCust && newCustomerPhotos.length > 0) {
      setNewCustomerUploading(true)
      const results = await Promise.all(newCustomerPhotos.map(async pending => {
        const safeName = pending.file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
        const fileName = `${newCust.id}/${Date.now()}-${safeName}`
        const { error } = await supabase.storage.from('equipment-photos').upload(fileName, pending.file)
        if (error) return null
        const { data: urlData } = supabase.storage.from('equipment-photos').getPublicUrl(fileName)
        return { url: urlData.publicUrl, name: pending.name.trim() || 'Photo' }
      }))
      const entries = results.filter(Boolean)
      if (entries.length > 0) {
        await supabase.from('customers').update({ equipment_photos: entries }).eq('id', newCust.id)
      }
      setNewCustomerUploading(false)
    }
    setCustomerForm({ name: '', address: '', phone: '', email: '', notes: '', service_frequency: 'none', monthly_rate: '', pool_size_gallons: '', pool_type: '', filter_type: '', equipment_brand: '', equipment_notes: '' })
    setNewCustomerPhotos([])
    setShowCustomerForm(false)
    fetchCustomers()
  }

  async function fetchTechnicians() {
    const { data } = await supabase.from('profiles').select('id, full_name').eq('role', 'technician').order('full_name')
    setTechnicians(data || [])
  }

  async function fetchJobs() {
    const { data } = await supabase.from('jobs').select('*, customers(name)').order('scheduled_date', { ascending: false })
    setJobs(data || [])
  }

  async function addJob() {
    if (!jobForm.customer_id || !jobForm.scheduled_date) return
    await supabase.from('jobs').insert([jobForm])
    setJobForm({ customer_id: '', scheduled_date: '', technician: '', notes: '', status: 'pending' })
    setShowJobForm(false)
    fetchJobs()
  }

  async function fetchRouteJobs(date) {
    const { data } = await supabase.from('jobs').select('*, customers(name, address)').eq('scheduled_date', date).order('route_order')
    setRouteJobs(data || [])
  }

  async function optimizeRoute() {
    if (routeJobs.length < 2) return
    setOptimizing(true)
    setOptimizeError('')
    try {
      const res = await fetch('/api/optimize-route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobs: routeJobs })
      })
      const { order, driveTimes } = await res.json()
      const reordered = order.map(jobId => routeJobs.find(j => j.id === jobId)).filter(Boolean)
      await Promise.all(reordered.map((job, i) => supabase.from('jobs').update({ route_order: i }).eq('id', job.id)))
      setRouteJobs(reordered)
      setRouteDriveTimes(driveTimes || [])
    } catch (e) {
      setOptimizeError('Optimization failed. Check that customer addresses are complete.')
    }
    setOptimizing(false)
  }

  async function moveJob(index, direction) {
    const newJobs = [...routeJobs]
    const swapIndex = index + direction
    if (swapIndex < 0 || swapIndex >= newJobs.length) return
    const temp = newJobs[index]
    newJobs[index] = newJobs[swapIndex]
    newJobs[swapIndex] = temp
    await Promise.all(newJobs.map((job, i) => supabase.from('jobs').update({ route_order: i }).eq('id', job.id)))
    setRouteJobs(newJobs)
  }

  async function fetchChemicals() {
    const { data } = await supabase.from('chemical_logs').select('*, customers(name), jobs(technician), chemical_treatments(*)').order('created_at', { ascending: false })
    setChemLogs(data || [])
  }

  async function fetchReportCustomers() {
    const { data } = await supabase.from('customers').select('id, name').order('name')
    setReportCustomers(data || [])
  }

  async function fetchReportLogs(customerId) {
    const { data } = await supabase
      .from('chemical_logs')
      .select('*, chemical_treatments(*)')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: true })
    setReportLogs(data || [])
  }

  async function fetchInvoices() {
    const { data } = await supabase.from('invoices').select('*, customers(name)').order('created_at', { ascending: false })
    setInvoices(data || [])
  }

  async function fetchTeamUsers() {
    const [usersRes, jobsRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('company_id', profile.company_id).order('full_name'),
      supabase.from('jobs').select('technician, status')
    ])
    setTeamUsers(usersRes.data || [])
    const stats = {}
    ;(jobsRes.data || []).forEach(j => {
      if (!j.technician) return
      if (!stats[j.technician]) stats[j.technician] = { scheduled: 0, completed: 0 }
      if (j.status === 'complete') stats[j.technician].completed++
      else stats[j.technician].scheduled++
    })
    setTeamJobStats(stats)
  }

  async function sendTeamInvite() {
    if (!teamForm.email || !teamForm.full_name) { setTeamMessage('Name and email are required'); return }
    setTeamLoading(true)
    setTeamMessage('')
    try {
      const res = await fetch('/api/invite-user', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: teamForm.email, full_name: teamForm.full_name, role: teamForm.role, company_id: profile.company_id }) })
      const result = await res.json()
      if (result.error) { setTeamMessage('Error: ' + result.error) }
      else { setTeamMessage(`✅ Account created! Temp password: ${result.tempPassword} — share this with ${teamForm.full_name} directly.`); setTeamForm({ email: '', full_name: '', role: 'technician' }); setShowTeamForm(false); fetchTeamUsers() }
    } catch (e) { setTeamMessage('Error: ' + e.message) }
    setTeamLoading(false)
  }

  async function updateTeamRole(userId, newRole) {
    await supabase.from('profiles').update({ role: newRole }).eq('id', userId)
    fetchTeamUsers()
  }

  async function removeTeamUser(userId) {
    if (!confirm('Remove this user? This will fully delete their account so they can be re-invited later.')) return
    await fetch('/api/admin/delete-user', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ profile_id: userId }) })
    fetchTeamUsers()
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (!profile) return <div className="p-6 text-gray-400">Loading...</div>

  const isTech = profile.role === 'technician'
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  if (isTech) {
    return (
      <div className="min-h-screen bg-gray-50">
        {adminView && (
          <div className="bg-yellow-400 text-gray-900 px-4 py-2 flex items-center justify-between sticky top-0 z-20 text-sm font-semibold">
            {adminView.preview
              ? <span>👁 Admin Preview — viewing as yourself</span>
              : <span>👁 Admin View — {adminView.company_name} as <span className="capitalize">{adminView.role}</span> ({adminView.user_name})</span>
            }
            <button onClick={exitAdminView} className="bg-gray-900 text-yellow-400 px-3 py-1 rounded-lg text-xs font-bold hover:bg-gray-800 transition">← Back to Admin</button>
          </div>
        )}
        <nav className="bg-slate-900 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
          <div>
            <span className="text-white font-bold text-lg">Pool Pilot</span>
            <div className="text-xs text-slate-400">{profile.full_name} · Technician</div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setTechTab('jobs')} className={`px-3 py-1.5 text-sm rounded-lg transition ${techTab === 'jobs' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}>My Jobs</button>
            <button onClick={() => { setTechTab('route'); fetchTechRoute(profile.full_name, techRouteDate) }} className={`px-3 py-1.5 text-sm rounded-lg transition ${techTab === 'route' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}>Route</button>
          </div>
          <button onClick={handleSignOut} className="text-sm text-slate-400 hover:text-white">Sign Out</button>
        </nav>

        <div className="max-w-lg mx-auto p-4">
          {techTab === 'jobs' && (
            <div>
              <div className="mb-2">
                <p className="text-gray-400 text-sm">{today}</p>
              </div>

              <h3 className="font-semibold text-gray-700 mb-2 mt-4">Today</h3>
              {techTodayJobs.length === 0 && <p className="text-gray-400 text-sm mb-4">No jobs today</p>}
              <div className="space-y-2 mb-6">
                {techTodayJobs.map(job => (
                  <Link href={`/my-jobs/${job.id}`} key={job.id} className="block bg-white rounded-xl shadow-sm border border-blue-100 p-4 hover:shadow-md transition">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-semibold text-gray-800">{job.customers?.name}</div>
                        <div className="text-gray-500 text-sm">{job.customers?.address}</div>
                        <div className="text-gray-400 text-sm">{job.customers?.phone}</div>
                      </div>
                      <span className={job.status === 'complete' ? 'text-xs px-2 py-1 rounded-full bg-green-100 text-green-700' : 'text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-700'}>{job.status}</span>
                    </div>
                    {job.notes && <p className="text-gray-500 text-sm mt-2 bg-blue-50 rounded-lg p-2">{job.notes}</p>}
                  </Link>
                ))}
              </div>

              <h3 className="font-semibold text-gray-700 mb-2">Upcoming</h3>
              {techUpcomingJobs.length === 0 && <p className="text-gray-400 text-sm">No upcoming jobs</p>}
              <div className="space-y-2">
                {techUpcomingJobs.map(job => (
                  <Link href={`/my-jobs/${job.id}`} key={job.id} className="block bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-semibold text-gray-800">{job.customers?.name}</div>
                        <div className="text-gray-500 text-sm">{job.customers?.address}</div>
                        <div className="text-blue-400 text-xs mt-1">{new Date(job.scheduled_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</div>
                      </div>
                      <span className={job.status === 'complete' ? 'text-xs px-2 py-1 rounded-full bg-green-100 text-green-700' : 'text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-700'}>{job.status}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {techTab === 'route' && (
            <div>
              <h2 className="text-xl font-bold text-slate-800 mb-3">My Route</h2>
              <input
                type="date"
                className="w-full border rounded-xl p-3 text-gray-800 bg-white shadow-sm mb-3"
                value={techRouteDate}
                onChange={e => { setTechRouteDate(e.target.value); fetchTechRoute(profile.full_name, e.target.value) }}
              />
              {techRouteJobs.length >= 2 && (
                <>
                <button onClick={async () => {
                  setOptimizing(true)
                  let startLocation = null
                  try {
                    startLocation = await new Promise((resolve) => {
                      if (!navigator.geolocation) return resolve(null)
                      navigator.geolocation.getCurrentPosition(
                        pos => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
                        () => resolve(null),
                        { timeout: 8000 }
                      )
                    })
                    if (startLocation) setTechUserLocation(startLocation)
                  } catch (e) {}
                  try {
                    const res = await fetch('/api/optimize-route', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jobs: techRouteJobs, startLocation }) })
                    const { order, driveTimes, startDriveTime } = await res.json()
                    const reordered = order.map(jobId => techRouteJobs.find(j => j.id === jobId)).filter(Boolean)
                    await Promise.all(reordered.map((job, i) => supabase.from('jobs').update({ route_order: i }).eq('id', job.id)))
                    setTechRouteJobs(reordered)
                    setTechRouteDriveTimes(driveTimes || [])
                    setTechRouteStartTime(startDriveTime ?? null)
                  } catch (e) {
                    setOptimizeError('Optimization failed. Check that customer addresses are complete.')
                  }
                  setOptimizing(false)
                }} disabled={optimizing} className="w-full mb-2 bg-purple-600 text-white py-3 rounded-xl font-semibold text-sm">{optimizing ? 'Optimizing route...' : 'Optimize Route with AI'}</button>
                {optimizeError && <p className="text-red-500 text-sm text-center mb-3">{optimizeError}</p>}
                </>
              )}
              {techRouteJobs.length === 0
                ? <p className="text-center text-gray-400 mt-8">No jobs on this day</p>
                : <RouteMap
                    jobs={techRouteJobs}
                    driveTimes={techRouteDriveTimes}
                    startDriveTime={techRouteStartTime}
                    userLocation={techUserLocation}
                    onReorder={async (newJobs) => {
                      setTechRouteJobs(newJobs)
                      setTechRouteDriveTimes([])
                      setTechRouteStartTime(null)
                      await Promise.all(newJobs.map((job, i) => supabase.from('jobs').update({ route_order: i }).eq('id', job.id)))
                    }}
                  />
              }
            </div>
          )}
        </div>
      </div>
    )
  }

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: '⊞' },
    { id: 'customers', label: 'Customers', icon: '👥' },
    { id: 'jobs', label: 'Jobs', icon: '📋' },
    { id: 'route', label: 'Route', icon: '🗺️' },
    { id: 'chemicals', label: 'Chemicals', icon: '🧪' },
    { id: 'invoices', label: 'Invoices', icon: '🧾' },
    { id: 'reports', label: 'Reports', icon: '📊' },
    ...(profile.role === 'owner' || profile.role === 'manager' ? [{ id: 'users', label: 'Team', icon: '👤' }] : []),
  ]

  return (
    <div className="min-h-screen bg-slate-50 lg:flex">

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-30 w-64 bg-slate-900 flex flex-col transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:static lg:translate-x-0`}>
        <div className="px-5 py-5 border-b border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-white font-bold text-lg leading-tight">Pool Pilot</div>
            <div className="text-slate-400 text-xs mt-0.5">{profile.full_name} · <span className="capitalize">{profile.role}</span></div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-slate-400 hover:text-white text-xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-800">✕</button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setSidebarOpen(false) }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition text-left ${activeTab === tab.id ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
            >
              <span className="text-base w-5 text-center leading-none flex-shrink-0">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-slate-800 space-y-0.5">
          {profile.super_admin && (
            <button onClick={() => router.push('/admin')} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-amber-400 hover:bg-slate-800 transition text-left">
              <span className="text-base w-5 text-center leading-none flex-shrink-0">⚙️</span> Admin Panel
            </button>
          )}
          <button onClick={handleSignOut} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition text-left">
            <span className="text-base w-5 text-center leading-none flex-shrink-0">↩</span> Sign Out
          </button>
        </div>
      </aside>

      {sidebarOpen && <div className="fixed inset-0 z-20 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Main content */}
      <div className="flex-1 min-w-0 flex flex-col">
        {adminView && (
          <div className="bg-amber-400 text-gray-900 px-4 py-2 flex items-center justify-between text-sm font-semibold sticky top-0 z-10">
            {adminView.preview
              ? <span>👁 Admin Preview — viewing as yourself</span>
              : <span>👁 Admin View — {adminView.company_name} as <span className="capitalize">{adminView.role}</span> ({adminView.user_name})</span>
            }
            <button onClick={exitAdminView} className="bg-gray-900 text-amber-400 px-3 py-1 rounded-lg text-xs font-bold hover:bg-gray-800 transition">← Back to Admin</button>
          </div>
        )}

        <header className="lg:hidden bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
          <button onClick={() => setSidebarOpen(true)} className="text-slate-600 text-xl w-9 h-9 flex items-center justify-center hover:bg-slate-100 rounded-lg">☰</button>
          <span className="font-bold text-slate-800 text-lg">Pool Pilot</span>
        </header>

        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          <div className="max-w-7xl mx-auto">

        {activeTab === 'dashboard' && (
          <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-slate-800">{profile.companies?.name}</h2>
                <p className="text-slate-400 text-sm">{today} · <span className="capitalize">{profile.role}</span></p>
              </div>
              <div className="text-right hidden md:block">
                <div className="text-xs text-slate-400">Monthly Forecast</div>
                <div className="text-2xl font-bold text-emerald-600">${forecast.toFixed(2)}</div>
              </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
              {[
                { value: stats.todayJobs, label: "Jobs Today", color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-100", tab: 'jobs' },
                { value: stats.pendingJobs, label: "Pending", color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-100", tab: 'jobs' },
                { value: stats.customers, label: "Customers", color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-100", tab: 'customers' },
                { value: stats.unpaidInvoices, label: "Unpaid Invoices", color: "text-rose-700", bg: "bg-rose-50", border: "border-rose-100", tab: 'invoices' },
              ].map(s => (
                <button key={s.label} onClick={() => setActiveTab(s.tab)}
                  className={`bg-white rounded-xl border ${s.border} shadow-sm p-4 flex items-center gap-3 hover:shadow-md transition text-left`}>
                  <div className={`${s.bg} rounded-lg p-2 flex-shrink-0`}>
                    <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                  </div>
                  <div className="text-sm text-slate-500 font-medium">{s.label}</div>
                </button>
              ))}
            </div>

            {/* Main Grid: Calendar + Right Panel */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">

              {/* Calendar — takes 2/3 */}
              <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-semibold text-slate-700">{calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h3>
                  <div className="flex gap-1">
                    <button onClick={() => { const m = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1); setCalendarMonth(m); fetchCalendarJobs(m) }} className="text-gray-400 hover:text-blue-600 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-50 text-lg">‹</button>
                    <button onClick={() => { const m = new Date(); setCalendarMonth(m); fetchCalendarJobs(m) }} className="text-xs text-blue-600 px-2 py-1 rounded-lg hover:bg-blue-50">Today</button>
                    <button onClick={() => { const m = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1); setCalendarMonth(m); fetchCalendarJobs(m) }} className="text-gray-400 hover:text-blue-600 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-50 text-lg">›</button>
                  </div>
                </div>
                <div className="grid grid-cols-7 mb-1">
                  {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => <div key={d} className="text-center text-xs font-semibold text-gray-400 py-1">{d}</div>)}
                </div>
                <div className="grid grid-cols-7 gap-0.5">
                  {(() => {
                    const year = calendarMonth.getFullYear()
                    const month = calendarMonth.getMonth()
                    const firstDay = new Date(year, month, 1).getDay()
                    const daysInMonth = new Date(year, month + 1, 0).getDate()
                    const todayStr = new Date().toISOString().split('T')[0]
                    const cells = []
                    for (let i = 0; i < firstDay; i++) cells.push(<div key={`e${i}`} />)
                    for (let d = 1; d <= daysInMonth; d++) {
                      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
                      const dayJobs = calendarJobs.filter(j => j.scheduled_date === dateStr)
                      const isToday = dateStr === todayStr
                      const isSelected = selectedDay === dateStr
                      cells.push(
                        <button key={d} onClick={() => setSelectedDay(isSelected ? null : dateStr)}
                          className={`rounded-lg p-1 text-center transition aspect-square flex flex-col items-center justify-center ${isToday ? 'bg-blue-600 text-white' : isSelected ? 'bg-blue-50 border border-blue-300' : 'hover:bg-gray-50'}`}>
                          <div className={`text-xs font-semibold leading-none ${isToday ? 'text-white' : 'text-gray-700'}`}>{d}</div>
                          {dayJobs.length > 0 && (
                            <div className={`text-xs font-bold leading-none mt-0.5 ${isToday ? 'text-blue-100' : 'text-blue-600'}`}>{dayJobs.length}</div>
                          )}
                        </button>
                      )
                    }
                    return cells
                  })()}
                </div>
                {selectedDay && (() => {
                  const dayJobs = calendarJobs.filter(j => j.scheduled_date === selectedDay)
                  return (
                    <div className="mt-3 border-t pt-3">
                      <p className="text-xs font-semibold text-gray-500 mb-2">{new Date(selectedDay + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
                      {dayJobs.length === 0 ? <p className="text-gray-400 text-sm">No jobs</p> : (
                        <div className="space-y-1">
                          {dayJobs.map(j => (
                            <Link href={`/jobs/${j.id}`} key={j.id} className="flex justify-between items-center p-2 rounded-lg hover:bg-gray-50">
                              <div>
                                <span className="text-sm font-medium text-gray-800">{j.customers?.name}</span>
                                {j.technician && <span className="text-xs text-gray-400 ml-2">— {j.technician}</span>}
                              </div>
                              <span className={j.status === 'complete' ? 'text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700' : 'text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700'}>{j.status}</span>
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })()}
              </div>

              {/* Right column: Today's Jobs + Unpaid Invoices */}
              <div className="flex flex-col gap-4">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex-1">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-semibold text-slate-700">Today's Jobs</h3>
                    <button onClick={() => setActiveTab('jobs')} className="text-blue-600 text-xs hover:underline">View all</button>
                  </div>
                  {todayJobs.length === 0 ? <p className="text-slate-400 text-sm">No jobs today</p> : (
                    <div className="space-y-1.5 overflow-y-auto max-h-48">
                      {todayJobs.map(job => (
                        <Link href={`/jobs/${job.id}`} key={job.id} className="flex justify-between items-center p-2 rounded-lg hover:bg-gray-50">
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-gray-800 truncate">{job.customers?.name}</div>
                            <div className="text-xs text-gray-400 truncate">{job.technician || 'Unassigned'}</div>
                          </div>
                          <span className={`ml-2 flex-shrink-0 text-xs px-2 py-0.5 rounded-full ${job.status === 'complete' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{job.status}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex-1">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-semibold text-slate-700">Unpaid Invoices</h3>
                    <button onClick={() => setActiveTab('invoices')} className="text-blue-600 text-xs hover:underline">View all</button>
                  </div>
                  {unpaidInvoices.length === 0 ? <p className="text-slate-400 text-sm">All clear</p> : (
                    <div className="space-y-1.5 overflow-y-auto max-h-48">
                      {unpaidInvoices.map(inv => (
                        <Link href={`/invoices/${inv.id}`} key={inv.id} className="flex justify-between items-center p-2 rounded-lg hover:bg-gray-50">
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-gray-800 truncate">{inv.customers?.name}</div>
                            <div className="text-xs text-gray-400">Due: {inv.due_date || '—'}</div>
                          </div>
                          <span className="ml-2 flex-shrink-0 text-sm font-semibold text-gray-800">${inv.amount}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Revenue — full width */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-4">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-semibold text-slate-700 text-base">Revenue — Last 6 Months</h3>
                {monthlyRevenue.length > 0 && (
                  <div className="text-right">
                    <div className="text-xs text-slate-400">Total Collected</div>
                    <div className="text-lg font-bold text-emerald-600">${monthlyRevenue.reduce((s, r) => s + Number(r.actual), 0).toFixed(0)}</div>
                  </div>
                )}
              </div>
              {monthlyRevenue.length === 0 ? <p className="text-slate-400 text-sm">No invoice data yet</p> : (
                <div className="space-y-4">
                  {monthlyRevenue.map((row, i) => {
                    const month = new Date(row.month).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                    const pct = row.potential > 0 ? Math.round((row.actual / row.potential) * 100) : 0
                    return (
                      <div key={i}>
                        <div className="flex justify-between items-baseline mb-1.5">
                          <span className="text-sm font-medium text-slate-600">{month}</span>
                          <div className="text-right">
                            <span className="text-base font-bold text-slate-800">${Number(row.actual).toFixed(0)}</span>
                            <span className="text-sm text-slate-400 ml-1">/ ${Number(row.potential).toFixed(0)}</span>
                            <span className={`ml-2 text-xs font-semibold px-1.5 py-0.5 rounded-full ${pct >= 80 ? 'bg-emerald-100 text-emerald-700' : pct >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>{pct}%</span>
                          </div>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-3">
                          <div className={`h-3 rounded-full transition-all ${pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-400' : 'bg-rose-400'}`} style={{ width: `${pct}%` }}></div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Weather — full width compact */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <h3 className="font-semibold text-slate-700 mb-3 text-sm">
                Weather {weatherCity && <span className="text-slate-400 font-normal">— {weatherCity}</span>}
              </h3>
              {weatherLoading && <p className="text-slate-400 text-sm text-center py-2">Loading...</p>}
              {weatherError && <p className="text-red-400 text-sm">{weatherError}</p>}
              {weather.length > 0 && (
                <div className="grid grid-cols-7 gap-2">
                  {weather.map((day, i) => {
                    const d = new Date(day.date + 'T12:00:00')
                    const label = i === 0 ? 'Today' : d.toLocaleDateString('en-US', { weekday: 'short' })
                    const emoji = { Clear: '☀️', Clouds: '⛅', Rain: '🌧️', Drizzle: '🌦️', Thunderstorm: '⛈️', Snow: '❄️', Mist: '🌫️', Fog: '🌫️', Haze: '🌫️' }[day.condition] || '🌤️'
                    return (
                      <div key={day.date} className={`text-center rounded-xl p-2 ${i === 0 ? 'bg-blue-50 border border-blue-100' : 'bg-slate-50'}`}>
                        <div className="text-xs font-semibold text-slate-500 mb-1">{label}</div>
                        <div className="text-xl mb-1">{emoji}</div>
                        <div className="text-sm font-bold text-slate-800">{day.high}°</div>
                        <div className="text-xs text-slate-400">{day.low}°</div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'customers' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-slate-800">Customers</h2>
              <button onClick={() => setShowCustomerForm(!showCustomerForm)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold">+ Add Customer</button>
            </div>
            {showCustomerForm && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4 space-y-3">
                <input className="w-full border rounded-lg p-2 text-gray-800 bg-white" placeholder="Name *" value={customerForm.name} onChange={e => setCustomerForm({...customerForm, name: e.target.value})} />
                <AddressInput className="w-full border rounded-lg p-2 text-gray-800 bg-white" placeholder="Address" value={customerForm.address} onChange={val => setCustomerForm({...customerForm, address: val})} />
                <input className="w-full border rounded-lg p-2 text-gray-800 bg-white" placeholder="Phone" value={customerForm.phone} onChange={e => setCustomerForm({...customerForm, phone: e.target.value})} />
                <input className="w-full border rounded-lg p-2 text-gray-800 bg-white" placeholder="Email" value={customerForm.email} onChange={e => setCustomerForm({...customerForm, email: e.target.value})} />

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-gray-500 text-xs block mb-1">Monthly Rate ($)</label>
                    <input type="number" className="w-full border rounded-lg p-2 text-gray-800 bg-white" placeholder="0.00" value={customerForm.monthly_rate || ''} onChange={e => setCustomerForm({...customerForm, monthly_rate: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-gray-500 text-xs block mb-1">Pool Size (gallons)</label>
                    <input type="number" className="w-full border rounded-lg p-2 text-gray-800 bg-white" placeholder="e.g. 15000" value={customerForm.pool_size_gallons || ''} onChange={e => setCustomerForm({...customerForm, pool_size_gallons: e.target.value})} />
                  </div>
                </div>

                <select className="w-full border rounded-lg p-2 text-gray-800 bg-white" value={customerForm.service_frequency || 'none'} onChange={e => setCustomerForm({...customerForm, service_frequency: e.target.value})}>
                  <option value="none">No recurring schedule</option>
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Biweekly</option>
                  <option value="monthly">Monthly</option>
                </select>

                <select className="w-full border rounded-lg p-2 text-gray-800 bg-white" value={customerForm.pool_type || ''} onChange={e => setCustomerForm({...customerForm, pool_type: e.target.value})}>
                  <option value="">Select pool type</option>
                  <option value="Gunite">Gunite</option>
                  <option value="Fiberglass">Fiberglass</option>
                  <option value="Vinyl">Vinyl</option>
                </select>

                <select className="w-full border rounded-lg p-2 text-gray-800 bg-white" value={customerForm.filter_type || ''} onChange={e => setCustomerForm({...customerForm, filter_type: e.target.value})}>
                  <option value="">Select filter type</option>
                  <option value="DE">DE Filter</option>
                  <option value="Cartridge">Cartridge Filter</option>
                  <option value="Sand">Sand Filter</option>
                </select>

                <select className="w-full border rounded-lg p-2 text-gray-800 bg-white" value={customerForm.equipment_brand || ''} onChange={e => setCustomerForm({...customerForm, equipment_brand: e.target.value})}>
                  <option value="">Select equipment brand</option>
                  <option value="Pentair">Pentair</option>
                  <option value="Jandy">Jandy</option>
                  <option value="Hayward">Hayward</option>
                  <option value="Other">Other</option>
                </select>

                <textarea className="w-full border rounded-lg p-2 text-gray-800 bg-white" placeholder="Equipment / Area Notes (trees, debris, quirks...)" value={customerForm.equipment_notes || ''} onChange={e => setCustomerForm({...customerForm, equipment_notes: e.target.value})} />
                <textarea className="w-full border rounded-lg p-2 text-gray-800 bg-white" placeholder="General Notes" value={customerForm.notes || ''} onChange={e => setCustomerForm({...customerForm, notes: e.target.value})} />

                <div>
                  <label className="text-gray-500 text-xs block mb-2">Equipment Pad Photos</label>
                  {newCustomerPhotos.length > 0 && (
                    <div className="space-y-2 mb-2">
                      {newCustomerPhotos.map((p, i) => (
                        <div key={i} className="flex gap-3 items-center border rounded-lg p-2 bg-gray-50">
                          <img src={p.preview} alt="" className="w-14 h-14 object-cover rounded-lg flex-shrink-0" />
                          <input className="flex-1 border rounded-lg p-2 text-gray-800 bg-white text-sm" placeholder="Photo name" value={p.name} onChange={e => { const updated = [...newCustomerPhotos]; updated[i].name = e.target.value; setNewCustomerPhotos(updated) }} />
                          <button onClick={() => setNewCustomerPhotos(newCustomerPhotos.filter((_, j) => j !== i))} className="text-red-400 text-xs flex-shrink-0">Remove</button>
                        </div>
                      ))}
                    </div>
                  )}
                  <input ref={newCustomerFileRef} type="file" accept="image/*" multiple className="hidden" onChange={e => { const staged = Array.from(e.target.files).map(f => ({ file: f, name: f.name.replace(/\.[^/.]+$/, ''), preview: URL.createObjectURL(f) })); setNewCustomerPhotos(prev => [...prev, ...staged]); newCustomerFileRef.current.value = '' }} />
                  <button type="button" onClick={() => newCustomerFileRef.current.click()} className="w-full border-2 border-dashed border-gray-300 rounded-lg p-2 text-gray-400 text-sm hover:border-blue-400 hover:text-blue-400 transition">+ Add Photos</button>
                </div>

                {customerError && <p className="text-red-500 text-sm bg-red-50 rounded-lg p-2">{customerError}</p>}
                <button onClick={addCustomer} disabled={newCustomerUploading} className="w-full bg-green-500 text-white py-2 rounded-lg font-semibold">{newCustomerUploading ? 'Saving...' : 'Save Customer'}</button>
              </div>
            )}
            <div className="space-y-2">
              {customers.map(c => (
                <Link href={`/customers/${c.id}`} key={c.id} className="flex justify-between items-center bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition">
                  <div>
                    <div className="font-semibold text-gray-800">{c.name}</div>
                    <div className="text-gray-500 text-sm">{c.address}</div>
                  </div>
                  <span className="text-gray-400 text-sm">{c.phone}</span>
                </Link>
              ))}
              {customers.length === 0 && <p className="text-center text-gray-400 mt-8">No customers yet</p>}
            </div>
          </div>
        )}

        {activeTab === 'jobs' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-slate-800">Jobs</h2>
              <button onClick={() => setShowJobForm(!showJobForm)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold">+ Add Job</button>
            </div>
            {showJobForm && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4 space-y-3">
                <select className="w-full border rounded-lg p-2 text-gray-800 bg-white" value={jobForm.customer_id} onChange={e => setJobForm({...jobForm, customer_id: e.target.value})}>
                  <option value="">Select Customer *</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <input type="date" className="w-full border rounded-lg p-2 text-gray-800 bg-white" value={jobForm.scheduled_date} onChange={e => setJobForm({...jobForm, scheduled_date: e.target.value})} />
                <select className="w-full border rounded-lg p-2 text-gray-800 bg-white" value={jobForm.technician} onChange={e => setJobForm({...jobForm, technician: e.target.value})}>
                  <option value="">Unassigned</option>
                  {technicians.map(t => <option key={t.id} value={t.full_name}>{t.full_name}</option>)}
                </select>
                <textarea className="w-full border rounded-lg p-2 text-gray-800 bg-white" placeholder="Notes" value={jobForm.notes} onChange={e => setJobForm({...jobForm, notes: e.target.value})} />
                <button onClick={addJob} className="w-full bg-green-500 text-white py-2 rounded-lg font-semibold">Save Job</button>
              </div>
            )}
            <div className="space-y-2">
              {jobs.map(j => (
                <Link href={`/jobs/${j.id}`} key={j.id} className="flex justify-between items-center bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition">
                  <div>
                    <div className="font-semibold text-gray-800">{j.customers?.name}</div>
                    <div className="text-gray-500 text-sm">{j.scheduled_date}{j.technician ? ` — ${j.technician}` : ''}</div>
                  </div>
                  <span className={j.status === 'complete' ? 'text-xs px-2 py-1 rounded-full bg-green-100 text-green-700' : 'text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-700'}>{j.status}</span>
                </Link>
              ))}
              {jobs.length === 0 && <p className="text-center text-gray-400 mt-8">No jobs yet</p>}
            </div>
          </div>
        )}

        {activeTab === 'route' && (
          <div>
            <h2 className="text-xl font-bold text-slate-800 mb-4">Daily Route</h2>
            <input type="date" className="w-full border rounded-xl p-3 text-gray-800 bg-white shadow-sm mb-3" value={routeDate} onChange={e => setRouteDate(e.target.value)} />
            {routeJobs.length >= 2 && (
              <button onClick={optimizeRoute} disabled={optimizing} className="w-full mb-2 bg-purple-600 text-white py-3 rounded-xl font-semibold text-sm">{optimizing ? 'Optimizing route...' : 'Optimize Route with AI'}</button>
            )}
            {optimizeError && <p className="text-red-500 text-sm text-center mb-3">{optimizeError}</p>}
            {routeJobs.length === 0 && <p className="text-center text-gray-400 mt-8">No jobs scheduled for this day</p>}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {routeJobs.map((job, index) => (
                <div key={job.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 flex items-center gap-3">
                  <div className="flex flex-col gap-0.5">
                    <button onClick={() => moveJob(index, -1)} className="text-gray-400 hover:text-blue-600 text-base leading-none">▲</button>
                    <button onClick={() => moveJob(index, 1)} className="text-gray-400 hover:text-blue-600 text-base leading-none">▼</button>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">{index + 1}</div>
                  <div className="flex-1 min-w-0">
                    <Link href={`/jobs/${job.id}`} className="font-semibold text-gray-800 hover:text-blue-600 text-sm block truncate">{job.customers?.name}</Link>
                    <div className="text-gray-500 text-xs truncate">{job.customers?.address}</div>
                    {job.technician && <div className="text-gray-400 text-xs truncate">Tech: {job.technician}</div>}
                    {routeDriveTimes[index] != null && index < routeJobs.length - 1 && (
                      <div className="mt-1 flex items-center gap-1">
                        <span className="text-blue-400 text-xs">🚗</span>
                        <span className="text-blue-600 text-xs font-medium">{routeDriveTimes[index]} min to next</span>
                      </div>
                    )}
                  </div>
                  <span className={job.status === 'complete' ? 'text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 flex-shrink-0' : 'text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 flex-shrink-0'}>{job.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'chemicals' && (
          <div>
            <h2 className="text-xl font-bold text-slate-800 mb-4">Chemical Logs</h2>
            <div className="space-y-3">
              {chemLogs.map(log => (
                <div key={log.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                  <div className="flex justify-between items-center mb-1">
                    <div className="font-semibold text-gray-800">{log.customers?.name}</div>
                    <div className="text-gray-400 text-sm">{new Date(log.created_at).toLocaleDateString()}</div>
                  </div>
                  {log.jobs?.technician && (
                    <div className="text-xs text-blue-500 mb-2">Tech: {log.jobs.technician}</div>
                  )}
                  <div className="grid grid-cols-3 gap-2 text-center mb-2">
                    <div className="bg-blue-50 rounded-lg p-2">
                      <div className="text-xs text-gray-400">Chlorine</div>
                      <div className="font-semibold text-gray-800">{log.chlorine ?? '-'}</div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-2">
                      <div className="text-xs text-gray-400">pH</div>
                      <div className="font-semibold text-gray-800">{log.ph ?? '-'}</div>
                    </div>
                    <div className="bg-yellow-50 rounded-lg p-2">
                      <div className="text-xs text-gray-400">Alkalinity</div>
                      <div className="font-semibold text-gray-800">{log.alkalinity ?? '-'}</div>
                    </div>
                  </div>
                  {log.chemical_treatments?.length > 0 && (
                    <div className="bg-blue-50 rounded-lg p-2 mb-2">
                      <div className="text-xs text-gray-400 mb-1">Chemicals Added</div>
                      {log.chemical_treatments.map(t => (
                        <div key={t.id} className="text-xs text-gray-700 flex justify-between">
                          <span>{t.product}</span>
                          {t.amount && <span className="text-gray-500">{t.amount} {t.unit}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                  {log.notes && <p className="text-gray-500 text-sm">{log.notes}</p>}
                </div>
              ))}
              {chemLogs.length === 0 && <p className="text-center text-gray-400 mt-8">No chemical logs yet</p>}
            </div>
          </div>
        )}

        {activeTab === 'invoices' && (
          <div>
            <h2 className="text-xl font-bold text-slate-800 mb-4">Invoices</h2>
            <div className="space-y-2">
              {invoices.map(inv => (
                <Link href={`/invoices/${inv.id}`} key={inv.id} className="flex justify-between items-center bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition">
                  <div>
                    <div className="font-semibold text-gray-800">{inv.customers?.name}</div>
                    <div className="text-gray-500 text-sm">Due: {inv.due_date || 'No due date'}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-gray-800">${inv.amount}</div>
                    <span className={inv.status === 'paid' ? 'text-xs px-2 py-1 rounded-full bg-green-100 text-green-700' : 'text-xs px-2 py-1 rounded-full bg-red-100 text-red-700'}>{inv.status}</span>
                  </div>
                </Link>
              ))}
              {invoices.length === 0 && <p className="text-center text-gray-400 mt-8">No invoices yet</p>}
            </div>
          </div>
        )}

        {activeTab === 'reports' && (
          <div>
            <h2 className="text-xl font-bold text-slate-800 mb-4">Chemical Reports</h2>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
              <label className="text-gray-500 text-sm block mb-2">Select Customer</label>
              <select
                className="w-full border rounded-lg p-2 text-gray-800 bg-white"
                value={selectedReportCustomer}
                onChange={e => { setSelectedReportCustomer(e.target.value); fetchReportLogs(e.target.value) }}
              >
                <option value="">Choose a customer...</option>
                {reportCustomers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            {selectedReportCustomer && reportLogs.length === 0 && (
              <p className="text-center text-gray-400 mt-8">No chemical logs for this customer yet</p>
            )}

            {reportLogs.length > 0 && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  {['chlorine', 'ph', 'alkalinity'].map(metric => {
                    const values = reportLogs.map(l => l[metric]).filter(v => v !== null)
                    const avg = values.length ? (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2) : '—'
                    const latest = reportLogs[reportLogs.length - 1]?.[metric] ?? '—'
                    const colors = { chlorine: 'blue', ph: 'green', alkalinity: 'yellow' }
                    const c = colors[metric]
                    return (
                      <div key={metric} className={`bg-${c}-50 rounded-xl p-3 text-center`}>
                        <div className="text-xs text-gray-400 capitalize mb-1">{metric}</div>
                        <div className="text-xl font-bold text-gray-800">{latest}</div>
                        <div className="text-xs text-gray-400">avg {avg}</div>
                      </div>
                    )
                  })}
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                  <h3 className="font-semibold text-gray-700 mb-3">History</h3>
                  <div className="space-y-2">
                    {[...reportLogs].reverse().map(log => (
                      <div key={log.id} className="border rounded-lg p-3">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium text-gray-700">{new Date(log.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center text-sm mb-2">
                          <div>
                            <div className="text-xs text-gray-400">Chlorine</div>
                            <div className="font-semibold text-gray-800">{log.chlorine ?? '—'}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-400">pH</div>
                            <div className="font-semibold text-gray-800">{log.ph ?? '—'}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-400">Alkalinity</div>
                            <div className="font-semibold text-gray-800">{log.alkalinity ?? '—'}</div>
                          </div>
                        </div>
                        {log.chemical_treatments?.length > 0 && (
                          <div className="bg-blue-50 rounded-lg p-2 mt-2">
                            <div className="text-xs text-gray-400 mb-1">Chemicals Added</div>
                            <div className="space-y-1">
                              {log.chemical_treatments.map(t => (
                                <div key={t.id} className="text-xs text-gray-700 flex justify-between">
                                  <span>{t.product}</span>
                                  {t.amount && <span className="text-gray-500">{t.amount} {t.unit}</span>}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {log.notes && <p className="text-gray-400 text-xs mt-2">{log.notes}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'users' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-slate-800">Manage Team</h2>
              <button onClick={() => setShowTeamForm(!showTeamForm)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold">+ Invite Member</button>
            </div>

            {teamMessage && (
              <div className={`rounded-xl p-3 mb-4 text-sm ${teamMessage.startsWith('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                {teamMessage}
              </div>
            )}

            {showTeamForm && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 mb-6">
                <h3 className="font-semibold text-slate-700 mb-4">New Team Member</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <input className="border border-slate-200 rounded-lg p-2.5 text-gray-800 bg-white text-sm" placeholder="Full Name *" value={teamForm.full_name} onChange={e => setTeamForm({ ...teamForm, full_name: e.target.value })} />
                  <input className="border border-slate-200 rounded-lg p-2.5 text-gray-800 bg-white text-sm" placeholder="Email *" type="email" value={teamForm.email} onChange={e => setTeamForm({ ...teamForm, email: e.target.value })} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <select className="border border-slate-200 rounded-lg p-2.5 text-gray-800 bg-white text-sm" value={teamForm.role} onChange={e => setTeamForm({ ...teamForm, role: e.target.value })}>
                    <option value="technician">Technician</option>
                    <option value="manager">Manager</option>
                    <option value="owner">Owner</option>
                  </select>
                  <button onClick={sendTeamInvite} disabled={teamLoading} className="bg-emerald-600 text-white py-2.5 rounded-lg font-semibold text-sm disabled:opacity-50">{teamLoading ? 'Creating...' : 'Create Account'}</button>
                </div>
                <p className="text-xs text-slate-400">A temporary password will be generated — share it with them directly so they can log in.</p>
              </div>
            )}

            {teamUsers.length === 0 && <p className="text-slate-400 text-sm text-center mt-12">No team members yet</p>}

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {teamUsers.map(u => {
                const jobStats = u.role === 'technician' ? (teamJobStats[u.full_name] || { scheduled: 0, completed: 0 }) : null
                const initials = (u.full_name || '?').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
                return (
                  <div key={u.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col gap-4">
                    {/* Header: avatar + name + remove */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-sm flex-shrink-0">{initials}</div>
                        <div>
                          <div className="font-semibold text-slate-800 leading-tight">{u.full_name}</div>
                          <div className="text-slate-400 text-xs mt-0.5 truncate max-w-[160px]">{u.email}</div>
                        </div>
                      </div>
                      {u.id !== profile?.id && (
                        <button onClick={() => removeTeamUser(u.id)} className="text-slate-300 hover:text-red-500 text-lg leading-none flex-shrink-0 hover:bg-red-50 w-7 h-7 flex items-center justify-center rounded-lg transition">✕</button>
                      )}
                    </div>

                    {/* Role selector */}
                    <select className="w-full border border-slate-200 rounded-lg p-2 text-sm text-gray-800 bg-white" value={u.role} onChange={e => updateTeamRole(u.id, e.target.value)}>
                      <option value="technician">Technician</option>
                      <option value="manager">Manager</option>
                      <option value="owner">Owner</option>
                    </select>

                    {/* Job stats for technicians */}
                    {jobStats && (
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-center">
                          <div className="text-2xl font-bold text-blue-700 leading-none">{jobStats.scheduled}</div>
                          <div className="text-xs text-blue-500 mt-1 font-medium">Scheduled</div>
                        </div>
                        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-center">
                          <div className="text-2xl font-bold text-emerald-700 leading-none">{jobStats.completed}</div>
                          <div className="text-xs text-emerald-500 mt-1 font-medium">Completed</div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

          </div>
        </main>
      </div>
    </div>
  )
}

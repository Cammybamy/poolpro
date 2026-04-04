'use client'
  import { useEffect, useState } from 'react'
  import { supabase } from '../../lib/supabase'
  import Link from 'next/link'

  export default function Jobs() {
    const [jobs, setJobs] = useState([])
    const [customers, setCustomers] = useState([])
    const [showForm, setShowForm] = useState(false)
    const [form, setForm] = useState({ customer_id: '', scheduled_date: '', technician: '', notes: '', status: 'pending'
   })

    useEffect(() => {
      fetchJobs()
      fetchCustomers()
    }, [])

    async function fetchJobs() {
      const { data } = await supabase.from('jobs').select('*, customers(name)').order('scheduled_date', { ascending:
  false })
      setJobs(data || [])
    }

    async function fetchCustomers() {
      const { data } = await supabase.from('customers').select('id, name').order('name')
      setCustomers(data || [])
    }

    async function addJob() {
      if (!form.customer_id || !form.scheduled_date) return
      await supabase.from('jobs').insert([form])
      setForm({ customer_id: '', scheduled_date: '', technician: '', notes: '', status: 'pending' })
      setShowForm(false)
      fetchJobs()
    }

    return (
      <div className="min-h-screen bg-gray-100">
        <div className="bg-blue-600 text-white p-4 flex items-center gap-3">
          <Link href="/" className="text-white text-xl">←</Link>
          <h1 className="text-xl font-bold">Jobs</h1>
        </div>

        <div className="p-4 max-w-lg mx-auto">
          <button onClick={() => setShowForm(!showForm)} className="w-full bg-blue-600 text-white py-3 rounded-xl
  font-semibold mb-4">
            + Add Job
          </button>

          {showForm && (
            <div className="bg-white rounded-xl shadow p-4 mb-4 space-y-3">
              <select className="w-full border rounded-lg p-2 text-gray-800 bg-white" value={form.customer_id} 
  onChange={e => setForm({...form, customer_id: e.target.value})}>
                <option value="">Select Customer *</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <input type="date" className="w-full border rounded-lg p-2 text-gray-800 bg-white" 
  value={form.scheduled_date} onChange={e => setForm({...form, scheduled_date: e.target.value})} />
              <input className="w-full border rounded-lg p-2 text-gray-800 bg-white" placeholder="Technician" 
  value={form.technician} onChange={e => setForm({...form, technician: e.target.value})} />
              <textarea className="w-full border rounded-lg p-2 text-gray-800 bg-white" placeholder="Notes" 
  value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
              <button onClick={addJob} className="w-full bg-green-500 text-white py-2 rounded-lg font-semibold">Save
  Job</button>
            </div>
          )}

          <div className="space-y-3">
            {jobs.map(j => (
              <Link href={`/jobs/${j.id}`} key={j.id} className="block bg-white rounded-xl shadow p-4 hover:shadow-md
  transition">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-semibold text-gray-800">{j.customers?.name}</div>
                    <div className="text-gray-500 text-sm">{j.scheduled_date}</div>
                    {j.technician && <div className="text-gray-500 text-sm">Tech: {j.technician}</div>}
                  </div>
                  <span className={j.status === 'complete' ? 'text-xs px-2 py-1 rounded-full bg-green-100 text-green-700' : 'text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-700'}>{j.status}</span>
                </div>
              </Link>
            ))}
            {jobs.length === 0 && <p className="text-center text-gray-400 mt-8">No jobs yet</p>}
          </div>
        </div>
      </div>
    )
  }
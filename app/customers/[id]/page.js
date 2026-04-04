'use client'
  import { useEffect, useState } from 'react'
  import { supabase } from '../../../lib/supabase'
  import Link from 'next/link'
  import { use } from 'react'

  export default function CustomerDetail({ params }) {
    const { id } = use(params)
    const [customer, setCustomer] = useState(null)
    const [jobs, setJobs] = useState([])
    const [editing, setEditing] = useState(false)
    const [form, setForm] = useState({})

    useEffect(() => {
      fetchCustomer()
      fetchJobs()
    }, [])

    async function fetchCustomer() {
      const { data } = await supabase.from('customers').select('*').eq('id', id).single()
      setCustomer(data)
      setForm(data)
    }

    async function fetchJobs() {
      const { data } = await supabase.from('jobs').select('*').eq('customer_id', id).order('scheduled_date', {
  ascending: false })
      setJobs(data || [])
    }

    async function saveCustomer() {
      await supabase.from('customers').update(form).eq('id', id)
      setCustomer(form)
      setEditing(false)
    }

    if (!customer) return <div className="p-6 text-gray-500">Loading...</div>

    return (
      <div className="min-h-screen bg-gray-100">
        <div className="bg-blue-600 text-white p-4 flex items-center gap-3">
          <Link href="/customers" className="text-white text-xl">←</Link>
          <h1 className="text-xl font-bold">{customer.name}</h1>
        </div>

        <div className="p-4 max-w-lg mx-auto space-y-4">
          <div className="bg-white rounded-xl shadow p-4">
            <div className="flex justify-between items-center mb-3">
              <h2 className="font-semibold text-gray-700">Customer Info</h2>
              <button onClick={() => setEditing(!editing)} className="text-blue-600 text-sm">{editing ? 'Cancel' :
  'Edit'}</button>
            </div>

            {editing ? (
              <div className="space-y-3">
                <input className="w-full border rounded-lg p-2 text-gray-800 bg-white" placeholder="Name" 
  value={form.name || ''} onChange={e => setForm({...form, name: e.target.value})} />
                <input className="w-full border rounded-lg p-2 text-gray-800 bg-white" placeholder="Address" 
  value={form.address || ''} onChange={e => setForm({...form, address: e.target.value})} />
                <input className="w-full border rounded-lg p-2 text-gray-800 bg-white" placeholder="Phone" 
  value={form.phone || ''} onChange={e => setForm({...form, phone: e.target.value})} />
                <input className="w-full border rounded-lg p-2 text-gray-800 bg-white" placeholder="Email" 
  value={form.email || ''} onChange={e => setForm({...form, email: e.target.value})} />
                <textarea className="w-full border rounded-lg p-2 text-gray-800 bg-white" placeholder="Notes" 
  value={form.notes || ''} onChange={e => setForm({...form, notes: e.target.value})} />
                <button onClick={saveCustomer} className="w-full bg-green-500 text-white py-2 rounded-lg
  font-semibold">Save</button>
              </div>
            ) : (
              <div className="space-y-1 text-gray-700">
                <p><span className="text-gray-400 text-sm">Address:</span> {customer.address}</p>
                <p><span className="text-gray-400 text-sm">Phone:</span> {customer.phone}</p>
                <p><span className="text-gray-400 text-sm">Email:</span> {customer.email}</p>
                {customer.notes && <p><span className="text-gray-400 text-sm">Notes:</span> {customer.notes}</p>}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow p-4">
            <h2 className="font-semibold text-gray-700 mb-3">Service History</h2>
            {jobs.length === 0 && <p className="text-gray-400 text-sm">No jobs yet</p>}
            <div className="space-y-2">
              {jobs.map(j => (
                <Link href={`/jobs/${j.id}`} key={j.id} className="block border rounded-lg p-3 hover:bg-gray-50">
                  <div className="flex justify-between">
                    <span className="text-gray-800 text-sm">{j.scheduled_date}</span>
                    <span className={j.status === 'complete' ? 'text-xs px-2 py-1 rounded-full bg-green-100 text-green-700' : 'text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-700'}>{j.status}</span>
                  </div>
                  {j.notes && <p className="text-gray-500 text-sm mt-1">{j.notes}</p>}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }
'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import Link from 'next/link'
import { use } from 'react'

function getNextDate(date, frequency) {
  const d = new Date(date + 'T00:00:00')
  if (frequency === 'weekly') d.setDate(d.getDate() + 7)
  else if (frequency === 'biweekly') d.setDate(d.getDate() + 14)
  else if (frequency === 'monthly') d.setMonth(d.getMonth() + 1)
  return d.toISOString().split('T')[0]
}

export default function JobDetail({ params }) {
  const { id } = use(params)
  const [job, setJob] = useState(null)
  const [customer, setCustomer] = useState(null)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({})
  const [technicians, setTechnicians] = useState([])

  useEffect(() => {
    fetchJob()
    fetchTechnicians()
  }, [])

  async function fetchJob() {
    const { data } = await supabase.from('jobs').select('*, customers(name, address, phone, service_frequency)').eq('id', id).single()
    setJob(data)
    setCustomer(data.customers)
    setForm(data)
  }

  async function fetchTechnicians() {
    const { data } = await supabase.from('profiles').select('id, full_name').eq('role', 'technician').order('full_name')
    setTechnicians(data || [])
  }

  async function saveJob() {
    await supabase.from('jobs').update({
      scheduled_date: form.scheduled_date,
      technician: form.technician,
      notes: form.notes,
      status: form.status
    }).eq('id', id)
    setJob({...job, ...form})
    setEditing(false)
  }

  async function markComplete() {
    await supabase.from('jobs').update({ status: 'complete' }).eq('id', id)
    setJob({...job, status: 'complete'})

    const frequency = customer?.service_frequency
    if (frequency && frequency !== 'none') {
      const nextDate = getNextDate(job.scheduled_date, frequency)
      await supabase.from('jobs').insert([{
        customer_id: job.customer_id,
        scheduled_date: nextDate,
        technician: job.technician,
        status: 'pending',
        notes: job.notes,
        route_order: 0
      }])
      await supabase.from('customers').update({ next_service_date: nextDate }).eq('id', job.customer_id)
    }
  }

  if (!job) return <div className="p-6 text-gray-500">Loading...</div>

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-blue-600 text-white p-4 flex items-center gap-3">
        <Link href="/" className="text-white text-xl">←</Link>
        <h1 className="text-xl font-bold">Job Details</h1>
      </div>

      <div className="p-4 max-w-lg mx-auto space-y-4">
        <div className="bg-white rounded-xl shadow p-4">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-semibold text-gray-700">Job Info</h2>
            <button onClick={() => setEditing(!editing)} className="text-blue-600 text-sm">{editing ? 'Cancel' : 'Edit'}</button>
          </div>

          {editing ? (
            <div className="space-y-3">
              <input type="date" className="w-full border rounded-lg p-2 text-gray-800 bg-white" value={form.scheduled_date || ''} onChange={e => setForm({...form, scheduled_date: e.target.value})} />
              <select className="w-full border rounded-lg p-2 text-gray-800 bg-white" value={form.technician || ''} onChange={e => setForm({...form, technician: e.target.value})}>
                <option value="">Unassigned</option>
                {technicians.map(t => <option key={t.id} value={t.full_name}>{t.full_name}</option>)}
              </select>
              <select className="w-full border rounded-lg p-2 text-gray-800 bg-white" value={form.status || 'pending'} onChange={e => setForm({...form, status: e.target.value})}>
                <option value="pending">Pending</option>
                <option value="in progress">In Progress</option>
                <option value="complete">Complete</option>
              </select>
              <textarea className="w-full border rounded-lg p-2 text-gray-800 bg-white" placeholder="Notes" value={form.notes || ''} onChange={e => setForm({...form, notes: e.target.value})} />
              <button onClick={saveJob} className="w-full bg-green-500 text-white py-2 rounded-lg font-semibold">Save</button>
            </div>
          ) : (
            <div className="space-y-1 text-gray-700">
              <p><span className="text-gray-400 text-sm">Customer:</span> {customer?.name}</p>
              <p><span className="text-gray-400 text-sm">Date:</span> {job.scheduled_date}</p>
              <p><span className="text-gray-400 text-sm">Technician:</span> {job.technician || 'Unassigned'}</p>
              <p><span className="text-gray-400 text-sm">Status:</span> {job.status}</p>
              {customer?.service_frequency && customer.service_frequency !== 'none' && (
                <p><span className="text-gray-400 text-sm">Schedule:</span> <span className="capitalize">{customer.service_frequency}</span></p>
              )}
              {job.notes && <p><span className="text-gray-400 text-sm">Notes:</span> {job.notes}</p>}
            </div>
          )}
        </div>

        {job.status !== 'complete' && (
          <button onClick={markComplete} className="w-full bg-green-500 text-white py-3 rounded-xl font-semibold">
            Mark as Complete
          </button>
        )}

        {job.status === 'complete' && customer?.service_frequency && customer.service_frequency !== 'none' && (
          <div className="bg-blue-50 text-blue-700 text-center rounded-xl p-3 text-sm">
            Next <span className="capitalize">{customer.service_frequency}</span> job auto-scheduled
          </div>
        )}

        <Link href={`/chemicals/new?job_id=${id}&customer_id=${job.customer_id}`} className="block w-full bg-blue-600 text-white py-3 rounded-xl font-semibold text-center">
          + Log Chemicals
        </Link>

        <Link href={`/invoices/new?job_id=${id}&customer_id=${job.customer_id}`} className="block w-full bg-purple-600 text-white py-3 rounded-xl font-semibold text-center">
          + Create Invoice
        </Link>
      </div>
    </div>
  )
}

'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import Link from 'next/link'
import { use } from 'react'

const CHEMICAL_PRODUCTS = [
  'Chlorine Tablets', 'Granular Chlorine', 'Liquid Chlorine', 'Shock', 'Algaecide',
  'pH Up (Sodium Carbonate)', 'pH Down (Muriatic Acid)', 'Alkalinity Up',
  'Stabilizer (Cyanuric Acid)', 'Clarifier', 'DE Powder', 'Salt', 'Other',
]
const UNITS = ['lbs', 'oz', 'gallons', 'quarts', 'tablets', 'bags', 'cups']

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
  const [showChemForm, setShowChemForm] = useState(false)
  const [readings, setReadings] = useState({ chlorine: '', ph: '', alkalinity: '', notes: '' })
  const [treatments, setTreatments] = useState([{ product: '', amount: '', unit: 'lbs' }])
  const [savedLogs, setSavedLogs] = useState([])
  const [saved, setSaved] = useState(false)
  const [aiAnalysis, setAiAnalysis] = useState('')
  const [aiLoading, setAiLoading] = useState(false)

  useEffect(() => {
    fetchJob()
    fetchTechnicians()
    fetchLogs()
  }, [])

  async function fetchJob() {
    const { data } = await supabase.from('jobs').select('*, customers(name, address, phone, service_frequency, pool_size_gallons, pool_type, filter_type)').eq('id', id).single()
    setJob(data)
    setCustomer(data.customers)
    setForm(data)
  }

  async function fetchTechnicians() {
    const { data } = await supabase.from('profiles').select('id, full_name').eq('role', 'technician').order('full_name')
    setTechnicians(data || [])
  }

  async function fetchLogs() {
    const { data } = await supabase.from('chemical_logs').select('*, chemical_treatments(*)').eq('job_id', id).order('created_at', { ascending: false })
    setSavedLogs(data || [])
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

  function addTreatment() {
    setTreatments([...treatments, { product: '', amount: '', unit: 'lbs' }])
  }

  function removeTreatment(index) {
    setTreatments(treatments.filter((_, i) => i !== index))
  }

  function updateTreatment(index, field, value) {
    const updated = [...treatments]
    updated[index][field] = value
    setTreatments(updated)
  }

  async function saveChemicals() {
    const { data: log } = await supabase.from('chemical_logs').insert([{
      job_id: id,
      customer_id: job.customer_id,
      chlorine: readings.chlorine || null,
      ph: readings.ph || null,
      alkalinity: readings.alkalinity || null,
      notes: readings.notes
    }]).select().single()

    const validTreatments = treatments.filter(t => t.product)
    if (log && validTreatments.length > 0) {
      await supabase.from('chemical_treatments').insert(
        validTreatments.map(t => ({
          log_id: log.id,
          product: t.product,
          amount: parseFloat(t.amount) || null,
          unit: t.unit
        }))
      )
    }

    setReadings({ chlorine: '', ph: '', alkalinity: '', notes: '' })
    setTreatments([{ product: '', amount: '', unit: 'lbs' }])
    setShowChemForm(false)
    setSaved(true)
    fetchLogs()
    setTimeout(() => setSaved(false), 3000)

    // AI analysis
    setAiLoading(true)
    setAiAnalysis('')
    try {
      const res = await fetch('/api/analyze-chemicals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          readings: { chlorine: readings.chlorine, ph: readings.ph, alkalinity: readings.alkalinity },
          address: customer?.address,
          history: savedLogs.slice(0, 4),
          pool: { pool_size_gallons: customer?.pool_size_gallons, pool_type: customer?.pool_type, filter_type: customer?.filter_type }
        })
      })
      const data = await res.json()
      setAiAnalysis(data.analysis)
    } catch (e) {
      setAiAnalysis('AI analysis unavailable.')
    }
    setAiLoading(false)
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

        <button onClick={() => setShowChemForm(!showChemForm)} className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold">
          {showChemForm ? 'Cancel' : '+ Log Chemicals'}
        </button>

        {showChemForm && (
          <div className="bg-white rounded-xl shadow p-4 space-y-4">
            <div>
              <h3 className="font-semibold text-gray-700 mb-2">Test Readings</h3>
              <div className="space-y-2">
                <input type="number" step="0.1" className="w-full border rounded-lg p-2 text-gray-800 bg-white" placeholder="Chlorine" value={readings.chlorine} onChange={e => setReadings({...readings, chlorine: e.target.value})} />
                <input type="number" step="0.1" className="w-full border rounded-lg p-2 text-gray-800 bg-white" placeholder="pH" value={readings.ph} onChange={e => setReadings({...readings, ph: e.target.value})} />
                <input type="number" step="1" className="w-full border rounded-lg p-2 text-gray-800 bg-white" placeholder="Alkalinity" value={readings.alkalinity} onChange={e => setReadings({...readings, alkalinity: e.target.value})} />
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-gray-700 mb-2">Chemicals Added</h3>
              <div className="space-y-3">
                {treatments.map((t, i) => (
                  <div key={i} className="border rounded-lg p-3 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-400">Chemical {i + 1}</span>
                      {treatments.length > 1 && <button onClick={() => removeTreatment(i)} className="text-red-400 text-xs">Remove</button>}
                    </div>
                    <select className="w-full border rounded-lg p-2 text-gray-800 bg-white text-sm" value={t.product} onChange={e => updateTreatment(i, 'product', e.target.value)}>
                      <option value="">Select chemical...</option>
                      {CHEMICAL_PRODUCTS.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                    <div className="grid grid-cols-2 gap-2">
                      <input type="number" step="0.1" className="w-full border rounded-lg p-2 text-gray-800 bg-white text-sm" placeholder="Amount" value={t.amount} onChange={e => updateTreatment(i, 'amount', e.target.value)} />
                      <select className="w-full border rounded-lg p-2 text-gray-800 bg-white text-sm" value={t.unit} onChange={e => updateTreatment(i, 'unit', e.target.value)}>
                        {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </div>
                  </div>
                ))}
                <button onClick={addTreatment} className="w-full border-2 border-dashed border-gray-300 rounded-lg p-2 text-gray-400 text-sm hover:border-blue-400 hover:text-blue-400 transition">+ Add Another Chemical</button>
              </div>
            </div>

            <textarea className="w-full border rounded-lg p-2 text-gray-800 bg-white" placeholder="Notes" value={readings.notes} onChange={e => setReadings({...readings, notes: e.target.value})} />
            <button onClick={saveChemicals} className="w-full bg-green-500 text-white py-2 rounded-lg font-semibold">Save Log</button>
          </div>
        )}

        {saved && (
          <div className="bg-green-50 text-green-700 text-center rounded-xl p-3 font-semibold text-sm">Chemical log saved!</div>
        )}

        {aiLoading && (
          <div className="bg-purple-50 rounded-xl p-4 text-center text-purple-500 text-sm font-medium">AI is analyzing readings...</div>
        )}

        {aiAnalysis && !aiLoading && (
          <div className="bg-white rounded-xl shadow p-4 border-l-4 border-purple-400">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-purple-600 font-bold text-sm">AI Analysis</span>
            </div>
            <div className="text-gray-700 text-sm whitespace-pre-line">{aiAnalysis}</div>
          </div>
        )}

        {savedLogs.length > 0 && (
          <div className="bg-white rounded-xl shadow p-4">
            <h3 className="font-semibold text-gray-700 mb-3">Chemical Logs</h3>
            <div className="space-y-3">
              {savedLogs.map(log => (
                <div key={log.id} className="border rounded-lg p-3">
                  <div className="text-xs text-gray-400 mb-2">{new Date(log.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</div>
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
                    <div className="bg-blue-50 rounded-lg p-2">
                      <div className="text-xs text-gray-400 mb-1">Chemicals Added</div>
                      {log.chemical_treatments.map(t => (
                        <div key={t.id} className="text-xs text-gray-700 flex justify-between">
                          <span>{t.product}</span>
                          {t.amount && <span className="text-gray-500">{t.amount} {t.unit}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                  {log.notes && <p className="text-gray-400 text-xs mt-1">{log.notes}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {job.status !== 'complete' && (
          <button onClick={markComplete} className="w-full bg-green-500 text-white py-3 rounded-xl font-semibold">Mark as Complete</button>
        )}

        {job.status === 'complete' && customer?.service_frequency && customer.service_frequency !== 'none' && (
          <div className="bg-blue-50 text-blue-700 text-center rounded-xl p-3 text-sm">
            Next <span className="capitalize">{customer.service_frequency}</span> job auto-scheduled
          </div>
        )}

        <Link href={`/invoices/new?job_id=${id}&customer_id=${job.customer_id}`} className="block w-full bg-purple-600 text-white py-3 rounded-xl font-semibold text-center">
          + Create Invoice
        </Link>
      </div>
    </div>
  )
}

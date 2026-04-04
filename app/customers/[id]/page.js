'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '../../../lib/supabase'
import Link from 'next/link'
import { use } from 'react'
import AddressInput from '../../components/AddressInput'

export default function CustomerDetail({ params }) {
  const { id } = use(params)
  const [customer, setCustomer] = useState(null)
  const [jobs, setJobs] = useState([])
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({})
  const [pendingPhotos, setPendingPhotos] = useState([])
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [lightbox, setLightbox] = useState(null)
  const fileRef = useRef()

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
    const { data } = await supabase.from('jobs').select('*').eq('customer_id', id).order('scheduled_date', { ascending: false })
    setJobs(data || [])
  }

  async function saveCustomer() {
    await supabase.from('customers').update(form).eq('id', id)
    setCustomer(form)
    setEditing(false)
  }

  function selectPhotos(e) {
    const files = Array.from(e.target.files)
    const staged = files.map(file => ({
      file,
      name: file.name.replace(/\.[^/.]+$/, ''),
      preview: URL.createObjectURL(file)
    }))
    setPendingPhotos(prev => [...prev, ...staged])
    fileRef.current.value = ''
  }

  async function uploadPending() {
    if (!pendingPhotos.length) return
    setUploading(true)
    setUploadError('')
    const results = await Promise.all(pendingPhotos.map(async pending => {
      const safeName = pending.file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const fileName = `${id}/${Date.now()}-${safeName}`
      const { error } = await supabase.storage.from('equipment-photos').upload(fileName, pending.file)
      if (error) return { error: error.message }
      const { data: urlData } = supabase.storage.from('equipment-photos').getPublicUrl(fileName)
      return { url: urlData.publicUrl, name: pending.name.trim() || 'Photo' }
    }))
    const failed = results.find(r => r.error)
    if (failed) {
      setUploadError(`Upload failed: ${failed.error}`)
      setUploading(false)
      return
    }
    const newPhotos = [...(customer.equipment_photos || []), ...results]
    await supabase.from('customers').update({ equipment_photos: newPhotos }).eq('id', id)
    setCustomer(prev => ({ ...prev, equipment_photos: newPhotos }))
    setForm(prev => ({ ...prev, equipment_photos: newPhotos }))
    setPendingPhotos([])
    setUploading(false)
  }

  async function deletePhoto(url) {
    const newPhotos = (customer.equipment_photos || []).filter(p => p.url !== url)
    await supabase.from('customers').update({ equipment_photos: newPhotos }).eq('id', id)
    setCustomer(prev => ({ ...prev, equipment_photos: newPhotos }))
    setForm(prev => ({ ...prev, equipment_photos: newPhotos }))
  }

  if (!customer) return <div className="p-6 text-gray-500">Loading...</div>

  return (
    <div className="min-h-screen bg-gray-100">
      {lightbox && (
        <div className="fixed inset-0 bg-black bg-opacity-85 flex items-center justify-center z-50 p-4" onClick={() => setLightbox(null)}>
          <div className="max-w-xl w-full" onClick={e => e.stopPropagation()}>
            <img src={lightbox.url} alt={lightbox.name} className="w-full rounded-xl object-contain max-h-96" />
            {lightbox.name && <p className="text-white text-center mt-3 font-semibold text-lg">{lightbox.name}</p>}
            <button onClick={() => setLightbox(null)} className="mt-4 w-full bg-white text-gray-800 py-2 rounded-lg font-semibold">Close</button>
          </div>
        </div>
      )}

      <div className="bg-blue-600 text-white p-4 flex items-center gap-3">
        <Link href="/" className="text-white text-xl">←</Link>
        <h1 className="text-xl font-bold">{customer.name}</h1>
      </div>

      <div className="p-4 max-w-lg mx-auto space-y-4">

        {/* Basic Info */}
        <div className="bg-white rounded-xl shadow p-4">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-semibold text-gray-700">Customer Info</h2>
            <button onClick={() => setEditing(!editing)} className="text-blue-600 text-sm">{editing ? 'Cancel' : 'Edit'}</button>
          </div>

          {editing ? (
            <div className="space-y-3">
              <input className="w-full border rounded-lg p-2 text-gray-800 bg-white" placeholder="Name" value={form.name || ''} onChange={e => setForm({...form, name: e.target.value})} />
              <AddressInput className="w-full border rounded-lg p-2 text-gray-800 bg-white" placeholder="Address" value={form.address || ''} onChange={val => setForm({...form, address: val})} />
              <input className="w-full border rounded-lg p-2 text-gray-800 bg-white" placeholder="Phone" value={form.phone || ''} onChange={e => setForm({...form, phone: e.target.value})} />
              <input className="w-full border rounded-lg p-2 text-gray-800 bg-white" placeholder="Email" value={form.email || ''} onChange={e => setForm({...form, email: e.target.value})} />

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-gray-500 text-xs block mb-1">Monthly Rate ($)</label>
                  <input type="number" className="w-full border rounded-lg p-2 text-gray-800 bg-white" placeholder="0.00" value={form.monthly_rate || ''} onChange={e => setForm({...form, monthly_rate: e.target.value})} />
                </div>
                <div>
                  <label className="text-gray-500 text-xs block mb-1">Pool Size (gallons)</label>
                  <input type="number" className="w-full border rounded-lg p-2 text-gray-800 bg-white" placeholder="e.g. 15000" value={form.pool_size_gallons || ''} onChange={e => setForm({...form, pool_size_gallons: e.target.value})} />
                </div>
              </div>

              <div>
                <label className="text-gray-500 text-xs block mb-1">Service Frequency</label>
                <select className="w-full border rounded-lg p-2 text-gray-800 bg-white" value={form.service_frequency || 'none'} onChange={e => setForm({...form, service_frequency: e.target.value})}>
                  <option value="none">No recurring schedule</option>
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Biweekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>

              <div>
                <label className="text-gray-500 text-xs block mb-1">Pool Type</label>
                <select className="w-full border rounded-lg p-2 text-gray-800 bg-white" value={form.pool_type || ''} onChange={e => setForm({...form, pool_type: e.target.value})}>
                  <option value="">Select pool type</option>
                  <option value="Gunite">Gunite</option>
                  <option value="Fiberglass">Fiberglass</option>
                  <option value="Vinyl">Vinyl</option>
                </select>
              </div>

              <div>
                <label className="text-gray-500 text-xs block mb-1">Filter Type</label>
                <select className="w-full border rounded-lg p-2 text-gray-800 bg-white" value={form.filter_type || ''} onChange={e => setForm({...form, filter_type: e.target.value})}>
                  <option value="">Select filter type</option>
                  <option value="DE">DE Filter</option>
                  <option value="Cartridge">Cartridge Filter</option>
                  <option value="Sand">Sand Filter</option>
                </select>
              </div>

              <div>
                <label className="text-gray-500 text-xs block mb-1">Equipment Brand</label>
                <select className="w-full border rounded-lg p-2 text-gray-800 bg-white" value={form.equipment_brand || ''} onChange={e => setForm({...form, equipment_brand: e.target.value})}>
                  <option value="">Select brand</option>
                  <option value="Pentair">Pentair</option>
                  <option value="Jandy">Jandy</option>
                  <option value="Hayward">Hayward</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="text-gray-500 text-xs block mb-1">Equipment Notes / Surrounding Area Notes</label>
                <textarea className="w-full border rounded-lg p-2 text-gray-800 bg-white" rows={3} placeholder="Nearby trees, debris sources, equipment quirks..." value={form.equipment_notes || ''} onChange={e => setForm({...form, equipment_notes: e.target.value})} />
              </div>

              <div>
                <label className="text-gray-500 text-xs block mb-1">General Notes</label>
                <textarea className="w-full border rounded-lg p-2 text-gray-800 bg-white" placeholder="Notes" value={form.notes || ''} onChange={e => setForm({...form, notes: e.target.value})} />
              </div>

              <button onClick={saveCustomer} className="w-full bg-green-500 text-white py-2 rounded-lg font-semibold">Save</button>
            </div>
          ) : (
            <div className="space-y-1 text-gray-700">
              <p><span className="text-gray-400 text-sm">Address:</span> {customer.address}</p>
              <p><span className="text-gray-400 text-sm">Phone:</span> {customer.phone}</p>
              <p><span className="text-gray-400 text-sm">Email:</span> {customer.email}</p>
              <p><span className="text-gray-400 text-sm">Monthly Rate:</span> ${customer.monthly_rate || 0}</p>
              <p><span className="text-gray-400 text-sm">Schedule:</span> <span className="capitalize">{customer.service_frequency === 'none' || !customer.service_frequency ? 'No recurring schedule' : customer.service_frequency}</span></p>
              {customer.next_service_date && <p><span className="text-gray-400 text-sm">Next Service:</span> {customer.next_service_date}</p>}
            </div>
          )}
        </div>

        {/* Pool Info */}
        <div className="bg-white rounded-xl shadow p-4">
          <h2 className="font-semibold text-gray-700 mb-3">Pool & Equipment</h2>
          <div className="space-y-1 text-gray-700">
            <p><span className="text-gray-400 text-sm">Pool Type:</span> {customer.pool_type || '—'}</p>
            <p><span className="text-gray-400 text-sm">Pool Size:</span> {customer.pool_size_gallons ? `${customer.pool_size_gallons.toLocaleString()} gal` : '—'}</p>
            <p><span className="text-gray-400 text-sm">Filter:</span> {customer.filter_type || '—'}</p>
            <p><span className="text-gray-400 text-sm">Brand:</span> {customer.equipment_brand || '—'}</p>
            {customer.equipment_notes && (
              <div className="mt-2 bg-yellow-50 rounded-lg p-3 text-sm text-gray-700">
                <span className="font-semibold text-gray-500 text-xs block mb-1">Equipment / Area Notes</span>
                {customer.equipment_notes}
              </div>
            )}
            {customer.notes && (
              <div className="mt-2 bg-blue-50 rounded-lg p-3 text-sm text-gray-700">
                <span className="font-semibold text-gray-500 text-xs block mb-1">General Notes</span>
                {customer.notes}
              </div>
            )}
          </div>
        </div>

        {/* Equipment Photos */}
        <div className="bg-white rounded-xl shadow p-4">
          <h2 className="font-semibold text-gray-700 mb-3">Equipment Photos</h2>

          {/* Saved photos grid */}
          {(customer.equipment_photos || []).length > 0 && (
            <div className="grid grid-cols-2 gap-2 mb-3">
              {(customer.equipment_photos || []).map((photo, i) => (
                <div key={i} className="relative cursor-pointer" onClick={() => setLightbox(photo)}>
                  <img src={photo.url} alt={photo.name} className="w-full h-32 object-cover rounded-lg" />
                  <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 rounded-b-lg px-2 py-1">
                    <span className="text-white text-xs truncate block">{photo.name}</span>
                  </div>
                  <button onClick={e => { e.stopPropagation(); deletePhoto(photo.url) }} className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 text-xs flex items-center justify-center">✕</button>
                </div>
              ))}
            </div>
          )}

          {/* Pending photos staging area */}
          {pendingPhotos.length > 0 && (
            <div className="border rounded-lg p-3 mb-3 space-y-3 bg-gray-50">
              <p className="text-xs text-gray-500 font-semibold">Name your photos before uploading</p>
              {pendingPhotos.map((p, i) => (
                <div key={i} className="flex gap-3 items-center">
                  <img src={p.preview} alt="" className="w-16 h-16 object-cover rounded-lg flex-shrink-0" />
                  <div className="flex-1">
                    <input className="w-full border rounded-lg p-2 text-gray-800 bg-white text-sm" placeholder="Photo name" value={p.name} onChange={e => { const updated = [...pendingPhotos]; updated[i].name = e.target.value; setPendingPhotos(updated) }} />
                  </div>
                  <button onClick={() => setPendingPhotos(pendingPhotos.filter((_, j) => j !== i))} className="text-red-400 text-xs flex-shrink-0">Remove</button>
                </div>
              ))}
              <button onClick={uploadPending} disabled={uploading} className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold text-sm">{uploading ? 'Uploading...' : `Upload ${pendingPhotos.length} Photo${pendingPhotos.length > 1 ? 's' : ''}`}</button>
            </div>
          )}

          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={selectPhotos} />
          <button onClick={() => fileRef.current.click()} disabled={uploading} className="w-full border-2 border-dashed border-gray-300 rounded-lg p-3 text-gray-400 text-sm hover:border-blue-400 hover:text-blue-400 transition">+ Add Photos</button>
          {uploadError && <p className="text-red-500 text-xs mt-2">{uploadError}</p>}
        </div>

        {/* Service History */}
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
                {j.technician && <p className="text-gray-400 text-xs mt-1">Tech: {j.technician}</p>}
                {j.notes && <p className="text-gray-500 text-sm mt-1">{j.notes}</p>}
              </Link>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}

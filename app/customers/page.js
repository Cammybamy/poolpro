'use client'
  import { useEffect, useState } from 'react'
  import { supabase } from '../../lib/supabase'
  import Link from 'next/link'

  export default function Customers() {
    const [customers, setCustomers] = useState([])
    const [showForm, setShowForm] = useState(false)
    const [form, setForm] = useState({ name: '', address: '', phone: '', email: '', notes: '' })

    useEffect(() => {
      fetchCustomers()
    }, [])

    async function fetchCustomers() {
      const { data } = await supabase.from('customers').select('*').order('name')
      setCustomers(data || [])
    }

    async function addCustomer() {
      if (!form.name) return
      await supabase.from('customers').insert([form])
      setForm({ name: '', address: '', phone: '', email: '', notes: '' })
      setShowForm(false)
      fetchCustomers()
    }

    return (
      <div className="min-h-screen bg-gray-100">
        <div className="bg-blue-600 text-white p-4 flex items-center gap-3">
          <Link href="/" className="text-white text-xl">←</Link>
          <h1 className="text-xl font-bold">Customers</h1>
        </div>

        <div className="p-4 max-w-lg mx-auto">
          <button
            onClick={() => setShowForm(!showForm)}
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold mb-4"
          >
            + Add Customer
          </button>

          {showForm && (
            <div className="bg-white rounded-xl shadow p-4 mb-4 space-y-3">
              <input className="w-full border rounded-lg p-2 text-gray-800 bg-white" placeholder="Name *" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
              <input className="w-full border rounded-lg p-2 text-gray-800 bg-white" placeholder="Address" value={form.address} onChange={e => setForm({...form, address: e.target.value})} />
              <input className="w-full border rounded-lg p-2 text-gray-800 bg-white" placeholder="Phone" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
              <input className="w-full border rounded-lg p-2 text-gray-800 bg-white" placeholder="Email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
              <textarea className="w-full border rounded-lg p-2 text-gray-800 bg-white" placeholder="Notes" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
              <button onClick={addCustomer} className="w-full bg-green-500 text-white py-2 rounded-lg
  font-semibold">Save Customer</button>
            </div>
          )}

          <div className="space-y-3">
            {customers.map(c => (
              <Link href={`/customers/${c.id}`} key={c.id} className="block bg-white rounded-xl shadow p-4
  hover:shadow-md transition">
                <div className="font-semibold text-gray-800">{c.name}</div>
                <div className="text-gray-500 text-sm">{c.address}</div>
                <div className="text-gray-500 text-sm">{c.phone}</div>
              </Link>
            ))}
            {customers.length === 0 && <p className="text-center text-gray-400 mt-8">No customers yet</p>}
          </div>
        </div>
      </div>
    )
  }
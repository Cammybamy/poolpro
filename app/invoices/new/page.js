'use client'
  import { useState } from 'react'
  import { supabase } from '../../../lib/supabase'
  import { useRouter, useSearchParams } from 'next/navigation'
  import Link from 'next/link'
  import { Suspense } from 'react'

  function InvoiceForm() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const job_id = searchParams.get('job_id')
    const customer_id = searchParams.get('customer_id')
    const [form, setForm] = useState({ amount: '', due_date: '', status: 'unpaid' })

    async function saveInvoice() {
      if (!form.amount) return
      await supabase.from('invoices').insert([{
        job_id,
        customer_id,
        amount: form.amount,
        due_date: form.due_date || null,
        status: form.status
      }])
      router.push(`/jobs/${job_id}`)
    }

    return (
      <div className="min-h-screen bg-gray-100">
        <div className="bg-blue-600 text-white p-4 flex items-center gap-3">
          <Link href={`/jobs/${job_id}`} className="text-white text-xl">←</Link>
          <h1 className="text-xl font-bold">Create Invoice</h1>
        </div>

        <div className="p-4 max-w-lg mx-auto">
          <div className="bg-white rounded-xl shadow p-4 space-y-3">
            <input type="number" step="0.01" className="w-full border rounded-lg p-2 text-gray-800 bg-white" 
  placeholder="Amount ($) *" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} />
            <input type="date" className="w-full border rounded-lg p-2 text-gray-800 bg-white" value={form.due_date} 
  onChange={e => setForm({...form, due_date: e.target.value})} />
            <select className="w-full border rounded-lg p-2 text-gray-800 bg-white" value={form.status} onChange={e =>
  setForm({...form, status: e.target.value})}>
              <option value="unpaid">Unpaid</option>
              <option value="paid">Paid</option>
            </select>
            <button onClick={saveInvoice} className="w-full bg-green-500 text-white py-2 rounded-lg font-semibold">Save
  Invoice</button>
          </div>
        </div>
      </div>
    )
  }

  export default function NewInvoice() {
    return (
      <Suspense>
        <InvoiceForm />
      </Suspense>
    )
  }
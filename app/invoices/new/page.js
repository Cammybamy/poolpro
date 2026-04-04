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
  const [items, setItems] = useState([{ description: 'Monthly Service', quantity: 1, unit_price: '' }])
  const [due_date, setDueDate] = useState('')
  const [notes, setNotes] = useState('')

  const total = items.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0), 0)

  function addItem() {
    setItems([...items, { description: '', quantity: 1, unit_price: '' }])
  }

  function removeItem(index) {
    setItems(items.filter((_, i) => i !== index))
  }

  function updateItem(index, field, value) {
    const updated = [...items]
    updated[index][field] = value
    setItems(updated)
  }

  async function saveInvoice() {
    if (items.length === 0 || total === 0) return

    const { data: invoice } = await supabase.from('invoices').insert([{
      job_id,
      customer_id,
      amount: total,
      amount_paid: 0,
      due_date: due_date || null,
      notes: notes || null,
      status: 'unpaid'
    }]).select().single()

    if (invoice) {
      await supabase.from('invoice_items').insert(
        items.map(item => ({
          invoice_id: invoice.id,
          description: item.description,
          quantity: parseFloat(item.quantity) || 1,
          unit_price: parseFloat(item.unit_price) || 0
        }))
      )
    }

    router.push(`/invoices/${invoice.id}`)
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-blue-600 text-white p-4 flex items-center gap-3">
        <Link href={job_id ? `/jobs/${job_id}` : '/'} className="text-white text-xl">←</Link>
        <h1 className="text-xl font-bold">Create Invoice</h1>
      </div>

      <div className="p-4 max-w-lg mx-auto space-y-4">
        <div className="bg-white rounded-xl shadow p-4 space-y-3">
          <h2 className="font-semibold text-gray-700">Line Items</h2>
          {items.map((item, i) => (
            <div key={i} className="border rounded-lg p-3 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Item {i + 1}</span>
                {items.length > 1 && <button onClick={() => removeItem(i)} className="text-red-400 text-sm">Remove</button>}
              </div>
              <input className="w-full border rounded-lg p-2 text-gray-800 bg-white text-sm" placeholder="Description *" value={item.description} onChange={e => updateItem(i, 'description', e.target.value)} />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-gray-400 text-xs block mb-1">Qty</label>
                  <input type="number" className="w-full border rounded-lg p-2 text-gray-800 bg-white text-sm" value={item.quantity} onChange={e => updateItem(i, 'quantity', e.target.value)} />
                </div>
                <div>
                  <label className="text-gray-400 text-xs block mb-1">Unit Price ($)</label>
                  <input type="number" step="0.01" className="w-full border rounded-lg p-2 text-gray-800 bg-white text-sm" placeholder="0.00" value={item.unit_price} onChange={e => updateItem(i, 'unit_price', e.target.value)} />
                </div>
              </div>
              <div className="text-right text-sm text-gray-500">
                Subtotal: ${((parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0)).toFixed(2)}
              </div>
            </div>
          ))}

          <button onClick={addItem} className="w-full border-2 border-dashed border-gray-300 rounded-lg p-2 text-gray-400 text-sm hover:border-blue-400 hover:text-blue-400 transition">
            + Add Line Item
          </button>

          <div className="flex justify-between items-center pt-2 border-t">
            <span className="font-semibold text-gray-700">Total</span>
            <span className="text-xl font-bold text-gray-800">${total.toFixed(2)}</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-4 space-y-3">
          <h2 className="font-semibold text-gray-700">Details</h2>
          <div>
            <label className="text-gray-400 text-xs block mb-1">Due Date</label>
            <input type="date" className="w-full border rounded-lg p-2 text-gray-800 bg-white" value={due_date} onChange={e => setDueDate(e.target.value)} />
          </div>
          <div>
            <label className="text-gray-400 text-xs block mb-1">Notes</label>
            <textarea className="w-full border rounded-lg p-2 text-gray-800 bg-white" placeholder="Any notes for the customer..." value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
        </div>

        <button onClick={saveInvoice} className="w-full bg-green-500 text-white py-3 rounded-xl font-semibold">
          Save Invoice — ${total.toFixed(2)}
        </button>
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

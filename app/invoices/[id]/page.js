 'use client'
  import { useEffect, useState } from 'react'
  import { supabase } from '../../../lib/supabase'
  import Link from 'next/link'
  import { use } from 'react'

  export default function InvoiceDetail({ params }) {
    const { id } = use(params)
    const [invoice, setInvoice] = useState(null)

    useEffect(() => {
      fetchInvoice()
    }, [])

    async function fetchInvoice() {
      const { data } = await supabase.from('invoices').select('*, customers(name), jobs(scheduled_date)').eq('id',
  id).single()
      setInvoice(data)
    }

    async function markPaid() {
      await supabase.from('invoices').update({ status: 'paid' }).eq('id', id)
      setInvoice({...invoice, status: 'paid'})
    }

    if (!invoice) return <div className="p-6 text-gray-500">Loading...</div>

    return (
      <div className="min-h-screen bg-gray-100">
        <div className="bg-blue-600 text-white p-4 flex items-center gap-3">
          <Link href="/invoices" className="text-white text-xl">←</Link>
          <h1 className="text-xl font-bold">Invoice</h1>
        </div>

        <div className="p-4 max-w-lg mx-auto space-y-4">
          <div className="bg-white rounded-xl shadow p-4 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-sm">Customer</span>
              <span className="font-semibold text-gray-800">{invoice.customers?.name}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-sm">Service Date</span>
              <span className="text-gray-800">{invoice.jobs?.scheduled_date}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-sm">Amount</span>
              <span className="text-xl font-bold text-gray-800">${invoice.amount}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-sm">Due Date</span>
              <span className="text-gray-800">{invoice.due_date}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-sm">Status</span>
              <span className={invoice.status === 'paid' ? 'text-xs px-2 py-1 rounded-full bg-green-100 text-green-700'
  : 'text-xs px-2 py-1 rounded-full bg-red-100 text-red-700'}>{invoice.status}</span>
            </div>
          </div>

          {invoice.status !== 'paid' && (
            <button onClick={markPaid} className="w-full bg-green-500 text-white py-3 rounded-xl font-semibold">
              Mark as Paid
            </button>
          )}
        </div>
      </div>
    )
  }
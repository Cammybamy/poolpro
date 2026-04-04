'use client'
  import { useEffect, useState } from 'react'
  import { supabase } from '../../lib/supabase'
  import Link from 'next/link'

  export default function Invoices() {
    const [invoices, setInvoices] = useState([])

    useEffect(() => {
      fetchInvoices()
    }, [])

    async function fetchInvoices() {
      const { data } = await supabase
        .from('invoices')
        .select('*, customers(name)')
        .order('created_at', { ascending: false })
      setInvoices(data || [])
    }

    return (
      <div className="min-h-screen bg-gray-100">
        <div className="bg-blue-600 text-white p-4 flex items-center gap-3">
          <Link href="/" className="text-white text-xl">←</Link>
          <h1 className="text-xl font-bold">Invoices</h1>
        </div>

        <div className="p-4 max-w-lg mx-auto">
          <div className="space-y-3">
            {invoices.map(inv => (
              <Link href={`/invoices/${inv.id}`} key={inv.id} className="block bg-white rounded-xl shadow p-4
  hover:shadow-md transition">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-semibold text-gray-800">{inv.customers?.name}</div>
                    <div className="text-gray-500 text-sm">Due: {inv.due_date}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-gray-800">${inv.amount}</div>
                    <span className={inv.status === 'paid' ? 'text-xs px-2 py-1 rounded-full bg-green-100 text-green-700' : 'text-xs px-2 py-1 rounded-full bg-red-100 text-red-700'}>{inv.status}</span>
                  </div>
                </div>
              </Link>
            ))}
            {invoices.length === 0 && <p className="text-center text-gray-400 mt-8">No invoices yet</p>}
          </div>
        </div>
      </div>
    )
  }
'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import Link from 'next/link'
import { use } from 'react'

export default function InvoiceDetail({ params }) {
  const { id } = use(params)
  const [invoice, setInvoice] = useState(null)
  const [items, setItems] = useState([])
  const [paymentAmount, setPaymentAmount] = useState('')
  const [showPayment, setShowPayment] = useState(false)

  useEffect(() => {
    fetchInvoice()
    fetchItems()
  }, [])

  async function fetchInvoice() {
    const { data } = await supabase.from('invoices').select('*, customers(name, email), jobs(scheduled_date)').eq('id', id).single()
    setInvoice(data)
  }

  async function fetchItems() {
    const { data } = await supabase.from('invoice_items').select('*').eq('invoice_id', id).order('created_at')
    setItems(data || [])
  }

  async function markPaid() {
    await supabase.from('invoices').update({ status: 'paid', amount_paid: invoice.amount }).eq('id', id)
    setInvoice({...invoice, status: 'paid', amount_paid: invoice.amount})
  }

  async function recordPayment() {
    const paid = parseFloat(paymentAmount)
    if (!paid) return
    const newPaid = (parseFloat(invoice.amount_paid) || 0) + paid
    const newStatus = newPaid >= parseFloat(invoice.amount) ? 'paid' : 'partial'
    await supabase.from('invoices').update({ amount_paid: newPaid, status: newStatus }).eq('id', id)
    setInvoice({...invoice, amount_paid: newPaid, status: newStatus})
    setPaymentAmount('')
    setShowPayment(false)
  }

  if (!invoice) return <div className="p-6 text-gray-500">Loading...</div>

  const outstanding = parseFloat(invoice.amount) - (parseFloat(invoice.amount_paid) || 0)

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-blue-600 text-white p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-white text-xl">←</Link>
          <h1 className="text-xl font-bold">Invoice</h1>
        </div>
        <button onClick={() => window.print()} className="text-blue-200 text-sm hover:text-white">Print / PDF</button>
      </div>

      <div className="p-4 max-w-lg mx-auto space-y-4">

        {/* Invoice Header */}
        <div className="bg-white rounded-xl shadow p-4">
          <div className="flex justify-between items-start mb-4">
            <div>
              <div className="font-bold text-lg text-gray-800">{invoice.customers?.name}</div>
              {invoice.customers?.email && <div className="text-gray-400 text-sm">{invoice.customers.email}</div>}
              <div className="text-gray-400 text-sm">Service: {invoice.jobs?.scheduled_date}</div>
            </div>
            <span className={
              invoice.status === 'paid' ? 'px-3 py-1 rounded-full bg-green-100 text-green-700 text-sm font-medium' :
              invoice.status === 'partial' ? 'px-3 py-1 rounded-full bg-yellow-100 text-yellow-700 text-sm font-medium' :
              'px-3 py-1 rounded-full bg-red-100 text-red-700 text-sm font-medium'
            }>{invoice.status}</span>
          </div>

          {invoice.due_date && (
            <div className="text-gray-500 text-sm mb-2">Due: {invoice.due_date}</div>
          )}

          {/* Line Items */}
          {items.length > 0 && (
            <div className="border-t pt-3 mt-3">
              <div className="space-y-2 mb-3">
                {items.map(item => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <div>
                      <span className="text-gray-800">{item.description}</span>
                      {item.quantity !== 1 && <span className="text-gray-400 ml-1">× {item.quantity}</span>}
                    </div>
                    <span className="text-gray-800">${(item.quantity * item.unit_price).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t pt-2 flex justify-between font-semibold">
                <span className="text-gray-700">Total</span>
                <span className="text-gray-800">${parseFloat(invoice.amount).toFixed(2)}</span>
              </div>
            </div>
          )}

          {items.length === 0 && (
            <div className="flex justify-between font-semibold border-t pt-3 mt-3">
              <span className="text-gray-700">Amount</span>
              <span className="text-gray-800">${parseFloat(invoice.amount).toFixed(2)}</span>
            </div>
          )}

          {/* Payment Summary */}
          {(parseFloat(invoice.amount_paid) > 0) && (
            <div className="border-t pt-2 mt-2 space-y-1">
              <div className="flex justify-between text-sm text-gray-500">
                <span>Paid</span>
                <span className="text-green-600">${parseFloat(invoice.amount_paid).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm font-semibold">
                <span className="text-gray-700">Outstanding</span>
                <span className="text-red-600">${outstanding.toFixed(2)}</span>
              </div>
            </div>
          )}

          {invoice.notes && (
            <div className="mt-3 bg-gray-50 rounded-lg p-3 text-sm text-gray-600">{invoice.notes}</div>
          )}
        </div>

        {/* Actions */}
        {invoice.status !== 'paid' && (
          <>
            <button onClick={markPaid} className="w-full bg-green-500 text-white py-3 rounded-xl font-semibold">
              Mark as Fully Paid
            </button>

            <button onClick={() => setShowPayment(!showPayment)} className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold">
              Record Partial Payment
            </button>

            {showPayment && (
              <div className="bg-white rounded-xl shadow p-4 space-y-3">
                <label className="text-gray-500 text-sm block">Payment Amount ($)</label>
                <input type="number" step="0.01" className="w-full border rounded-lg p-2 text-gray-800 bg-white" placeholder="0.00" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} />
                <button onClick={recordPayment} className="w-full bg-green-500 text-white py-2 rounded-lg font-semibold">Save Payment</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

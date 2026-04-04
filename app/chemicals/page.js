'use client'
  import { useEffect, useState } from 'react'
  import { supabase } from '../../lib/supabase'
  import Link from 'next/link'

  export default function Chemicals() {
    const [logs, setLogs] = useState([])

    useEffect(() => {
      fetchLogs()
    }, [])

    async function fetchLogs() {
      const { data } = await supabase
        .from('chemical_logs')
        .select('*, customers(name)')
        .order('created_at', { ascending: false })
      setLogs(data || [])
    }

    return (
      <div className="min-h-screen bg-gray-100">
        <div className="bg-blue-600 text-white p-4 flex items-center gap-3">
          <Link href="/" className="text-white text-xl">←</Link>
          <h1 className="text-xl font-bold">Chemical Logs</h1>
        </div>

        <div className="p-4 max-w-lg mx-auto">
          <div className="space-y-3">
            {logs.map(log => (
              <div key={log.id} className="bg-white rounded-xl shadow p-4">
                <div className="flex justify-between items-center mb-2">
                  <div className="font-semibold text-gray-800">{log.customers?.name}</div>
                  <div className="text-gray-400 text-sm">{new Date(log.created_at).toLocaleDateString()}</div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-blue-50 rounded-lg p-2">
                    <div className="text-xs text-gray-400">Chlorine</div>
                    <div className="font-semibold text-gray-800">{log.chlorine ?? '-'}</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-2">
                    <div className="text-xs text-gray-400">pH</div>
                    <div className="font-semibold text-gray-800">{log.ph ?? '-'}</div>
                  </div>
                  <div className="bg-yellow-50 rounded-lg p-2">
                    <div className="text-xs text-gray-400">Alkalinity</div>
                    <div className="font-semibold text-gray-800">{log.alkalinity ?? '-'}</div>
                  </div>
                </div>
                {log.notes && <p className="text-gray-500 text-sm mt-2">{log.notes}</p>}
              </div>
            ))}
            {logs.length === 0 && <p className="text-center text-gray-400 mt-8">No chemical logs yet</p>}
          </div>
        </div>
      </div>
    )
  }
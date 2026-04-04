'use client'
  import { useEffect, useState } from 'react'
  import { supabase } from '../../lib/supabase'
  import Link from 'next/link'

  export default function Route() {
    const [jobs, setJobs] = useState([])
    const [date, setDate] = useState(new Date().toISOString().split('T')[0])

    useEffect(() => {
      fetchJobs()
    }, [date])

    async function fetchJobs() {
      const { data } = await supabase
        .from('jobs')
        .select('*, customers(name, address)')
        .eq('scheduled_date', date)
        .order('route_order', { ascending: true })
      setJobs(data || [])
    }

    async function moveJob(index, direction) {
      const newJobs = [...jobs]
      const swapIndex = index + direction
      if (swapIndex < 0 || swapIndex >= newJobs.length) return

      const temp = newJobs[index]
      newJobs[index] = newJobs[swapIndex]
      newJobs[swapIndex] = temp

      const updates = newJobs.map((job, i) =>
        supabase.from('jobs').update({ route_order: i }).eq('id', job.id)
      )
      await Promise.all(updates)
      setJobs(newJobs)
    }

    return (
      <div className="min-h-screen bg-gray-100">
        <div className="bg-blue-600 text-white p-4 flex items-center gap-3">
          <Link href="/" className="text-white text-xl">←</Link>
          <h1 className="text-xl font-bold">Daily Route</h1>
        </div>

        <div className="p-4 max-w-lg mx-auto">
          <input
            type="date"
            className="w-full border rounded-xl p-3 text-gray-800 bg-white shadow mb-4"
            value={date}
            onChange={e => setDate(e.target.value)}
          />

          {jobs.length === 0 && (
            <p className="text-center text-gray-400 mt-8">No jobs scheduled for this day</p>
          )}

          <div className="space-y-3">
            {jobs.map((job, index) => (
              <div key={job.id} className="bg-white rounded-xl shadow p-4 flex items-center gap-3">
                <div className="flex flex-col gap-1">
                  <button onClick={() => moveJob(index, -1)} className="text-gray-400 hover:text-blue-600 text-lg
  leading-none">▲</button>
                  <button onClick={() => moveJob(index, 1)} className="text-gray-400 hover:text-blue-600 text-lg
  leading-none">▼</button>
                </div>

                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold
  text-sm flex-shrink-0">
                  {index + 1}
                </div>

                <div className="flex-1">
                  <Link href={`/jobs/${job.id}`} className="font-semibold text-gray-800 hover:text-blue-600">
                    {job.customers?.name}
                  </Link>
                  <div className="text-gray-500 text-sm">{job.customers?.address}</div>
                  {job.technician && <div className="text-gray-400 text-xs">Tech: {job.technician}</div>}
                </div>

                <span className={job.status === 'complete' ? 'text-xs px-2 py-1 rounded-full bg-green-100 text-green-700'
  : 'text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-700'}>
                  {job.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }
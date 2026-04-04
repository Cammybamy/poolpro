'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { getProfile } from '../../lib/profile'
import Link from 'next/link'

export default function MyJobs() {
  const [jobs, setJobs] = useState([])
  const [profile, setProfile] = useState(null)

  useEffect(() => {
    loadJobs()
  }, [])

  async function loadJobs() {
    const p = await getProfile()
    setProfile(p)

    const { data } = await supabase
      .from('jobs')
      .select('*, customers(name, address, phone)')
      .eq('technician', p.full_name)
      .neq('status', 'complete')
      .order('scheduled_date', { ascending: true })
    setJobs(data || [])
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-blue-600 text-white p-4 flex items-center gap-3">
        <Link href="/" className="text-white text-xl">←</Link>
        <h1 className="text-xl font-bold">My Jobs</h1>
      </div>

      <div className="p-4 max-w-lg mx-auto">
        <div className="space-y-3">
          {jobs.map(job => (
            <Link href={`/my-jobs/${job.id}`} key={job.id} className="block bg-white rounded-xl shadow p-4 hover:shadow-md transition">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-semibold text-gray-800">{job.customers?.name}</div>
                  <div className="text-gray-500 text-sm">{job.customers?.address}</div>
                  <div className="text-gray-500 text-sm">{job.customers?.phone}</div>
                  <div className="text-gray-400 text-xs mt-1">{job.scheduled_date}</div>
                </div>
                <span className={job.status === 'complete' ? 'text-xs px-2 py-1 rounded-full bg-green-100 text-green-700' : 'text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-700'}>{job.status}</span>
              </div>
              {job.notes && <p className="text-gray-500 text-sm mt-2">{job.notes}</p>}
            </Link>
          ))}
          {jobs.length === 0 && <p className="text-center text-gray-400 mt-8">No jobs assigned</p>}
        </div>
      </div>
    </div>
  )
}

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
              <Link href={`/my-jobs/${job.id}`} key={job.id} className="block bg-white rounded-xl shadow p-4
  hover:shadow-md transition">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-semibold text-gray-800">{job.customers?.name}</div>
                    <div className="text-gray-500 text-sm">{job.customers?.address}</div>
                    <div className="text-gray-500 text-sm">{job.customers?.phone}</div>
                    <div className="text-gray-400 text-xs mt-1">{job.scheduled_date}</div>
                  </div>
                  <span className={job.status === 'complete' ? 'text-xs px-2 py-1 rounded-full bg-green-100 
  text-green-700' : 'text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-700'}>{job.status}</span>
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

  Then create app/my-jobs/[id]/page.js for the tech's job detail view:

  'use client'
  import { useEffect, useState } from 'react'
  import { supabase } from '../../../lib/supabase'
  import Link from 'next/link'
  import { use } from 'react'

  export default function TechJobDetail({ params }) {
    const { id } = use(params)
    const [job, setJob] = useState(null)
    const [showChemForm, setShowChemForm] = useState(false)
    const [chem, setChem] = useState({ chlorine: '', ph: '', alkalinity: '', notes: '' })

    useEffect(() => {
      fetchJob()
    }, [])

    async function fetchJob() {
      const { data } = await supabase
        .from('jobs')
        .select('*, customers(name, address, phone, notes)')
        .eq('id', id)
        .single()
      setJob(data)
    }

    async function markComplete() {
      await supabase.from('jobs').update({ status: 'complete' }).eq('id', id)
      setJob({...job, status: 'complete'})
    }

    async function saveChemicals() {
      await supabase.from('chemical_logs').insert([{
        job_id: id,
        customer_id: job.customer_id,
        chlorine: chem.chlorine || null,
        ph: chem.ph || null,
        alkalinity: chem.alkalinity || null,
        notes: chem.notes
      }])
      setChem({ chlorine: '', ph: '', alkalinity: '', notes: '' })
      setShowChemForm(false)
    }

    if (!job) return <div className="p-6 text-gray-400">Loading...</div>

    return (
      <div className="min-h-screen bg-gray-100">
        <div className="bg-blue-600 text-white p-4 flex items-center gap-3">
          <Link href="/my-jobs" className="text-white text-xl">←</Link>
          <h1 className="text-xl font-bold">Job Detail</h1>
        </div>

        <div className="p-4 max-w-lg mx-auto space-y-4">
          <div className="bg-white rounded-xl shadow p-4 space-y-2">
            <div className="font-bold text-lg text-gray-800">{job.customers?.name}</div>
            <div className="text-gray-600">{job.customers?.address}</div>
            <div className="text-gray-600">{job.customers?.phone}</div>
            <div className="text-gray-400 text-sm">Date: {job.scheduled_date}</div>
            {job.customers?.notes && (
              <div className="bg-yellow-50 rounded-lg p-3 text-sm text-gray-700 mt-2">
                <span className="font-semibold">Site Notes: </span>{job.customers.notes}
              </div>
            )}
            {job.notes && (
              <div className="bg-blue-50 rounded-lg p-3 text-sm text-gray-700">
                <span className="font-semibold">Job Notes: </span>{job.notes}
              </div>
            )}
          </div>

          <button
            onClick={() => setShowChemForm(!showChemForm)}
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold"
          >
            + Log Chemicals
          </button>

          {showChemForm && (
            <div className="bg-white rounded-xl shadow p-4 space-y-3">
              <input type="number" step="0.1" className="w-full border rounded-lg p-2 text-gray-800 bg-white" 
  placeholder="Chlorine" value={chem.chlorine} onChange={e => setChem({...chem, chlorine: e.target.value})} />
              <input type="number" step="0.1" className="w-full border rounded-lg p-2 text-gray-800 bg-white" 
  placeholder="pH" value={chem.ph} onChange={e => setChem({...chem, ph: e.target.value})} />
              <input type="number" step="1" className="w-full border rounded-lg p-2 text-gray-800 bg-white" 
  placeholder="Alkalinity" value={chem.alkalinity} onChange={e => setChem({...chem, alkalinity: e.target.value})} />
              <textarea className="w-full border rounded-lg p-2 text-gray-800 bg-white" placeholder="Notes" 
  value={chem.notes} onChange={e => setChem({...chem, notes: e.target.value})} />
              <button onClick={saveChemicals} className="w-full bg-green-500 text-white py-2 rounded-lg
  font-semibold">Save</button>
            </div>
          )}

          {job.status !== 'complete' && (
            <button onClick={markComplete} className="w-full bg-green-500 text-white py-3 rounded-xl font-semibold">
              Mark as Complete
            </button>
          )}

          {job.status === 'complete' && (
            <div className="bg-green-50 text-green-700 text-center rounded-xl p-4 font-semibold">
              Job Complete
            </div>
          )}
        </div>
      </div>
    )
  }
'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function Landing() {
  const [form, setForm] = useState({ name: '', email: '', company: '', phone: '', pools: '' })
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [inviteError, setInviteError] = useState('')

  useEffect(() => {
    // Detect Supabase error redirected to landing (e.g. expired invite link)
    const hash = window.location.hash
    if (hash.includes('error=')) {
      const params = new URLSearchParams(hash.replace('#', ''))
      const desc = params.get('error_description')
      if (desc?.includes('expired') || desc?.includes('invalid')) {
        setInviteError('Your invite link has expired. Contact your admin to send a new one.')
      }
    }
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name || !form.email) { setError('Name and email are required'); return }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/submit-interest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      const result = await res.json()
      if (result.error) { setError(result.error); setLoading(false); return }
      setSubmitted(true)
    } catch (e) {
      setError('Something went wrong. Please try again.')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-white">

      {inviteError && (
        <div className="bg-red-600 text-white px-6 py-4 text-center">
          <p className="font-semibold">{inviteError}</p>
          <p className="text-sm text-red-200 mt-1">Already have an account? <Link href="/login" className="underline text-white">Log in here</Link></p>
        </div>
      )}

      {/* Nav */}
      <nav className="border-b border-gray-100 px-6 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🏊</span>
          <span className="text-xl font-bold text-blue-600">Pool Pilot</span>
        </div>
        <Link href="/login" className="bg-blue-600 text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700 transition">
          Log In
        </Link>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-block bg-blue-50 text-blue-600 text-sm font-semibold px-4 py-1.5 rounded-full mb-6">
          Built for pool service professionals
        </div>
        <h1 className="text-5xl font-bold text-gray-900 leading-tight mb-6">
          Run your pool route<br className="hidden md:block" /> smarter, not harder.
        </h1>
        <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-10">
          Pool Pilot gives your team everything they need — optimized routes, chemical logs, customer records, invoices, and AI-powered insights — all in one place.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a href="#interest" className="bg-blue-600 text-white px-8 py-3 rounded-xl text-base font-semibold hover:bg-blue-700 transition">
            Request Access
          </a>
          <Link href="/login" className="border border-gray-200 text-gray-700 px-8 py-3 rounded-xl text-base font-semibold hover:border-gray-300 transition">
            Log In
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="bg-gray-50 py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-4">Everything your team needs</h2>
          <p className="text-gray-500 text-center mb-12 max-w-xl mx-auto">From the office to the field, Pool Pilot keeps your whole operation in sync.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: '🗺️',
                title: 'Smart Route Optimization',
                desc: 'AI-powered routing uses real drive times to build the most efficient route for each tech, starting from their current location.'
              },
              {
                icon: '🧪',
                title: 'Chemical Logging + AI Analysis',
                desc: 'Log chlorine, pH, alkalinity and more. Get instant AI analysis with recommendations based on readings, pool history, and local weather.'
              },
              {
                icon: '👥',
                title: 'Customer Management',
                desc: 'Full customer profiles with service history, equipment photos, pool specs, and address autocomplete built in.'
              },
              {
                icon: '🧾',
                title: 'Invoicing',
                desc: 'Create and track invoices per customer. See outstanding balances at a glance on the dashboard.'
              },
              {
                icon: '📅',
                title: 'Job Scheduling',
                desc: 'Schedule and assign jobs to techs. View the week or month on a calendar with job counts per day.'
              },
              {
                icon: '🌤️',
                title: 'Weather Forecast',
                desc: '7-day weather on the office dashboard so you can plan routes and anticipate chemical demand ahead of time.'
              },
            ].map((f, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="text-3xl mb-3">{f.icon}</div>
                <h3 className="font-bold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who it's for */}
      <section className="py-20 px-6 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Built for the whole team</h2>
            <div className="space-y-5">
              {[
                { role: 'Office / Owner', desc: 'Full dashboard with revenue forecasts, calendar, job management, and route planning for the whole crew.' },
                { role: 'Technicians', desc: 'Clean mobile view with their daily jobs, turn-by-turn route, and quick chemical logging right from the field.' },
                { role: 'Managers', desc: 'Oversee jobs and team members, manage customer accounts, and track route efficiency.' },
              ].map((r, i) => (
                <div key={i} className="flex gap-4">
                  <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0"></div>
                  <div>
                    <div className="font-semibold text-gray-900">{r.role}</div>
                    <div className="text-gray-500 text-sm mt-0.5">{r.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-3xl p-8 text-center">
            <div className="text-6xl mb-4">🏊</div>
            <div className="text-4xl font-bold text-blue-700 mb-1">Save hours</div>
            <div className="text-gray-500">every single week</div>
            <div className="mt-6 grid grid-cols-2 gap-4 text-left">
              {[
                { stat: 'Route', detail: 'Optimized daily' },
                { stat: 'Logs', detail: 'Stored & searchable' },
                { stat: 'AI', detail: 'Chemical analysis' },
                { stat: 'Team', detail: 'All roles covered' },
              ].map((s, i) => (
                <div key={i} className="bg-white rounded-xl p-3">
                  <div className="font-bold text-blue-600">{s.stat}</div>
                  <div className="text-gray-500 text-xs">{s.detail}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Interest Form */}
      <section id="interest" className="bg-blue-600 py-20 px-6">
        <div className="max-w-xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-white mb-3">Request Access</h2>
            <p className="text-blue-200">We review every request personally. Fill out the form and we'll be in touch.</p>
          </div>

          {submitted ? (
            <div className="bg-white rounded-2xl p-8 text-center">
              <div className="text-5xl mb-4">✅</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">You're on the list!</h3>
              <p className="text-gray-500">Thanks for your interest in Pool Pilot. We'll reach out to you soon.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-8 space-y-4">
              {error && (
                <div className="bg-red-50 text-red-700 rounded-xl p-3 text-sm">{error}</div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Your Name *</label>
                  <input
                    className="w-full border border-gray-300 rounded-xl p-3 text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="John Smith"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input
                    className="w-full border border-gray-300 rounded-xl p-3 text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    type="email"
                    placeholder="john@example.com"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                <input
                  className="w-full border border-gray-300 rounded-xl p-3 text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Blue Wave Pool Service"
                  value={form.company}
                  onChange={e => setForm({ ...form, company: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    className="w-full border border-gray-300 rounded-xl p-3 text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="(555) 000-0000"
                    value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Number of Pools Serviced</label>
                  <input
                    className="w-full border border-gray-300 rounded-xl p-3 text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. 50"
                    value={form.pools}
                    onChange={e => setForm({ ...form, pools: e.target.value })}
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold text-base hover:bg-blue-700 transition disabled:opacity-50"
              >
                {loading ? 'Submitting...' : 'Request Access'}
              </button>
            </form>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8 px-6 text-center text-gray-400 text-sm">
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className="text-lg">🏊</span>
          <span className="font-semibold text-gray-600">Pool Pilot</span>
        </div>
        <p>Pool service management software. Access by invite only.</p>
      </footer>
    </div>
  )
}

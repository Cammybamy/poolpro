'use client'
import { useEffect, useState, Suspense } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'

function JoinForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState('loading') // loading | ready | error
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function init() {
      // Try code-based exchange first (PKCE flow)
      const code = searchParams.get('code')
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (!error) { await loadName(); setStatus('ready'); return }
      }

      // Fall back to checking existing session (hash-based / already exchanged)
      const { data: { session } } = await supabase.auth.getSession()
      if (session) { await loadName(); setStatus('ready'); return }

      // Listen for auth state in case hash is processed async
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if ((event === 'SIGNED_IN' || event === 'PASSWORD_RECOVERY') && session) {
          await loadName()
          setStatus('ready')
          subscription.unsubscribe()
        }
      })

      // If nothing after 5s, show error
      setTimeout(() => {
        setStatus(s => s === 'loading' ? 'error' : s)
      }, 5000)
    }
    init()
  }, [])

  async function loadName() {
    const { data: { user } } = await supabase.auth.getUser()
    const name = user?.user_metadata?.full_name
    if (name) setFullName(name)
  }

  async function handleSetup() {
    setError('')
    if (!fullName.trim()) { setError('Please enter your name'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    if (password !== confirm) { setError('Passwords do not match'); return }
    setSaving(true)
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
        data: { full_name: fullName }
      })
      if (updateError) { setError(updateError.message); setSaving(false); return }

      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('profiles').update({ full_name: fullName }).eq('user_id', user.id)
      }
      router.push('/')
    } catch (e) {
      setError(e.message)
      setSaving(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🏊</div>
          <div className="text-gray-500">Setting up your account...</div>
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Link Expired or Invalid</h1>
          <p className="text-gray-500 text-sm mb-6">This invite link has expired or already been used. Contact your admin to send a new invite.</p>
          <a href="/login" className="bg-blue-600 text-white px-6 py-2 rounded-xl font-semibold text-sm">Go to Login</a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">🏊</div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome to Pool Pilot</h1>
          <p className="text-gray-500 text-sm mt-1">Set your name and password to get started</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 rounded-xl p-3 mb-4 text-sm">{error}</div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Your Name</label>
            <input
              className="w-full border border-gray-300 rounded-xl p-3 text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Full Name"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Create Password</label>
            <input
              className="w-full border border-gray-300 rounded-xl p-3 text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              type="password"
              placeholder="At least 8 characters"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
            <input
              className="w-full border border-gray-300 rounded-xl p-3 text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              type="password"
              placeholder="Repeat password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
            />
          </div>
          <button
            onClick={handleSetup}
            disabled={saving}
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold text-base disabled:opacity-50"
          >
            {saving ? 'Finishing setup...' : 'Finish Setup'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function JoinPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    }>
      <JoinForm />
    </Suspense>
  )
}

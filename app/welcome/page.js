'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

export default function Welcome() {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // Supabase sets the session from the invite link hash automatically
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'PASSWORD_RECOVERY') {
        setReady(true)
        if (session?.user?.user_metadata?.full_name) {
          setFullName(session.user.user_metadata.full_name)
        }
      }
    })
  }, [])

  async function handleSetup() {
    setError('')
    if (!fullName.trim()) { setError('Please enter your name'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    if (password !== confirmPassword) { setError('Passwords do not match'); return }

    setLoading(true)
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
        data: { full_name: fullName }
      })
      if (updateError) { setError(updateError.message); setLoading(false); return }

      // Update profile name in case it needs updating
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('profiles').update({ full_name: fullName }).eq('user_id', user.id)
      }

      router.push('/')
    } catch (e) {
      setError(e.message)
      setLoading(false)
    }
  }

  if (!ready) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Setting up your account...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">🏊</div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome to PoolPro</h1>
          <p className="text-gray-500 text-sm mt-1">Set up your account to get started</p>
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
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
            />
          </div>
          <button
            onClick={handleSetup}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold text-base disabled:opacity-50"
          >
            {loading ? 'Setting up...' : 'Finish Setup'}
          </button>
        </div>
      </div>
    </div>
  )
}

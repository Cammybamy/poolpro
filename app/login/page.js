'use client'
  import { useState } from 'react'
  import { supabase } from '../../lib/supabase'
  import { useRouter } from 'next/navigation'

  export default function Login() {
    const router = useRouter()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')

    async function handleLogin() {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError('Invalid email or password')
      } else {
        router.push('/')
      }
    }

    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow p-8 w-full max-w-sm">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Pool Pilot</h1>
          <p className="text-gray-400 text-sm mb-6">Sign in to continue</p>

          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

          <div className="space-y-3">
            <input
              className="w-full border rounded-lg p-2 text-gray-800 bg-white"
              placeholder="Email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
            <input
              className="w-full border rounded-lg p-2 text-gray-800 bg-white"
              placeholder="Password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
            <button
              onClick={handleLogin}
              className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold"
            >
              Sign In
            </button>
          </div>
        </div>
      </div>
    )
  }
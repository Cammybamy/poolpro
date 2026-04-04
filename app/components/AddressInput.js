'use client'
import { useState, useEffect, useRef } from 'react'

export default function AddressInput({ value, onChange, placeholder, className }) {
  const [query, setQuery] = useState(value || '')
  const [suggestions, setSuggestions] = useState([])
  const [open, setOpen] = useState(false)
  const debounceRef = useRef(null)
  const containerRef = useRef(null)

  useEffect(() => {
    setQuery(value || '')
  }, [value])

  useEffect(() => {
    function handleClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleChange(e) {
    const val = e.target.value
    setQuery(val)
    onChange(val)
    clearTimeout(debounceRef.current)
    if (val.length < 2) { setSuggestions([]); setOpen(false); return }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(val)}&format=json&limit=6&addressdetails=1`, { headers: { 'Accept-Language': 'en-US' } })
        const data = await res.json()
        setSuggestions(data)
        setOpen(data.length > 0)
      } catch (e) { setSuggestions([]) }
    }, 400)
  }

  function selectSuggestion(item) {
    const a = item.address
    const parts = []
    if (a.house_number && a.road) parts.push(`${a.house_number} ${a.road}`)
    else if (a.road) parts.push(a.road)
    const city = a.city || a.town || a.village || a.hamlet
    if (city) parts.push(city)
    if (a.state) parts.push(a.state)
    if (a.postcode) parts.push(a.postcode)
    const formatted = parts.length >= 2 ? parts.join(', ') : item.display_name
    setQuery(formatted)
    onChange(formatted)
    setSuggestions([])
    setOpen(false)
  }

  return (
    <div ref={containerRef} className="relative">
      <input className={className} placeholder={placeholder} value={query} onChange={handleChange} onFocus={() => suggestions.length > 0 && setOpen(true)} autoComplete="off" />
      {open && (
        <div className="absolute z-50 w-full bg-white border border-gray-200 rounded-lg shadow-xl mt-1 max-h-56 overflow-y-auto">
          {suggestions.map((item, i) => (
            <button key={i} type="button" onMouseDown={() => selectSuggestion(item)} className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 border-b border-gray-100 last:border-0">
              <div className="font-medium text-gray-800 truncate">{item.address?.house_number ? `${item.address.house_number} ${item.address.road}` : (item.address?.road || item.display_name.split(',')[0])}</div>
              <div className="text-xs text-gray-400 truncate">{item.display_name}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

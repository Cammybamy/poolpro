'use client'
import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet'
import L from 'leaflet'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

function numberIcon(num) {
  return L.divIcon({
    className: '',
    html: `<div style="background:#2563eb;color:white;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:13px;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3)">${num}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  })
}

async function geocode(address) {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`, {
      headers: { 'User-Agent': 'PoolPro/1.0' }
    })
    const data = await res.json()
    if (data.length > 0) {
      return [parseFloat(data[0].lat), parseFloat(data[0].lon)]
    }
  } catch {}
  return null
}

export default function RouteMap({ jobs, onReorder }) {
  const [coords, setCoords] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (jobs.length === 0) { setLoading(false); return }
    resolveCoords()
  }, [jobs])

  async function resolveCoords() {
    setLoading(true)
    const results = []
    for (const job of jobs) {
      const address = job.customers?.address
      if (address) {
        const latLng = await geocode(address)
        results.push({ job, latLng })
      } else {
        results.push({ job, latLng: null })
      }
    }
    setCoords(results)
    setLoading(false)
  }

  function openInGoogleMaps() {
    const addresses = coords
      .filter(c => c.latLng)
      .map(c => encodeURIComponent(c.job.customers?.address))
    if (addresses.length === 0) return
    const destination = addresses[addresses.length - 1]
    const waypoints = addresses.slice(0, -1).join('|')
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${destination}&waypoints=${waypoints}&travelmode=driving`, '_blank')
  }

  function moveJob(index, direction) {
    const newJobs = [...jobs]
    const swapIndex = index + direction
    if (swapIndex < 0 || swapIndex >= newJobs.length) return
    const temp = newJobs[index]
    newJobs[index] = newJobs[swapIndex]
    newJobs[swapIndex] = temp
    onReorder(newJobs)
  }

  const validCoords = coords.filter(c => c.latLng)
  const center = validCoords.length > 0
    ? [validCoords.reduce((s, c) => s + c.latLng[0], 0) / validCoords.length,
       validCoords.reduce((s, c) => s + c.latLng[1], 0) / validCoords.length]
    : [39.5, -98.35]

  if (loading) return <div className="bg-white rounded-xl p-6 text-center text-gray-400">Loading map...</div>

  return (
    <div className="space-y-4">
      <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm" style={{ height: '300px' }}>
        <MapContainer center={center} zoom={validCoords.length > 0 ? 11 : 4} style={{ height: '100%', width: '100%' }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {coords.map((c, i) => c.latLng && (
            <Marker key={c.job.id} position={c.latLng} icon={numberIcon(i + 1)}>
              <Popup>
                <div className="text-sm">
                  <div className="font-semibold">{c.job.customers?.name}</div>
                  <div className="text-gray-500">{c.job.customers?.address}</div>
                </div>
              </Popup>
            </Marker>
          ))}
          {validCoords.length > 1 && (
            <Polyline positions={validCoords.map(c => c.latLng)} color="#2563eb" weight={2} dashArray="6" />
          )}
        </MapContainer>
      </div>

      <button onClick={openInGoogleMaps} className="w-full bg-green-500 text-white py-3 rounded-xl font-semibold">
        Open Route in Google Maps
      </button>

      <div className="space-y-2">
        {jobs.map((job, index) => (
          <div key={job.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 flex items-center gap-3">
            <div className="flex flex-col gap-0.5">
              <button onClick={() => moveJob(index, -1)} className="text-gray-400 hover:text-blue-600 text-base leading-none">▲</button>
              <button onClick={() => moveJob(index, 1)} className="text-gray-400 hover:text-blue-600 text-base leading-none">▼</button>
            </div>
            <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">{index + 1}</div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-gray-800 text-sm">{job.customers?.name}</div>
              <div className="text-gray-500 text-xs truncate">{job.customers?.address}</div>
            </div>
            <span className={job.status === 'complete' ? 'text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 flex-shrink-0' : 'text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 flex-shrink-0'}>{job.status}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

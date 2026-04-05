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

function userLocationIcon() {
  return L.divIcon({
    className: '',
    html: `<div style="background:#16a34a;color:white;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4)">📍</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  })
}

export default function RouteMap({ jobs, onReorder, driveTimes, startDriveTime, userLocation }) {
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
  const userLatLng = userLocation ? [userLocation.lat, userLocation.lon] : null
  const allPoints = userLatLng ? [userLatLng, ...validCoords.map(c => c.latLng)] : validCoords.map(c => c.latLng)
  const center = userLatLng
    ? userLatLng
    : validCoords.length > 0
      ? [validCoords.reduce((s, c) => s + c.latLng[0], 0) / validCoords.length,
         validCoords.reduce((s, c) => s + c.latLng[1], 0) / validCoords.length]
      : [39.5, -98.35]

  if (loading) return <div className="bg-white rounded-xl p-6 text-center text-gray-400">Loading map...</div>

  return (
    <div className="space-y-4">
      <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm" style={{ height: '300px' }}>
        <MapContainer center={center} zoom={validCoords.length > 0 ? 11 : 4} style={{ height: '100%', width: '100%' }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {userLatLng && (
            <Marker position={userLatLng} icon={userLocationIcon()}>
              <Popup><div className="text-sm font-semibold text-green-700">Your Location</div></Popup>
            </Marker>
          )}
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
          {allPoints.length > 1 && (
            <Polyline positions={allPoints} color="#2563eb" weight={2} dashArray="6" />
          )}
        </MapContainer>
      </div>

      <button onClick={openInGoogleMaps} className="w-full bg-green-500 text-white py-3 rounded-xl font-semibold">
        Open Route in Google Maps
      </button>

      <div className="space-y-1">
        {startDriveTime != null && (
          <div className="bg-purple-100 border border-purple-200 rounded-xl px-4 py-2 flex items-center justify-center gap-2 mb-1">
            <span className="text-purple-600 text-lg">📍</span>
            <span className="text-purple-700 font-semibold text-sm">{startDriveTime} min from your location</span>
          </div>
        )}
        {jobs.map((job, index) => (
          <div key={job.id}>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 flex items-center gap-3">
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
            {driveTimes && driveTimes[index] != null && index < jobs.length - 1 && (
              <div className="flex items-center gap-3 px-3 py-1.5">
                <div className="flex flex-col items-center gap-0.5 ml-9">
                  <div className="w-0.5 h-2 bg-blue-300"></div>
                  <div className="w-0.5 h-2 bg-blue-300"></div>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5 flex items-center gap-2">
                  <span className="text-blue-400 text-sm">🚗</span>
                  <span className="text-blue-700 font-semibold text-sm">{driveTimes[index]} min drive</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

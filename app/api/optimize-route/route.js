import { NextResponse } from 'next/server'

async function geocode(address) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
      { headers: { 'User-Agent': 'PoolPro/1.0 (pool service management app)' } }
    )
    const data = await res.json()
    if (data.length > 0) return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) }
  } catch (e) {}
  return null
}

function haversineMinutes(a, b) {
  const R = 3958.8
  const dLat = (b.lat - a.lat) * Math.PI / 180
  const dLon = (b.lon - a.lon) * Math.PI / 180
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLon / 2) ** 2
  const miles = R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x))
  // Estimate drive time: assume average 30 mph in service areas
  return Math.round((miles / 30) * 60)
}

export async function POST(request) {
  const { jobs, startLocation } = await request.json()
  if (!jobs || jobs.length < 2) return NextResponse.json({ order: (jobs || []).map(j => j.id), driveTimes: [], startDriveTime: null })

  // Geocode all addresses (sequentially to respect Nominatim rate limits)
  const points = []
  for (const job of jobs) {
    const coords = await geocode(job.customers?.address || '')
    points.push({ id: job.id, ...coords })
  }

  const valid = points.filter(p => p.lat && p.lon)
  if (valid.length < 2) return NextResponse.json({ order: jobs.map(j => j.id), driveTimes: [], startDriveTime: null })

  // Prepend tech's current location if provided
  const hasStart = startLocation?.lat && startLocation?.lon
  const allPoints = hasStart
    ? [{ id: '__start__', lat: startLocation.lat, lon: startLocation.lon }, ...valid]
    : valid

  // Try OSRM for real driving times, fall back to Haversine
  const n = allPoints.length
  let matrix = null
  try {
    const coords = allPoints.map(p => `${p.lon},${p.lat}`).join(';')
    const osrmRes = await fetch(`https://router.project-osrm.org/table/v1/driving/${coords}?annotations=duration`, { signal: AbortSignal.timeout(5000) })
    const osrmData = await osrmRes.json()
    if (osrmData.code === 'Ok' && osrmData.durations) {
      matrix = osrmData.durations.map(row => row.map(s => Math.round(s / 60)))
    }
  } catch (e) {}

  // Haversine fallback
  if (!matrix) {
    matrix = allPoints.map(a => allPoints.map(b => haversineMinutes(a, b)))
  }

  // Nearest neighbor algorithm
  const visited = new Array(n).fill(false)
  const order = [0]
  visited[0] = true
  for (let step = 0; step < n - 1; step++) {
    const current = order[order.length - 1]
    let nearest = -1, minTime = Infinity
    for (let j = 0; j < n; j++) {
      if (!visited[j] && matrix[current][j] < minTime) {
        minTime = matrix[current][j]
        nearest = j
      }
    }
    order.push(nearest)
    visited[nearest] = true
  }

  const jobOrder = hasStart ? order.slice(1) : order
  const optimizedIds = jobOrder.map(i => allPoints[i].id)

  // Jobs that failed geocoding go to the end
  const failedIds = points.filter(p => !p.lat).map(p => p.id)

  // Drive times between consecutive stops (in minutes)
  const driveTimes = jobOrder.slice(0, -1).map((fromIdx, i) => matrix[fromIdx][jobOrder[i + 1]])
  const startDriveTime = hasStart && jobOrder.length > 0 ? matrix[0][jobOrder[0]] : null

  return NextResponse.json({ order: [...optimizedIds, ...failedIds], driveTimes, startDriveTime })
}

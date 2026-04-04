import { NextResponse } from 'next/server'

export async function POST(request) {
  const { jobs, startLocation } = await request.json()
  if (!jobs || jobs.length < 2) return NextResponse.json({ order: (jobs || []).map(j => j.id) })

  // 1. Geocode all job addresses using OpenWeatherMap
  const geocoded = await Promise.all(jobs.map(async job => {
    try {
      const res = await fetch(`http://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(job.customers?.address || '')}&limit=1&appid=${process.env.OPENWEATHER_API_KEY}`)
      const data = await res.json()
      if (data.length > 0) return { ...job, lat: data[0].lat, lon: data[0].lon }
    } catch (e) {}
    return { ...job, lat: null, lon: null }
  }))

  const valid = geocoded.filter(j => j.lat && j.lon)
  if (valid.length < 2) return NextResponse.json({ order: jobs.map(j => j.id) })

  // 2. Build coordinate list — prepend tech's current location if provided
  const hasStart = startLocation?.lat && startLocation?.lon
  const allPoints = hasStart
    ? [{ id: '__start__', lat: startLocation.lat, lon: startLocation.lon }, ...valid]
    : valid

  // 3. Get driving time matrix from OSRM (free, no API key needed)
  const coords = allPoints.map(p => `${p.lon},${p.lat}`).join(';')
  let matrix = null
  try {
    const osrmRes = await fetch(`https://router.project-osrm.org/table/v1/driving/${coords}?annotations=duration`)
    const osrmData = await osrmRes.json()
    if (osrmData.code === 'Ok') matrix = osrmData.durations
  } catch (e) {}

  // Fallback: Haversine straight-line distance if OSRM fails
  if (!matrix) {
    matrix = allPoints.map((a) => allPoints.map((b) => {
      const R = 3958.8
      const dLat = (b.lat - a.lat) * Math.PI / 180
      const dLon = (b.lon - a.lon) * Math.PI / 180
      const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLon / 2) ** 2
      return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x))
    }))
  }

  // 4. Nearest neighbor — start from index 0 (tech location or first job)
  const n = allPoints.length
  const visited = new Array(n).fill(false)
  const order = [0]
  visited[0] = true

  for (let step = 0; step < n - 1; step++) {
    const current = order[order.length - 1]
    let nearest = -1
    let minTime = Infinity
    for (let j = 0; j < n; j++) {
      if (!visited[j] && matrix[current][j] < minTime) {
        minTime = matrix[current][j]
        nearest = j
      }
    }
    order.push(nearest)
    visited[nearest] = true
  }

  // Skip index 0 if it was the tech's start location (not a real job)
  const jobOrder = hasStart ? order.slice(1) : order
  const optimizedIds = jobOrder.map(i => allPoints[i].id)
  const failedIds = geocoded.filter(j => !j.lat).map(j => j.id)

  return NextResponse.json({ order: [...optimizedIds, ...failedIds] })
}

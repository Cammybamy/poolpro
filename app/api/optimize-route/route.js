import { NextResponse } from 'next/server'

export async function POST(request) {
  const { jobs } = await request.json()
  if (!jobs || jobs.length < 2) return NextResponse.json({ order: (jobs || []).map(j => j.id) })

  // 1. Geocode all addresses using OpenWeatherMap
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

  // 2. Get driving time matrix from OSRM (free, no API key needed)
  const coords = valid.map(j => `${j.lon},${j.lat}`).join(';')
  let matrix = null
  try {
    const osrmRes = await fetch(`https://router.project-osrm.org/table/v1/driving/${coords}?annotations=duration`)
    const osrmData = await osrmRes.json()
    if (osrmData.code === 'Ok') matrix = osrmData.durations
  } catch (e) {}

  // Fallback: Haversine straight-line distance if OSRM fails
  if (!matrix) {
    matrix = valid.map((a, i) => valid.map((b, j) => {
      if (i === j) return 0
      const R = 3958.8
      const dLat = (b.lat - a.lat) * Math.PI / 180
      const dLon = (b.lon - a.lon) * Math.PI / 180
      const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLon / 2) ** 2
      return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x))
    }))
  }

  // 3. Nearest neighbor algorithm starting from first job
  const n = valid.length
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

  const optimizedIds = order.map(i => valid[i].id)

  // Include any jobs that failed geocoding at the end
  const failedIds = geocoded.filter(j => !j.lat).map(j => j.id)

  return NextResponse.json({ order: [...optimizedIds, ...failedIds] })
}

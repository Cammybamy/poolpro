import { NextResponse } from 'next/server'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const lat = searchParams.get('lat')
  const lon = searchParams.get('lon')
  if (!lat || !lon) return NextResponse.json({ error: 'No coordinates' }, { status: 400 })

  const res = await fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=imperial&appid=${process.env.OPENWEATHER_API_KEY}`)
  const data = await res.json()

  // Group 3-hour slots into daily summaries
  const days = {}
  for (const item of (data.list || [])) {
    const date = item.dt_txt.split(' ')[0]
    if (!days[date]) days[date] = { date, temps: [], conditions: [], icons: [] }
    days[date].temps.push(item.main.temp)
    days[date].conditions.push(item.weather[0].main)
    days[date].icons.push(item.weather[0].icon)
  }

  const forecast = Object.values(days).slice(0, 7).map(day => ({
    date: day.date,
    high: Math.round(Math.max(...day.temps)),
    low: Math.round(Math.min(...day.temps)),
    condition: day.conditions[Math.floor(day.conditions.length / 2)],
    icon: day.icons[4] || day.icons[0],
  }))

  return NextResponse.json({ forecast, city: data.city?.name || '' })
}

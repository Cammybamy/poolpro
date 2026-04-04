import { NextResponse } from 'next/server'

export async function POST(request) {
  const { readings, address, history, pool } = await request.json()

  // 1. Get weather for the customer's location
  let weatherContext = 'Weather data unavailable'
  try {
    const geoRes = await fetch(`http://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(address)}&limit=1&appid=${process.env.OPENWEATHER_API_KEY}`)
    const geo = await geoRes.json()
    if (geo.length > 0) {
      const { lat, lon } = geo[0]
      const wRes = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${process.env.OPENWEATHER_API_KEY}&units=imperial`)
      const w = await wRes.json()
      weatherContext = `${Math.round(w.main.temp)}°F, ${w.weather[0].description}, humidity ${w.main.humidity}%, feels like ${Math.round(w.main.feels_like)}°F`
    }
  } catch (e) {}

  // 2. Build history context
  const historyLines = (history || []).slice(0, 4).map(log => {
    const date = new Date(log.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    return `${date}: Chlorine ${log.chlorine ?? '—'}, pH ${log.ph ?? '—'}, Alkalinity ${log.alkalinity ?? '—'}`
  })
  const historyContext = historyLines.length > 0 ? historyLines.join('\n') : 'No previous visits on record'

  // 3. Call OpenAI
  const prompt = `You are a pool chemistry expert helping a pool service technician. Analyze the readings and give specific, actionable recommendations.

Pool Info:
- Size: ${pool?.pool_size_gallons ? pool.pool_size_gallons + ' gallons' : 'Unknown'}
- Type: ${pool?.pool_type || 'Unknown'}
- Filter: ${pool?.filter_type || 'Unknown'}

Current Readings:
- Chlorine: ${readings.chlorine ?? 'not tested'} ppm (ideal: 1–3 ppm)
- pH: ${readings.ph ?? 'not tested'} (ideal: 7.2–7.6)
- Alkalinity: ${readings.alkalinity ?? 'not tested'} ppm (ideal: 80–120 ppm)

Recent History (previous visits):
${historyContext}

Current Weather: ${weatherContext}

Respond in exactly 3 short sections with these headers:
STATUS: One sentence overall assessment.
ALERTS: Any readings out of range or concerning trends from history. If none, write "None".
RECOMMENDATIONS: Specific chemicals to add with amounts based on pool size. Factor in the weather (heat burns chlorine faster, rain dilutes chemistry). If no action needed, write "None".

Be concise and practical. Plain language a technician can act on immediately.`

  const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 350,
      temperature: 0.3
    })
  })

  const aiData = await aiRes.json()
  const analysis = aiData.choices?.[0]?.message?.content || 'Analysis unavailable'

  return NextResponse.json({ analysis, weather: weatherContext })
}

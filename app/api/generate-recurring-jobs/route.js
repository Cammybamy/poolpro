import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(req) {
  try {
    const { customer_id, frequency, start_date, technician, months_ahead = 6 } = await req.json()

    if (!customer_id || !frequency || frequency === 'none' || !start_date) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Build list of dates to schedule
    const dates = []
    const start = new Date(start_date + 'T12:00:00')
    const end = new Date(start)
    end.setMonth(end.getMonth() + months_ahead)

    if (frequency === 'weekly') {
      const cur = new Date(start)
      while (cur <= end) {
        dates.push(cur.toISOString().split('T')[0])
        cur.setDate(cur.getDate() + 7)
      }
    } else if (frequency === 'biweekly') {
      const cur = new Date(start)
      while (cur <= end) {
        dates.push(cur.toISOString().split('T')[0])
        cur.setDate(cur.getDate() + 14)
      }
    } else if (frequency === 'monthly') {
      const cur = new Date(start)
      while (cur <= end) {
        dates.push(cur.toISOString().split('T')[0])
        cur.setMonth(cur.getMonth() + 1)
      }
    }

    // Fetch existing jobs for this customer to avoid duplicates
    const { data: existing } = await supabase
      .from('jobs')
      .select('scheduled_date')
      .eq('customer_id', customer_id)

    const existingDates = new Set((existing || []).map(j => j.scheduled_date))
    const newDates = dates.filter(d => !existingDates.has(d))

    if (newDates.length === 0) {
      return Response.json({ created: 0, message: 'No new jobs to create' })
    }

    const jobs = newDates.map(date => ({
      customer_id,
      scheduled_date: date,
      technician: technician || null,
      status: 'pending',
      notes: '',
      recurring: true,
    }))

    const { error } = await supabase.from('jobs').insert(jobs)
    if (error) return Response.json({ error: error.message }, { status: 500 })

    return Response.json({ created: jobs.length })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}

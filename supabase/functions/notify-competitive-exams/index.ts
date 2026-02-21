import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]
    const threeDaysLater = new Date(today)
    threeDaysLater.setDate(threeDaysLater.getDate() + 3)
    const threeDaysStr = threeDaysLater.toISOString().split('T')[0]

    // Fetch competitive exams within next 3 days
    const { data: exams, error: examsError } = await supabase
      .from('weekly_exams')
      .select('id, exam_title, exam_date, exam_time, total_marks, class_id, exam_type_label, subjects(name)')
      .eq('syllabus_type', 'competitive')
      .gte('exam_date', todayStr)
      .lte('exam_date', threeDaysStr)

    if (examsError) throw examsError
    if (!exams || exams.length === 0) {
      return new Response(JSON.stringify({ message: 'No competitive exams within 3 days' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let totalInserted = 0

    for (const exam of exams) {
      const examDate = new Date(exam.exam_date + 'T00:00:00')
      const daysLeft = Math.ceil((examDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      const daysText = daysLeft === 0 ? 'today' : daysLeft === 1 ? 'tomorrow' : `in ${daysLeft} days`
      const title = '🏆 Competitive Exam Reminder'
      const message = `${exam.exam_title} is ${daysText} (${exam.exam_date} at ${exam.exam_time})`

      // Collect all target user IDs
      const userIds: string[] = []

      // 1. Admin user IDs
      const { data: adminIds } = await supabase.rpc('get_admin_user_ids')
      if (adminIds) userIds.push(...adminIds)

      // 2. Teacher user IDs
      const { data: teachers } = await supabase.from('teachers').select('user_id')
      if (teachers) userIds.push(...teachers.map((t: any) => t.user_id))

      // 3. Parent user IDs (children in the exam's class)
      const { data: parentUsers } = await supabase
        .from('students')
        .select('student_parents(parents(user_id))')
        .eq('class_id', exam.class_id)

      if (parentUsers) {
        for (const s of parentUsers) {
          const links = (s as any).student_parents || []
          for (const sp of links) {
            const parentUserId = sp?.parents?.user_id
            if (parentUserId) userIds.push(parentUserId)
          }
        }
      }

      // Deduplicate
      const uniqueUserIds = [...new Set(userIds)]

      // Check existing notifications to avoid duplicates (match on type + exam id in message)
      const dedupKey = `comp_exam_${exam.id}_${exam.exam_date}`
      const { data: existing } = await supabase
        .from('notifications')
        .select('user_id')
        .eq('type', 'competitive_exam')
        .like('link', `%${exam.id}%`)

      const existingUserIds = new Set((existing || []).map((n: any) => n.user_id))
      const newUserIds = uniqueUserIds.filter(uid => !existingUserIds.has(uid))

      if (newUserIds.length > 0) {
        const notifications = newUserIds.map(uid => ({
          user_id: uid,
          title,
          message,
          type: 'competitive_exam',
          link: `/admin/weekly-exams?exam=${exam.id}`,
          is_read: false,
        }))

        // Insert in batches of 100
        for (let i = 0; i < notifications.length; i += 100) {
          const batch = notifications.slice(i, i + 100)
          const { error: insertError } = await supabase.from('notifications').insert(batch)
          if (insertError) console.error('Insert error:', insertError)
          else totalInserted += batch.length
        }
      }
    }

    return new Response(JSON.stringify({ message: `Inserted ${totalInserted} notifications`, examsProcessed: exams.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

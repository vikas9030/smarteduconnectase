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
    const oneDayLater = new Date(today)
    oneDayLater.setDate(oneDayLater.getDate() + 1)
    const oneDayStr = oneDayLater.toISOString().split('T')[0]
    const threeDaysLater = new Date(today)
    threeDaysLater.setDate(threeDaysLater.getDate() + 3)
    const threeDaysStr = threeDaysLater.toISOString().split('T')[0]

    let totalInserted = 0

    // Helper: get all target user IDs for a class
    async function getTargetUserIds(classId: string): Promise<string[]> {
      const userIds: string[] = []

      // Admins
      const { data: adminIds } = await supabase.rpc('get_admin_user_ids')
      if (adminIds) userIds.push(...adminIds)

      // Teachers
      const { data: teachers } = await supabase.from('teachers').select('user_id')
      if (teachers) userIds.push(...teachers.map((t: any) => t.user_id))

      // Parents of students in the class
      const { data: parentUsers } = await supabase
        .from('students')
        .select('student_parents(parents(user_id))')
        .eq('class_id', classId)

      if (parentUsers) {
        for (const s of parentUsers) {
          const links = (s as any).student_parents || []
          for (const sp of links) {
            const parentUserId = sp?.parents?.user_id
            if (parentUserId) userIds.push(parentUserId)
          }
        }
      }

      return [...new Set(userIds)]
    }

    // Helper: insert notifications avoiding duplicates
    async function insertNotifications(
      userIds: string[],
      title: string,
      message: string,
      type: string,
      link: string,
      dedupKey: string
    ) {
      // Check existing to avoid duplicates
      const { data: existing } = await supabase
        .from('notifications')
        .select('user_id')
        .eq('type', type)
        .like('message', `%${dedupKey}%`)

      const existingUserIds = new Set((existing || []).map((n: any) => n.user_id))
      const newUserIds = userIds.filter(uid => !existingUserIds.has(uid))

      if (newUserIds.length > 0) {
        const notifications = newUserIds.map(uid => ({
          user_id: uid,
          title,
          message,
          type,
          link,
          is_read: false,
        }))

        for (let i = 0; i < notifications.length; i += 100) {
          const batch = notifications.slice(i, i + 100)
          const { error } = await supabase.from('notifications').insert(batch)
          if (error) console.error('Insert error:', error)
          else totalInserted += batch.length
        }
      }
    }

    // ===== 1. COMPETITIVE EXAMS (weekly_exams with syllabus_type = 'competitive') =====
    const { data: compExams, error: compError } = await supabase
      .from('weekly_exams')
      .select('id, exam_title, exam_date, exam_time, total_marks, class_id, exam_type_label, classes(name, section), subjects(name)')
      .eq('syllabus_type', 'competitive')
      .gte('exam_date', todayStr)
      .lte('exam_date', threeDaysStr)

    if (compError) console.error('Competitive exams error:', compError)

    for (const exam of compExams || []) {
      const examDate = new Date(exam.exam_date + 'T00:00:00')
      const daysLeft = Math.ceil((examDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

      // Send at 3 days and 1 day (or today)
      if (daysLeft > 3) continue
      const daysText = daysLeft === 0 ? 'today' : daysLeft === 1 ? 'tomorrow' : `in ${daysLeft} days`
      const className = exam.classes ? `${exam.classes.name}-${exam.classes.section}` : ''
      const subjectName = exam.subjects?.name || ''
      const title = '🏆 Competitive Exam Reminder'
      const message = `${exam.exam_title} (${subjectName}, Class ${className}) is ${daysText} at ${exam.exam_time} [comp_${exam.id}_${daysLeft}d]`

      const userIds = await getTargetUserIds(exam.class_id)
      await insertNotifications(userIds, title, message, 'competitive_exam', `/admin/weekly-exams?exam=${exam.id}`, `comp_${exam.id}_${daysLeft}d`)
    }

    // ===== 2. REGULAR EXAMS (exams table) =====
    const { data: regularExams, error: regError } = await supabase
      .from('exams')
      .select('id, name, exam_date, exam_time, max_marks, class_id, classes(name, section), subjects(name)')
      .gte('exam_date', todayStr)
      .lte('exam_date', threeDaysStr)

    if (regError) console.error('Regular exams error:', regError)

    for (const exam of regularExams || []) {
      if (!exam.exam_date || !exam.class_id) continue
      const examDate = new Date(exam.exam_date + 'T00:00:00')
      const daysLeft = Math.ceil((examDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

      if (daysLeft > 3) continue
      const daysText = daysLeft === 0 ? 'today' : daysLeft === 1 ? 'tomorrow' : `in ${daysLeft} days`
      const className = exam.classes ? `${exam.classes.name}-${exam.classes.section}` : ''
      const subjectName = exam.subjects?.name || ''
      const title = '📝 Exam Reminder'
      const message = `${exam.name} (${subjectName}, Class ${className}) is ${daysText}${exam.exam_time ? ` at ${exam.exam_time}` : ''} [exam_${exam.id}_${daysLeft}d]`

      const userIds = await getTargetUserIds(exam.class_id)
      await insertNotifications(userIds, title, message, 'exam_schedule', `/admin/exams`, `exam_${exam.id}_${daysLeft}d`)
    }

    // ===== 3. EXAM FINISHED NOTIFICATIONS (yesterday's exams) =====
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split('T')[0]

    // Regular exams that finished yesterday
    const { data: finishedRegular } = await supabase
      .from('exams')
      .select('id, name, exam_date, class_id, classes(name, section), subjects(name)')
      .eq('exam_date', yesterdayStr)

    for (const exam of finishedRegular || []) {
      if (!exam.class_id) continue
      const className = exam.classes ? `${exam.classes.name}-${exam.classes.section}` : ''
      const subjectName = exam.subjects?.name || ''
      const title = '✅ Exam Completed'
      const message = `${exam.name} (${subjectName}, Class ${className}) has been completed [examdone_${exam.id}]`

      const userIds = await getTargetUserIds(exam.class_id)
      await insertNotifications(userIds, title, message, 'exam_schedule', `/admin/exams`, `examdone_${exam.id}`)
    }

    // Competitive exams that finished yesterday
    const { data: finishedComp } = await supabase
      .from('weekly_exams')
      .select('id, exam_title, exam_date, class_id, classes(name, section), subjects(name)')
      .eq('syllabus_type', 'competitive')
      .eq('exam_date', yesterdayStr)

    for (const exam of finishedComp || []) {
      const className = exam.classes ? `${exam.classes.name}-${exam.classes.section}` : ''
      const subjectName = exam.subjects?.name || ''
      const title = '✅ Competitive Exam Completed'
      const message = `${exam.exam_title} (${subjectName}, Class ${className}) has been completed [compdone_${exam.id}]`

      const userIds = await getTargetUserIds(exam.class_id)
      await insertNotifications(userIds, title, message, 'competitive_exam', `/admin/weekly-exams`, `compdone_${exam.id}`)
    }

    return new Response(JSON.stringify({
      message: `Inserted ${totalInserted} notifications`,
      compExams: compExams?.length || 0,
      regularExams: regularExams?.length || 0,
      finishedRegular: finishedRegular?.length || 0,
      finishedComp: finishedComp?.length || 0,
    }), {
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
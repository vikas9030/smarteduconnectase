import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceKey);

    // Find fees due in X days that haven't had reminders sent
    const today = new Date();
    
    // Get all unpaid fees with reminder_days_before > 0 and reminder not yet sent
    const { data: fees, error } = await adminClient
      .from("fees")
      .select(`
        id, fee_type, amount, due_date, reminder_days_before, student_id,
        students!inner(full_name, class_id, 
          student_parents!inner(parent_id, 
            parents!inner(user_id)
          )
        )
      `)
      .eq("payment_status", "unpaid")
      .eq("reminder_sent", false)
      .gt("reminder_days_before", 0);

    if (error) throw error;

    let remindersSent = 0;

    for (const fee of fees || []) {
      const dueDate = new Date(fee.due_date);
      const reminderDate = new Date(dueDate);
      reminderDate.setDate(reminderDate.getDate() - (fee.reminder_days_before || 3));

      if (today >= reminderDate) {
        // Get parent user IDs
        const student = fee.students as any;
        const parentLinks = student?.student_parents || [];

        for (const link of parentLinks) {
          const parentUserId = link.parents?.user_id;
          if (!parentUserId) continue;

          // Create notification for parent
          await adminClient.from("notifications").insert({
            user_id: parentUserId,
            title: "Fee Payment Reminder",
            message: `Fee reminder: ₹${fee.amount.toLocaleString()} ${fee.fee_type} fee for ${student.full_name} is due on ${fee.due_date}. Please pay before the due date.`,
            type: "fee_reminder",
            link: "/parent/fees",
          });
        }

        // Mark reminder as sent
        await adminClient
          .from("fees")
          .update({ reminder_sent: true })
          .eq("id", fee.id);

        remindersSent++;
      }
    }

    return new Response(
      JSON.stringify({ success: true, reminders_sent: remindersSent }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

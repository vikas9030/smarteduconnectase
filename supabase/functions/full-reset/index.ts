import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create admin client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user is admin
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .single();

    if (!roleData || roleData.role !== "admin") {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const currentUserId = userData.user.id;

    // Delete all data from tables in order (respecting foreign keys)
    await adminClient.from("exam_marks").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await adminClient.from("exams").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await adminClient.from("attendance").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await adminClient.from("homework").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await adminClient.from("fees").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await adminClient.from("leave_requests").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await adminClient.from("certificate_requests").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await adminClient.from("complaints").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await adminClient.from("student_reports").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await adminClient.from("messages").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await adminClient.from("timetable").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await adminClient.from("announcements").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await adminClient.from("student_parents").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await adminClient.from("students").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await adminClient.from("teacher_classes").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await adminClient.from("teachers").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await adminClient.from("parents").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await adminClient.from("classes").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await adminClient.from("subjects").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    // Get all user IDs except current admin
    const { data: allUsers } = await adminClient
      .from("user_roles")
      .select("user_id")
      .neq("user_id", currentUserId);

    // Delete profiles and roles for other users
    if (allUsers && allUsers.length > 0) {
      const userIds = allUsers.map(u => u.user_id);
      
      await adminClient.from("profiles").delete().in("user_id", userIds);
      await adminClient.from("user_roles").delete().in("user_id", userIds);

      // Delete auth users
      for (const uid of userIds) {
        await adminClient.auth.admin.deleteUser(uid);
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: "Full reset complete. All data and accounts deleted except yours." }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in full-reset:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

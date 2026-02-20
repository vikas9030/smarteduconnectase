import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEMO_USERS = [
  { email: "admin@demo.school", password: "demo123456", role: "admin", fullName: "Demo Admin" },
  { email: "teacher@demo.school", password: "demo123456", role: "teacher", fullName: "Demo Teacher" },
  { email: "parent@demo.school", password: "demo123456", role: "parent", fullName: "Demo Parent" },
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const results = [];

    for (const demoUser of DEMO_USERS) {
      // Check if user already exists
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
      const existingUser = existingUsers?.users?.find(u => u.email === demoUser.email);

      let userId: string;

      if (existingUser) {
        userId = existingUser.id;
        results.push({ email: demoUser.email, status: "exists", userId });
      } else {
        // Create the user
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: demoUser.email,
          password: demoUser.password,
          email_confirm: true,
          user_metadata: { full_name: demoUser.fullName },
        });

        if (createError) {
          results.push({ email: demoUser.email, status: "error", error: createError.message });
          continue;
        }

        userId = newUser.user.id;
        results.push({ email: demoUser.email, status: "created", userId });
      }

      // Ensure role exists
      const { data: existingRole } = await supabaseAdmin
        .from("user_roles")
        .select("id")
        .eq("user_id", userId)
        .single();

      if (!existingRole) {
        await supabaseAdmin.from("user_roles").insert({
          user_id: userId,
          role: demoUser.role,
        });
      }

      // Ensure profile exists
      const { data: existingProfile } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("user_id", userId)
        .single();

      if (!existingProfile) {
        await supabaseAdmin.from("profiles").insert({
          user_id: userId,
          full_name: demoUser.fullName,
          email: demoUser.email,
        });
      }

      // Create role-specific records
      if (demoUser.role === "teacher") {
        const { data: existingTeacher } = await supabaseAdmin
          .from("teachers")
          .select("id")
          .eq("user_id", userId)
          .single();

        if (!existingTeacher) {
          await supabaseAdmin.from("teachers").insert({
            user_id: userId,
            teacher_id: "DEMO-TCH-001",
            qualification: "B.Ed",
            subjects: ["Mathematics", "Science"],
            status: "active",
          });
        }
      }

      if (demoUser.role === "parent") {
        const { data: existingParent } = await supabaseAdmin
          .from("parents")
          .select("id")
          .eq("user_id", userId)
          .single();

        if (!existingParent) {
          await supabaseAdmin.from("parents").insert({
            user_id: userId,
            phone: "+1234567890",
          });
        }
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

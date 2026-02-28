import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function getSupabase() {
  return createClient(supabaseUrl, serviceRoleKey);
}

async function getOrCreateVapidKeys(supabase: ReturnType<typeof getSupabase>) {
  const { data: existing } = await supabase
    .from("push_config")
    .select("public_key, private_key")
    .limit(1)
    .maybeSingle();

  if (existing) {
    return { publicKey: existing.public_key, privateKey: existing.private_key };
  }

  // Generate new VAPID keys using web-push
  const vapidKeys = webpush.generateVAPIDKeys();
  await supabase.from("push_config").insert({
    public_key: vapidKeys.publicKey,
    private_key: vapidKeys.privateKey,
  });

  return vapidKeys;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = getSupabase();
    const vapidKeys = await getOrCreateVapidKeys(supabase);

    // Configure web-push with VAPID details
    webpush.setVapidDetails(
      "mailto:admin@smarteduconnect.app",
      vapidKeys.publicKey,
      vapidKeys.privateKey
    );

    // GET - return public key for frontend subscription
    if (req.method === "GET") {
      return new Response(JSON.stringify({ publicKey: vapidKeys.publicKey }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST - send push notification
    const { user_id, title, message, url } = await req.json();

    if (!user_id || !title) {
      return new Response(JSON.stringify({ error: "user_id and title required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get all subscriptions for this user
    const { data: subscriptions } = await supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", user_id);

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: "No subscriptions found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = JSON.stringify({ title, message, url: url || "/" });
    let sent = 0;
    const expired: string[] = [];

    for (const sub of subscriptions) {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      };

      try {
        await webpush.sendNotification(pushSubscription, payload);
        sent++;
      } catch (err: any) {
        console.error("Push send error:", err.statusCode, err.body);
        if (err.statusCode === 404 || err.statusCode === 410) {
          expired.push(sub.endpoint);
        }
      }
    }

    // Clean up expired subscriptions
    if (expired.length > 0) {
      await supabase
        .from("push_subscriptions")
        .delete()
        .eq("user_id", user_id)
        .in("endpoint", expired);
    }

    return new Response(
      JSON.stringify({ sent, total: subscriptions.length, expired: expired.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Push notification error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

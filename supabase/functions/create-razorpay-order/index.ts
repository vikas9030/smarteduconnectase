import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Verify auth
    const authHeader = req.headers.get('Authorization');
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader || '' } },
    });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Read Razorpay keys from app_settings first, fall back to env
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: settings } = await adminClient
      .from('app_settings')
      .select('setting_key, setting_value')
      .in('setting_key', ['razorpay_key_id', 'razorpay_key_secret']);

    const dbKeyId = settings?.find(s => s.setting_key === 'razorpay_key_id')?.setting_value;
    const dbKeySecret = settings?.find(s => s.setting_key === 'razorpay_key_secret')?.setting_value;

    const RAZORPAY_KEY_ID = (typeof dbKeyId === 'string' ? dbKeyId.replace(/^"|"$/g, '') : null) || Deno.env.get('RAZORPAY_KEY_ID');
    const RAZORPAY_KEY_SECRET = (typeof dbKeySecret === 'string' ? dbKeySecret.replace(/^"|"$/g, '') : null) || Deno.env.get('RAZORPAY_KEY_SECRET');

    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      throw new Error('Razorpay credentials not configured. Please set them in Settings.');
    }

    const { fee_id, amount, student_name, fee_type } = await req.json();
    if (!fee_id || !amount) {
      throw new Error('fee_id and amount are required');
    }

    // Create Razorpay order
    const orderRes = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`),
      },
      body: JSON.stringify({
        amount: Math.round(amount * 100),
        currency: 'INR',
        receipt: `fee_${fee_id.slice(0, 8)}`,
        notes: {
          fee_id,
          student_name: student_name || '',
          fee_type: fee_type || '',
        },
      }),
    });

    if (!orderRes.ok) {
      const errBody = await orderRes.text();
      let userMessage = 'Payment gateway error. Please try again.';
      try {
        const errJson = JSON.parse(errBody);
        if (errJson?.error?.description) {
          userMessage = errJson.error.description;
        }
      } catch {}
      return new Response(JSON.stringify({ error: userMessage }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const order = await orderRes.json();

    return new Response(JSON.stringify({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: RAZORPAY_KEY_ID,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

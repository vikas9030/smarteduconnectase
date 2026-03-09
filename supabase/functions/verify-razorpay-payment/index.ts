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
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Verify user auth
    const authHeader = req.headers.get('Authorization');
    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader || '' } },
    });
    const { data: { user }, error: authError } = await anonClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Read Razorpay secret from app_settings first, fall back to env
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: settings } = await adminClient
      .from('app_settings')
      .select('setting_key, setting_value')
      .in('setting_key', ['razorpay_key_secret']);

    const dbKeySecret = settings?.find(s => s.setting_key === 'razorpay_key_secret')?.setting_value;
    const RAZORPAY_KEY_SECRET = (typeof dbKeySecret === 'string' ? dbKeySecret.replace(/^"|"$/g, '') : null) || Deno.env.get('RAZORPAY_KEY_SECRET');

    if (!RAZORPAY_KEY_SECRET) {
      throw new Error('Razorpay secret not configured. Please set it in Settings.');
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, fee_id, amount } = await req.json();

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !fee_id) {
      throw new Error('Missing required payment verification fields');
    }

    // Verify signature using HMAC SHA256
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(RAZORPAY_KEY_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const message = `${razorpay_order_id}|${razorpay_payment_id}`;
    const signatureBytes = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
    const expectedSignature = Array.from(new Uint8Array(signatureBytes))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    if (expectedSignature !== razorpay_signature) {
      return new Response(JSON.stringify({ error: 'Payment verification failed — invalid signature' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch current fee to accumulate paid_amount
    const { data: feeRecord, error: feeError } = await adminClient
      .from('fees')
      .select('amount, discount, paid_amount, student_id')
      .eq('id', fee_id)
      .single();

    if (feeError || !feeRecord) {
      throw new Error('Failed to fetch fee record');
    }

    const netAmount = feeRecord.amount - (feeRecord.discount || 0);
    const newTotalPaid = (feeRecord.paid_amount || 0) + amount;
    const newStatus = newTotalPaid >= netAmount ? 'paid' : 'partial';
    const receiptNumber = `RZP${Date.now().toString().slice(-8)}`;

    const paidAt = new Date().toISOString();

    const { error: updateError } = await adminClient
      .from('fees')
      .update({
        payment_status: newStatus,
        paid_amount: newTotalPaid,
        paid_at: paidAt,
        receipt_number: receiptNumber,
      })
      .eq('id', fee_id);

    if (updateError) {
      throw new Error(`Failed to update fee: ${updateError.message}`);
    }

    // Log payment in fee_payments history
    await adminClient.from('fee_payments').insert({
      fee_id,
      student_id: feeRecord.student_id,
      amount,
      payment_method: 'razorpay',
      receipt_number: receiptNumber,
      razorpay_payment_id,
      paid_at: paidAt,
      recorded_by: user.id,
    });

    return new Response(JSON.stringify({
      success: true,
      receipt_number: receiptNumber,
      payment_id: razorpay_payment_id,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error verifying payment:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

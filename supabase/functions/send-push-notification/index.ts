import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

// Generate VAPID keys using Web Crypto API
async function generateVapidKeys() {
  const keyPair = await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"]
  );

  const publicKeyRaw = await crypto.subtle.exportKey("raw", keyPair.publicKey);
  const privateKeyJwk = await crypto.subtle.exportKey("jwk", keyPair.privateKey);

  const publicKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(publicKeyRaw)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const privateKeyBase64 = privateKeyJwk.d!;

  return { publicKey: publicKeyBase64, privateKey: privateKeyBase64 };
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

  const keys = await generateVapidKeys();
  await supabase.from("push_config").insert({
    public_key: keys.publicKey,
    private_key: keys.privateKey,
  });

  return keys;
}

// Create VAPID JWT for Web Push authentication
async function createVapidJwt(
  endpoint: string,
  privateKeyBase64: string,
  publicKeyBase64: string
) {
  const url = new URL(endpoint);
  const audience = `${url.protocol}//${url.host}`;

  const header = { typ: "JWT", alg: "ES256" };
  const payload = {
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
    sub: "mailto:admin@smarteduconnect.app",
  };

  const b64url = (data: string) =>
    btoa(data).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  const headerB64 = b64url(JSON.stringify(header));
  const payloadB64 = b64url(JSON.stringify(payload));
  const unsigned = `${headerB64}.${payloadB64}`;

  // Import private key
  const privateKeyBytes = Uint8Array.from(
    atob(privateKeyBase64.replace(/-/g, "+").replace(/_/g, "/")),
    (c) => c.charCodeAt(0)
  );

  const publicKeyBytes = Uint8Array.from(
    atob(publicKeyBase64.replace(/-/g, "+").replace(/_/g, "/")),
    (c) => c.charCodeAt(0)
  );

  const jwk = {
    kty: "EC",
    crv: "P-256",
    d: privateKeyBase64,
    x: btoa(String.fromCharCode(...publicKeyBytes.slice(1, 33)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, ""),
    y: btoa(String.fromCharCode(...publicKeyBytes.slice(33, 65)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, ""),
  };

  const key = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    new TextEncoder().encode(unsigned)
  );

  // Convert DER signature to raw r||s format
  const sigArray = new Uint8Array(signature);
  let sigB64: string;

  if (sigArray.length === 64) {
    sigB64 = btoa(String.fromCharCode(...sigArray))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  } else {
    // DER encoded - extract r and s
    const r = sigArray.slice(4, 4 + sigArray[3]);
    const s = sigArray.slice(6 + sigArray[3]);
    const rPadded = new Uint8Array(32);
    const sPadded = new Uint8Array(32);
    rPadded.set(r.length > 32 ? r.slice(r.length - 32) : r, 32 - Math.min(r.length, 32));
    sPadded.set(s.length > 32 ? s.slice(s.length - 32) : s, 32 - Math.min(s.length, 32));
    const raw = new Uint8Array(64);
    raw.set(rPadded, 0);
    raw.set(sPadded, 32);
    sigB64 = btoa(String.fromCharCode(...raw))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  }

  return `${unsigned}.${sigB64}`;
}

// Encrypt push payload using ECDH + AES-128-GCM (RFC 8291)
async function encryptPayload(
  payload: string,
  p256dhBase64: string,
  authBase64: string
) {
  // Generate local ECDH key pair
  const localKeyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"]
  );

  const localPublicKeyRaw = await crypto.subtle.exportKey("raw", localKeyPair.publicKey);

  // Import subscriber's public key
  const p256dhBytes = Uint8Array.from(
    atob(p256dhBase64.replace(/-/g, "+").replace(/_/g, "/")),
    (c) => c.charCodeAt(0)
  );

  const subscriberKey = await crypto.subtle.importKey(
    "raw",
    p256dhBytes,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );

  // Derive shared secret via ECDH
  const sharedSecret = await crypto.subtle.deriveBits(
    { name: "ECDH", public: subscriberKey },
    localKeyPair.privateKey,
    256
  );

  const authBytes = Uint8Array.from(
    atob(authBase64.replace(/-/g, "+").replace(/_/g, "/")),
    (c) => c.charCodeAt(0)
  );

  // HKDF to derive PRK
  const ikm = new Uint8Array(sharedSecret);
  const prkKey = await crypto.subtle.importKey("raw", authBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const prkInfo = new TextEncoder().encode("WebPush: info\0");
  const prkInfoFull = new Uint8Array(prkInfo.length + p256dhBytes.length + new Uint8Array(localPublicKeyRaw).length);
  prkInfoFull.set(prkInfo, 0);
  prkInfoFull.set(p256dhBytes, prkInfo.length);
  prkInfoFull.set(new Uint8Array(localPublicKeyRaw), prkInfo.length + p256dhBytes.length);

  // Simplified: use HKDF for content encryption key
  const salt = crypto.getRandomValues(new Uint8Array(16));
  
  const keyMaterial = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveKey"]);
  
  const contentEncryptionKey = await crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: salt,
      info: new TextEncoder().encode("Content-Encoding: aes128gcm\0"),
    },
    keyMaterial,
    { name: "AES-GCM", length: 128 },
    false,
    ["encrypt"]
  );

  const nonceInfo = new TextEncoder().encode("Content-Encoding: nonce\0");
  const nonceKey = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  const nonceBits = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt, info: nonceInfo },
    nonceKey,
    96
  );
  const nonce = new Uint8Array(nonceBits);

  // Pad and encrypt payload
  const payloadBytes = new TextEncoder().encode(payload);
  const paddedPayload = new Uint8Array(payloadBytes.length + 2);
  paddedPayload.set(payloadBytes, 0);
  paddedPayload[payloadBytes.length] = 2; // delimiter
  paddedPayload[payloadBytes.length + 1] = 0; // padding

  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: nonce },
    contentEncryptionKey,
    paddedPayload
  );

  // Build aes128gcm content coding header
  const recordSize = new Uint8Array(4);
  new DataView(recordSize.buffer).setUint32(0, 4096);
  const localPubKey = new Uint8Array(localPublicKeyRaw);

  const header = new Uint8Array(salt.length + 4 + 1 + localPubKey.length);
  header.set(salt, 0);
  header.set(recordSize, 16);
  header[20] = localPubKey.length;
  header.set(localPubKey, 21);

  const body = new Uint8Array(header.length + new Uint8Array(encrypted).length);
  body.set(header, 0);
  body.set(new Uint8Array(encrypted), header.length);

  return body;
}

async function sendPushToSubscription(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: object,
  vapidKeys: { publicKey: string; privateKey: string }
) {
  try {
    const payloadStr = JSON.stringify(payload);
    const encrypted = await encryptPayload(payloadStr, subscription.p256dh, subscription.auth);
    const vapidJwt = await createVapidJwt(subscription.endpoint, vapidKeys.privateKey, vapidKeys.publicKey);

    const response = await fetch(subscription.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Encoding": "aes128gcm",
        "TTL": "86400",
        "Authorization": `vapid t=${vapidJwt}, k=${vapidKeys.publicKey}`,
        "Urgency": "high",
      },
      body: encrypted,
    });

    return { success: response.status === 201 || response.status === 200, status: response.status };
  } catch (err) {
    console.error("Push send error:", err);
    return { success: false, status: 0 };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = getSupabase();
    const vapidKeys = await getOrCreateVapidKeys(supabase);

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

    const payload = { title, message, url: url || "/" };
    let sent = 0;
    const expired: string[] = [];

    for (const sub of subscriptions) {
      const result = await sendPushToSubscription(sub, payload, vapidKeys);
      if (result.success) {
        sent++;
      } else if (result.status === 404 || result.status === 410) {
        expired.push(sub.endpoint);
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
  } catch (err) {
    console.error("Push notification error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

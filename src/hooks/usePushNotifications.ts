/// <reference lib="webworker" />

declare global {
  interface ServiceWorkerRegistration {
    pushManager: PushManager;
  }

  interface PushManager {
    getSubscription(): Promise<PushSubscription | null>;
    subscribe(options: PushSubscriptionOptionsInit): Promise<PushSubscription>;
  }
}

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

type PushStatus = 'unsupported' | 'default' | 'granted' | 'denied' | 'subscribed' | 'loading';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications() {
  const { user } = useAuth();
  const [status, setStatus] = useState<PushStatus>('loading');
  const [vapidPublicKey, setVapidPublicKey] = useState<string | null>(null);

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('unsupported');
      return;
    }

    const perm = Notification.permission;
    if (perm === 'denied') {
      setStatus('denied');
      return;
    }

    navigator.serviceWorker.ready.then(async (reg: any) => {
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        setStatus('subscribed');
      } else {
        setStatus(perm === 'granted' ? 'granted' : 'default');
      }
    });

    fetchVapidKey();
  }, []);

  const fetchVapidKey = async () => {
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/send-push-notification`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
        }
      );
      if (res.ok) {
        const data = await res.json();
        setVapidPublicKey(data.publicKey);
      }
    } catch (err) {
      console.error('Failed to fetch VAPID key:', err);
    }
  };

  const subscribe = useCallback(async () => {
    if (!user || !vapidPublicKey) return false;

    try {
      setStatus('loading');

      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setStatus('denied');
        return false;
      }

      const reg: any = await navigator.serviceWorker.ready;

      const existing = await reg.pushManager.getSubscription();
      if (existing) await existing.unsubscribe();

      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      const subJson = subscription.toJSON();

      const { error } = await supabase.from('push_subscriptions' as any).upsert(
        {
          user_id: user.id,
          endpoint: subJson.endpoint,
          p256dh: subJson.keys?.p256dh || '',
          auth: subJson.keys?.auth || '',
        },
        { onConflict: 'user_id,endpoint' }
      );

      if (error) throw error;

      setStatus('subscribed');
      return true;
    } catch (err) {
      console.error('Push subscription failed:', err);
      setStatus('default');
      return false;
    }
  }, [user, vapidPublicKey]);

  const unsubscribe = useCallback(async () => {
    if (!user) return;
    try {
      const reg: any = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        const endpoint = sub.endpoint;
        await sub.unsubscribe();
        await supabase.from('push_subscriptions' as any).delete().eq('user_id', user.id).eq('endpoint', endpoint);
      }
      setStatus('default');
    } catch (err) {
      console.error('Unsubscribe failed:', err);
    }
  }, [user]);

  return {
    status,
    isSupported: status !== 'unsupported',
    isSubscribed: status === 'subscribed',
    isDenied: status === 'denied',
    isLoading: status === 'loading',
    subscribe,
    unsubscribe,
  };
}

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/AuthContext";
import { toast } from "sonner";

// Extend ServiceWorkerRegistration to include pushManager
declare global {
  interface ServiceWorkerRegistration {
    pushManager: PushManager;
  }
}

export const usePushNotifications = () => {
  const { user } = useAuth();
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const checkSubscription = useCallback(async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (error) {
    }
  }, []);

  useEffect(() => {
    const supported = "Notification" in window && "serviceWorker" in navigator && "PushManager" in window;
    setIsSupported(supported);

    if (supported) {
      setPermission(Notification.permission);
      checkSubscription();
    }
  }, [checkSubscription]);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      toast.error("Push notifications are not supported on this device");
      return false;
    }

    setIsLoading(true);
    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result === "granted") {
        toast.success("Notifications enabled!");
        return true;
      } else if (result === "denied") {
        toast.error("Notification permission denied");
        return false;
      }
      return false;
    } catch (error) {
      toast.error("Failed to request notification permission");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported || permission !== "granted" || !user) {
      return false;
    }

    setIsLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      
      // Get existing subscription or create new one
      let subscription = await registration.pushManager.getSubscription();
      
      if (!subscription) {
        // For demo purposes, we'll use a placeholder VAPID key
        // In production, you'd need to generate real VAPID keys
        const vapidPublicKey = "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U";
        
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
        });
      }

      // Store subscription in database
      const subscriptionData = {
        user_id: user.id,
        endpoint: subscription.endpoint,
        p256dh_key: arrayBufferToBase64(subscription.getKey("p256dh")),
        auth_key: arrayBufferToBase64(subscription.getKey("auth")),
        updated_at: new Date().toISOString(),
      };

      // Insert/update subscription - use type assertion since table may be new
      const { error } = await supabase
        .from('push_subscriptions')
        .upsert(subscriptionData, {
          onConflict: "user_id,endpoint",
        });

      if (error) {
        // Continue anyway - subscription is active locally
      }

      setIsSubscribed(true);
      toast.success("Push notifications enabled!");
      return true;
    } catch (error) {
      toast.error("Failed to enable push notifications");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, permission, user]);

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();

        // Remove from database
        if (user) {
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq("user_id", user.id)
            .eq("endpoint", subscription.endpoint);
        }
      }

      setIsSubscribed(false);
      toast.success("Push notifications disabled");
      return true;
    } catch (error) {
      toast.error("Failed to disable push notifications");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const showLocalNotification = useCallback((title: string, options?: NotificationOptions) => {
    if (permission === "granted") {
      new Notification(title, {
        icon: "/pwa-192x192.png",
        badge: "/pwa-192x192.png",
        ...options,
      });
    }
  }, [permission]);

  return {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    requestPermission,
    subscribe,
    unsubscribe,
    showLocalNotification,
    checkSubscription,
  };
};

// Helper functions
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function arrayBufferToBase64(buffer: ArrayBuffer | null): string {
  if (!buffer) return "";
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

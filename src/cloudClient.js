import { createClient } from "@supabase/supabase-js";

const cloudUrl = import.meta.env.VITE_SUPABASE_URL;
const cloudKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isCloudConfigured = Boolean(cloudUrl && cloudKey);

export const cloud = isCloudConfigured
  ? createClient(cloudUrl, cloudKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export function getAppUrl() {
  return new URL(import.meta.env.BASE_URL, window.location.origin).href;
}


import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!url || !anonKey) {
  throw new Error(
    "Missing Supabase env vars VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY",
  );
}

export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

export const SUPABASE_BUCKETS = {
  AVATARS: "avatars",
  DOCUMENTS: "documents",
};

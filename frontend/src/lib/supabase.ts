import { createBrowserClient } from '@supabase/ssr'

// Browser-side singleton to avoid recreating clients and aborting in-flight signals
let browserClient: ReturnType<typeof createBrowserClient> | null = null;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://asuxwdfunyfsymjhmexx.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzdXh3ZGZ1bnlmc3ltamhtZXh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzNjQ0MTIsImV4cCI6MjA4NTk0MDQxMn0.V54N2TpXBTycdk41bRTszEC4OFKHCCu4oIqyWO_r6ts';

export function createClient() {
    if (typeof window !== 'undefined') {
        if (!browserClient) {
            browserClient = createBrowserClient(
                SUPABASE_URL,
                SUPABASE_ANON_KEY,
                {
                    auth: {
                        persistSession: true,
                        autoRefreshToken: true,
                        detectSessionInUrl: true,
                    }
                }
            );
        }
        return browserClient;
    }

    return createBrowserClient(
        SUPABASE_URL,
        SUPABASE_ANON_KEY
    );
}

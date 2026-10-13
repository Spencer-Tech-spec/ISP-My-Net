import { createBrowserClient } from '@supabase/ssr'

// Browser-side singleton to avoid recreating clients and aborting in-flight signals
let browserClient: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
    if (typeof window !== 'undefined') {
        if (!browserClient) {
            const supabaseUrl = `${window.location.origin}/supabase`;
            browserClient = createBrowserClient(
                supabaseUrl,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
        process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://asuxwdfunyfsymjhmexx.supabase.co',
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
}

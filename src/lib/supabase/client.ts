import { createBrowserClient } from "@supabase/ssr";

// Lazy initialization to avoid build-time errors
let _supabase: ReturnType<typeof createBrowserClient> | null = null;

function getSupabaseClient() {
    if (_supabase) return _supabase;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

    if (!supabaseUrl || !supabaseAnonKey) {
        // Return a mock client during build time
        console.warn('Supabase credentials not found - using mock client');
        return null as any;
    }

    _supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
    return _supabase;
}

// Browser client with automatic session management
// The proxy.ts file handles server-side session refresh
export const supabase = new Proxy({} as ReturnType<typeof createBrowserClient>, {
    get(target, prop) {
        const client = getSupabaseClient();
        return client?.[prop as keyof typeof client];
    }
});

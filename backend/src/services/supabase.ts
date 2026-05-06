import dotenv from 'dotenv';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function hasUsableServiceRoleKey(): boolean {
  return (
    !!supabaseServiceKey &&
    !['ADMIN', 'your_service_role_key_here', 'your_supabase_service_role_key_here'].includes(
      supabaseServiceKey.trim()
    )
  );
}

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

export function getSupabaseClient(accessToken?: string): SupabaseClient {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY.');
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: accessToken
      ? {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      : undefined,
  });
}

export function getSupabaseAdminClient(): SupabaseClient {
  if (!supabaseUrl || !hasUsableServiceRoleKey()) {
    return getSupabaseClient();
  }

  const serviceKey = supabaseServiceKey as string;
  return createClient(supabaseUrl, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export async function getUserFromToken(accessToken: string): Promise<User> {
  const supabase = getSupabaseClient(accessToken);
  const { data, error } = await supabase.auth.getUser(accessToken);

  if (error || !data.user) {
    throw new Error('Invalid or expired login session.');
  }

  return data.user;
}

export async function requireAdmin(accessToken: string): Promise<{ user: User; supabase: SupabaseClient }> {
  const user = await getUserFromToken(accessToken);
  const supabase = hasUsableServiceRoleKey() ? getSupabaseAdminClient() : getSupabaseClient(accessToken);
  return { user, supabase };
}

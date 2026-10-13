// Self-service "delete my account" — anonymizes the caller's own profile
// and disables their ability to sign in, rather than hard-deleting the
// auth.users/profiles row.
//
// Why not a real delete: cases.user_id is ON DELETE CASCADE, so deleting
// auth.users would silently delete every published, platform-wide-visible
// case the user ever uploaded. judgments.uploaded_by, pending_cases/
// pending_judgments.submitted_by, and the audit_logs/*.deleted_by columns
// have no ON DELETE rule at all (RESTRICT), so a hard delete would simply
// fail with a foreign-key violation for any user who has ever uploaded a
// judgment, left a pending draft, or appears in an audit log — i.e. most
// real accounts. Anonymizing in place touches none of those constraints:
// the profiles row keeps the same id, so every table that references it
// keeps working exactly as it does today, just attributed to a
// "Deleted User" with no contact details and no elevated roles.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { checkRateLimitsFailOpen } from '../_shared/rateLimit.ts';
import { reportEdgeFunctionError } from '../_shared/sentry.ts';
import { buildCorsHeaders } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

function errorResponse(corsHeaders: Record<string, string>, message: string, status: number, code?: string): Response {
  return new Response(JSON.stringify({ error: message, code }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const MAX_ATTEMPTS = 3;
const WINDOW_SECONDS = 3600;

Deno.serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return errorResponse(corsHeaders, 'Method not allowed', 405);
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return errorResponse(corsHeaders, 'Missing or invalid Authorization header', 401);
  }

  // Scoped to the caller's own token — this is how we confirm someone can
  // only ever delete their own account, never anyone else's: getUser()
  // resolves to whichever identity that specific token actually belongs to.
  const callerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error: getUserError } = await callerClient.auth.getUser();
  if (getUserError || !user) {
    return errorResponse(corsHeaders, 'Invalid or expired session', 401);
  }

  const { blocked } = await checkRateLimitsFailOpen(adminClient, 'delete-account', [
    { key: `delete-account:${user.id}`, maxCount: MAX_ATTEMPTS, windowSeconds: WINDOW_SECONDS },
  ]);
  if (blocked) {
    return errorResponse(corsHeaders, 'Too many attempts. Please try again later.', 429, 'rate_limited');
  }

  // Unreachable by design — releases the real email address and gives the
  // account a password nobody (including the former owner) can know, so it
  // can never be signed into again, without relying on a separate "ban"
  // mechanism this Supabase project may not have configured.
  const anonymizedEmail = `deleted-${user.id}@repropulse.invalid`;
  const randomPassword = `${crypto.randomUUID()}${crypto.randomUUID()}`;

  try {
    const { error: authUpdateError } = await adminClient.auth.admin.updateUserById(user.id, {
      email: anonymizedEmail,
      password: randomPassword,
      email_confirm: true,
      user_metadata: {},
    });
    if (authUpdateError) throw authUpdateError;

    const { error: profileUpdateError } = await adminClient
      .from('profiles')
      .update({
        full_name: 'Deleted User',
        email: anonymizedEmail,
        phone_number: null,
        profession: null,
        organization: null,
        is_moderator: false,
        is_admin: false,
        is_scorecard_editor: false,
      })
      .eq('id', user.id);
    if (profileUpdateError) throw profileUpdateError;

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('delete-account: failed to anonymize account:', err);
    await reportEdgeFunctionError(err, { category: 'RELIABILITY', functionName: 'delete-account' });
    return errorResponse(corsHeaders, 'Failed to delete account. Please try again or contact support.', 500, 'delete_failed');
  }
});

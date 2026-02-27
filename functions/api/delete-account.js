export async function onRequestPost({ request, env }) {
  const authHeader = request.headers.get('Authorization') || '';
  if (!authHeader.startsWith('Bearer ')) {
    return json({ error: 'Unauthorized' }, 401);
  }
  const token = authHeader.slice(7);

  const SUPABASE_URL = 'https://rljivieiiphngslqzszl.supabase.co';
  const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SERVICE_KEY) {
    return json({ error: 'Server configuration error' }, 500);
  }

  // Verify token and get user ID
  const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'apikey': SERVICE_KEY,
    },
  });
  if (!userRes.ok) {
    return json({ error: 'Invalid or expired session' }, 401);
  }
  const userData = await userRes.json();
  const userId = userData.id;
  if (!userId) {
    return json({ error: 'Could not resolve user ID' }, 400);
  }

  // Delete user via admin API
  const deleteRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'apikey': SERVICE_KEY,
    },
  });
  if (!deleteRes.ok) {
    const errText = await deleteRes.text();
    return json({ error: 'Deletion failed: ' + errText }, 500);
  }

  return json({ success: true }, 200);
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

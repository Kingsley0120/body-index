/**
 * AURA SYNC — Anthropic API Proxy
 * Deploy this as a Cloudflare Worker.
 *
 * Setup (free, ~3 minutes):
 *  1. Go to https://workers.cloudflare.com  → sign up / log in
 *  2. Click "Create Worker"
 *  3. Paste this entire file into the editor, click "Deploy"
 *  4. Go to Worker Settings → Variables → add a Secret:
 *       Name:  ANTHROPIC_API_KEY
 *       Value: sk-ant-...   (your key from console.anthropic.com)
 *  5. Copy your worker URL (e.g. https://aura-proxy.YOUR-NAME.workers.dev)
 *  6. Paste it into AURA SYNC's config banner where it says "PROXY_URL"
 */

export default {
  async fetch(request, env) {

    // ── CORS pre-flight ──────────────────────────────────────
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(),
      });
    }

    // ── Only accept POST to /v1/messages ────────────────────
    const url = new URL(request.url);
    if (request.method !== 'POST' || url.pathname !== '/v1/messages') {
      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders() },
      });
    }

    // ── Validate API key is configured ──────────────────────
    const apiKey = env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: { message: 'ANTHROPIC_API_KEY secret not set on worker.' } }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders() } }
      );
    }

    // ── Forward to Anthropic ────────────────────────────────
    let body;
    try {
      body = await request.text();
    } catch (e) {
      return new Response(JSON.stringify({ error: { message: 'Failed to read request body.' } }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders() },
      });
    }

    const anthropicResp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':         'application/json',
        'x-api-key':            apiKey,
        'anthropic-version':    '2023-06-01',
      },
      body,
    });

    // Stream the response body back with CORS headers
    const respBody = await anthropicResp.text();
    return new Response(respBody, {
      status:  anthropicResp.status,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders(),
      },
    });
  },
};

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

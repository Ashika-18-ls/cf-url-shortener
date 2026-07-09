/**
 * Cloudflare Worker — URL Shortener API
 * ---------------------------------------------------------------------------
 * Routes (all under the deployed *.workers.dev domain, or a custom domain):
 *
 *   POST /api/shorten        Create a short link.  Body: { "url": "https://..." }
 *   GET  /api/stats/:code    Get click stats for a short code (JSON)
 *   GET  /:code               Redirect to the original URL (302)
 *   GET  /health              Simple health check
 *
 * Database: Cloudflare D1 (SQLite at the edge). Binding name: DB
 * (see wrangler.toml).
 * ---------------------------------------------------------------------------
 */

const CODE_LENGTH = 6;
const CODE_ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

/** Standard JSON response with CORS headers so the GitHub Pages frontend can call us. */
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

/** Handles CORS preflight requests. */
function corsPreflightResponse() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

/** Generates a random short code, e.g. "aZ3kP9". */
function generateShortCode(length = CODE_LENGTH) {
  let code = "";
  const randomValues = crypto.getRandomValues(new Uint8Array(length));
  for (let i = 0; i < length; i++) {
    code += CODE_ALPHABET[randomValues[i] % CODE_ALPHABET.length];
  }
  return code;
}

/** Validates that a string is a well-formed http/https URL. */
function isValidUrl(value) {
  if (typeof value !== "string" || value.trim().length === 0) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/** Validates a short code contains only expected characters (defends against injection / bad input). */
function isValidCode(code) {
  return typeof code === "string" && /^[A-Za-z0-9]{3,20}$/.test(code);
}

// ---------------------------------------------------------------------------
// Route handlers
// ---------------------------------------------------------------------------

/**
 * POST /api/shorten
 * Creates a new short link for the given URL and stores it in D1.
 * Retries on the rare chance of a short-code collision.
 */
async function handleShorten(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Request body must be valid JSON." }, 400);
  }

  const originalUrl = body?.url?.trim();

  if (!isValidUrl(originalUrl)) {
    return jsonResponse(
      { error: "Please provide a valid URL starting with http:// or https://" },
      400
    );
  }

  const MAX_ATTEMPTS = 5;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const shortCode = generateShortCode();
    try {
      await env.DB.prepare(
        `INSERT INTO links (short_code, original_url, clicks) VALUES (?, ?, 0)`
      )
        .bind(shortCode, originalUrl)
        .run();

      return jsonResponse(
        {
          short_code: shortCode,
          original_url: originalUrl,
        },
        201
      );
    } catch (err) {
      // SQLite unique constraint violation -> code collision, try again
      if (String(err.message).includes("UNIQUE constraint failed")) {
        continue;
      }
      console.error("D1 insert error:", err);
      return jsonResponse({ error: "Internal server error while saving the link." }, 500);
    }
  }

  return jsonResponse(
    { error: "Could not generate a unique short code. Please try again." },
    500
  );
}

/**
 * GET /:code
 * Looks up the code, increments the click counter, and redirects (302).
 */
async function handleRedirect(code, env) {
  if (!isValidCode(code)) {
    return jsonResponse({ error: "Invalid short code format." }, 400);
  }

  const row = await env.DB.prepare(
    `SELECT original_url FROM links WHERE short_code = ?`
  )
    .bind(code)
    .first();

  if (!row) {
    return jsonResponse({ error: "Short link not found." }, 404);
  }

  // Fire-and-forget click increment (doesn't block the redirect)
  await env.DB.prepare(`UPDATE links SET clicks = clicks + 1 WHERE short_code = ?`)
    .bind(code)
    .run();

  return Response.redirect(row.original_url, 302);
}

/**
 * GET /api/stats/:code
 * Returns click count and original URL for a short code.
 */
async function handleStats(code, env) {
  if (!isValidCode(code)) {
    return jsonResponse({ error: "Invalid short code format." }, 400);
  }

  const row = await env.DB.prepare(
    `SELECT short_code, original_url, clicks, created_at FROM links WHERE short_code = ?`
  )
    .bind(code)
    .first();

  if (!row) {
    return jsonResponse({ error: "Short link not found." }, 404);
  }

  return jsonResponse(row, 200);
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export default {
  /**
   * @param {Request} request
   * @param {{DB: D1Database}} env
   */
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // Handle CORS preflight for any route
    if (method === "OPTIONS") {
      return corsPreflightResponse();
    }

    // Simple health check — handy for uptime checks / smoke tests
    if (path === "/health" && method === "GET") {
      return jsonResponse({ status: "ok", timestamp: new Date().toISOString() });
    }

    if (path === "/api/shorten" && method === "POST") {
      return handleShorten(request, env);
    }

    if (path.startsWith("/api/stats/") && method === "GET") {
      const code = path.replace("/api/stats/", "");
      return handleStats(code, env);
    }

    // Any other GET /<code> is treated as a redirect lookup
    if (method === "GET" && path.length > 1 && !path.startsWith("/api/")) {
      const code = path.slice(1); // strip leading "/"
      return handleRedirect(code, env);
    }

    return jsonResponse({ error: "Route not found." }, 404);
  },
};

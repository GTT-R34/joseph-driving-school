// Receives booking-form enquiries and emails them to the business.
//
// Needs these Vercel environment variables:
//   RESEND_API_KEY   API key from resend.com
//   LEAD_TO_EMAIL    where enquiries are sent (e.g. the owner's inbox)
//   LEAD_FROM_EMAIL  optional sender, e.g. "Website <leads@yourdomain.com.au>"
//   LEAD_SIGNING_SECRET  optional; signs form tokens (falls back to RESEND_API_KEY)
//
// Until the email settings exist this returns 503, and the page offers to send
// the same details by text message instead, so no enquiry is lost.
//
// Spam protection (no CAPTCHA for real visitors):
//   GET  /api/lead  -> returns a signed, time-stamped form token
//   POST /api/lead  -> requires that token, at least MIN_FILL_MS after it was issued
//   plus: honeypot field, per-IP rate limit, duplicate-phone suppression,
//   Australian phone check and link blocking.

const crypto = require("crypto");

const MAX = 500;
const MIN_FILL_MS = 3000;            // humans take longer than 3s to fill the form
const TOKEN_TTL_MS = 2 * 60 * 60e3;  // tokens are valid for 2 hours
const RATE_WINDOW_MS = 10 * 60e3;    // 10 minutes
const RATE_MAX_PER_IP = 5;           // submissions per IP per window
const DUP_WINDOW_MS = 10 * 60e3;     // one enquiry per phone number per 10 minutes

// Best-effort memory shared by requests that reach the same warm instance.
const ipHits = new Map();
const recentPhones = new Map();

function clean(v) {
  return String(v == null ? "" : v).replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, MAX);
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function secret() {
  return process.env.LEAD_SIGNING_SECRET || process.env.RESEND_API_KEY || "";
}

function sign(ts) {
  return crypto.createHmac("sha256", secret()).update("jds-form:" + ts).digest("base64url");
}

function makeToken() {
  const ts = Date.now();
  return ts + "." + sign(ts);
}

function checkToken(token) {
  const m = /^(\d{13})\.([A-Za-z0-9_-]{20,})$/.exec(String(token || ""));
  if (!m || !secret()) return "missing";
  const ts = Number(m[1]);
  const expected = Buffer.from(sign(ts));
  const given = Buffer.from(m[2]);
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) return "bad";
  const age = Date.now() - ts;
  if (age < MIN_FILL_MS) return "too_fast";
  if (age > TOKEN_TTL_MS) return "expired";
  return "";
}

function clientIp(req) {
  const fwd = String(req.headers["x-forwarded-for"] || "");
  return (fwd.split(",")[0] || req.headers["x-real-ip"] || "unknown").trim();
}

function prune(map, windowMs, now) {
  if (map.size < 500) return;
  for (const [k, v] of map) {
    const last = Array.isArray(v) ? v[v.length - 1] : v;
    if (now - last > windowMs) map.delete(k);
  }
}

function rateLimited(ip, now) {
  prune(ipHits, RATE_WINDOW_MS, now);
  const hits = (ipHits.get(ip) || []).filter((t) => now - t < RATE_WINDOW_MS);
  hits.push(now);
  ipHits.set(ip, hits);
  return hits.length > RATE_MAX_PER_IP;
}

// Australian numbers only: returns +61XXXXXXXXX or "".
function auPhone(raw) {
  let d = String(raw || "").replace(/[^0-9+]/g, "");
  if (d.indexOf("+61") === 0) d = "0" + d.slice(3);
  else if (d.indexOf("61") === 0 && d.length === 11) d = "0" + d.slice(2);
  d = d.replace(/[^0-9]/g, "");
  return /^0[23478]\d{8}$/.test(d) ? "+61" + d.slice(1) : "";
}

const LINK_RE = /(https?:\/\/|www\.|\.(com|net|org|ru|cn|xyz|top|info)\b|<a\s|\[url)/i;

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "GET") {
    if (!secret()) return res.status(503).json({ ok: false, reason: "not_configured" });
    return res.status(200).json({ ok: true, token: makeToken() });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ ok: false });
  }

  const key = process.env.RESEND_API_KEY;
  const to = process.env.LEAD_TO_EMAIL;
  if (!key || !to) return res.status(503).json({ ok: false, reason: "not_configured" });

  const now = Date.now();
  const ip = clientIp(req);
  if (rateLimited(ip, now)) {
    console.warn("Enquiry rate-limited", { ip });
    res.setHeader("Retry-After", String(Math.ceil(RATE_WINDOW_MS / 1000)));
    return res.status(429).json({ ok: false, reason: "rate_limited" });
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }
  body = body || {};

  // Bots that fill the hidden field get a fake success, so they don't retry.
  if (clean(body.company)) {
    console.warn("Enquiry dropped: honeypot", { ip });
    return res.status(200).json({ ok: true });
  }

  const tokenProblem = checkToken(body.token);
  if (tokenProblem) {
    console.warn("Enquiry rejected: token " + tokenProblem, { ip });
    return res.status(400).json({ ok: false, reason: "token_" + tokenProblem });
  }

  const d = {
    name: clean(body.name).slice(0, 80),
    phone: clean(body.phone).slice(0, 30),
    suburb: clean(body.suburb).slice(0, 60),
    experience: clean(body.experience).slice(0, 40),
    transmission: clean(body.transmission).slice(0, 20),
    when: clean(body.when).slice(0, 20),
    message: clean(body.message),
    page: clean(body.page).slice(0, 100),
    gclid: clean(body.gclid),
    utm_campaign: clean(body.utm_campaign),
    utm_term: clean(body.utm_term)
  };

  const phone = auPhone(d.phone);
  if (!d.name || !phone) {
    return res.status(400).json({ ok: false, reason: "invalid" });
  }

  if (LINK_RE.test(d.name + " " + d.suburb + " " + d.message)) {
    console.warn("Enquiry dropped: contains link", { ip });
    return res.status(200).json({ ok: true });
  }

  // Same number again within the window: already emailed, so don't email twice.
  prune(recentPhones, DUP_WINDOW_MS, now);
  const lastForPhone = recentPhones.get(phone);
  if (lastForPhone && now - lastForPhone < DUP_WINDOW_MS) {
    return res.status(200).json({ ok: true, duplicate: true });
  }

  const rows = [
    ["Name", d.name],
    ["Phone", d.phone],
    ["Suburb", d.suburb],
    ["Experience", d.experience],
    ["Car", d.transmission],
    ["Best time", d.when],
    ["Message", d.message],
    ["Page", d.page],
    ["From Google Ads", d.gclid ? "Yes" : "No"],
    ["Search term", d.utm_term]
  ].filter((r) => r[1]);

  const text = rows.map((r) => r[0] + ": " + r[1]).join("\n");
  const html =
    "<h2>New lesson enquiry</h2><table cellpadding=\"6\">" +
    rows.map((r) => "<tr><td><b>" + r[0] + "</b></td><td>" + escapeHtml(r[1]) + "</td></tr>").join("") +
    "</table><p><a href=\"tel:" + escapeHtml(phone) + "\">Call " + escapeHtml(d.name) + "</a></p>";

  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.LEAD_FROM_EMAIL || "Joseph Driving School <onboarding@resend.dev>",
        to: to.split(",").map((s) => s.trim()).filter(Boolean),
        subject: "New lesson enquiry: " + d.name + (d.suburb ? " (" + d.suburb + ")" : ""),
        text,
        html
      })
    });
    if (!r.ok) {
      const detail = await r.text().catch(() => "");
      console.error("Resend rejected enquiry email:", r.status, detail.slice(0, 500));
      return res.status(502).json({ ok: false });
    }
    recentPhones.set(phone, now);
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error("Enquiry email request failed:", e && e.message);
    return res.status(502).json({ ok: false });
  }
};

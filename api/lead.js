// Receives booking-form enquiries and emails them to the business.
//
// Needs these Vercel environment variables:
//   RESEND_API_KEY   API key from resend.com
//   LEAD_TO_EMAIL    where enquiries are sent (e.g. the owner's inbox)
//   LEAD_FROM_EMAIL  optional sender, e.g. "Website <leads@yourdomain.com.au>"
//                    (defaults to Resend's onboarding sender)
//
// Until they are set this returns 503, and the page offers to send the
// same details by text message instead, so no enquiry is lost.

const MAX = 500;

function clean(v) {
  return String(v == null ? "" : v).replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, MAX);
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false });
  }

  const key = process.env.RESEND_API_KEY;
  const to = process.env.LEAD_TO_EMAIL;
  if (!key || !to) return res.status(503).json({ ok: false, reason: "not_configured" });

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }
  body = body || {};

  if (clean(body.company)) return res.status(200).json({ ok: true }); // honeypot

  const d = {
    name: clean(body.name),
    phone: clean(body.phone),
    suburb: clean(body.suburb),
    experience: clean(body.experience),
    transmission: clean(body.transmission),
    when: clean(body.when),
    message: clean(body.message),
    page: clean(body.page),
    gclid: clean(body.gclid),
    utm_campaign: clean(body.utm_campaign),
    utm_term: clean(body.utm_term)
  };

  if (!d.name || d.phone.replace(/[^0-9]/g, "").length < 8) {
    return res.status(400).json({ ok: false, reason: "invalid" });
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
    "</table><p><a href=\"tel:" + escapeHtml(d.phone.replace(/[^0-9+]/g, "")) + "\">Call " + escapeHtml(d.name) + "</a></p>";

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
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error("Enquiry email request failed:", e && e.message);
    return res.status(502).json({ ok: false });
  }
};

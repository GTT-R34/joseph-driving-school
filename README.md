# Joseph Driving School website

Static site for Joseph Driving School, deployed on Vercel from the `main` branch.

## Pages

| Path       | Purpose                                                   |
|------------|-----------------------------------------------------------|
| `/`        | Main website                                              |
| `/book`    | Google Ads landing page (noindex), single goal: get a lead |
| `/thanks`  | Shown after the form is sent; fires the form conversion   |
| `/privacy` | Privacy policy (required for Google Ads lead forms)       |
| `/driving-lessons/<suburb>` | Local SEO pages for key suburbs             |

## Settings

Phone number, Facebook link, WhatsApp on/off and Google Ads conversion IDs all live in
`assets/config.js`.

## Tracking

`assets/site.js` sends a Google Ads conversion for:

- `call` — any call button tapped
- `sms` — any text button tapped
- `whatsapp` — any WhatsApp button tapped (when enabled)
- `form` — booking form sent (fires once on `/thanks`)

It also keeps the `gclid` from the ad click and passes it with each enquiry.

## Enquiry emails

`api/lead.js` emails each enquiry using Resend. Set these in Vercel → Project → Settings →
Environment Variables:

- `RESEND_API_KEY`
- `LEAD_TO_EMAIL`
- `LEAD_FROM_EMAIL` (optional)

Until they're set, the form offers to send the visitor's details by text message instead.

## Suburb pages and sitemap

The suburb pages and `sitemap.xml` are generated from `scripts/build.py`. To add a suburb or
change its wording, edit the `SUBURBS` list there and run:

    python3 scripts/build.py

Commit the generated files; Vercel serves them as-is.

## Spam protection

The booking form has no CAPTCHA puzzle. `api/lead.js` instead requires:

- a signed form token from `GET /api/lead`, sent back at least 3 seconds later (blocks bots that post directly)
- an empty hidden "company" field (honeypot)
- an Australian phone number, and no links in the text fields
- at most 5 submissions per IP per 10 minutes, and one enquiry per phone number per 10 minutes

Tokens are signed with `LEAD_SIGNING_SECRET` if set, otherwise with `RESEND_API_KEY`.

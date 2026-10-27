# Joseph Driving School website

Static site for Joseph Driving School, deployed on Vercel from the `main` branch.

## Pages

| Path       | Purpose                                                   |
|------------|-----------------------------------------------------------|
| `/`        | Main website                                              |
| `/book`    | Google Ads landing page (noindex), single goal: get a lead |
| `/thanks`  | Shown after the form is sent; fires the form conversion   |
| `/privacy` | Privacy policy (required for Google Ads lead forms)       |

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

#!/usr/bin/env python3
"""Generates the suburb pages and sitemap.xml.

Run from the repo root after editing SUBURBS:  python3 scripts/build.py
The output is committed, so Vercel serves plain files with no build step.
"""
import datetime
import html
import json
import os

SITE = "https://www.josephdrivingschool.com.au"
PHONE = "0412 489 478"
TEL = "+61412489478"

SUBURBS = [
    {
        "slug": "fairfield",
        "name": "Fairfield",
        "title": "Driving Lessons Fairfield | Joseph Driving School",
        "desc": "Driving lessons in Fairfield and Fairfield West for learners of all ages. Beginner lessons, test preparation and refreshers. Call 0412 489 478.",
        "intro": "Fairfield is home. Joseph Driving School is based in Fairfield West, so lessons around Fairfield are on streets we know well.",
        "practice": "Lessons start on quieter residential streets, then move to the roads you'll actually drive on: The Horsley Drive, Hamilton Road and the Cumberland Highway. We also practise around the busy Ware Street shopping area, where pedestrians, parking cars and buses all need watching at once.",
        "nearby": ["Fairfield West", "Fairfield Heights", "Fairfield East", "Canley Vale", "Old Guildford", "Smithfield"],
        "faq": [
            ("Do you teach in Fairfield West?", "Yes. We're based in Fairfield West, so it's right in our main area."),
        ],
    },
    {
        "slug": "liverpool",
        "name": "Liverpool",
        "title": "Driving Lessons Liverpool | Joseph Driving School",
        "desc": "Driving lessons in Liverpool and nearby suburbs. Beginner lessons, driving test preparation and refreshers with a licensed instructor. Call 0412 489 478.",
        "intro": "Learning to drive in Liverpool means getting comfortable with some of Western Sydney's busiest roads. We build up to them step by step.",
        "practice": "Once the basics are solid, lessons move onto multi-lane roads like the Hume Highway, Elizabeth Drive and Hoxton Park Road, so lane changes, merging and big intersections become second nature before your test.",
        "nearby": ["Warwick Farm", "Casula", "Lurnea", "Cartwright", "Busby", "Miller", "Green Valley", "Hinchinbrook"],
        "faq": [
            ("Can you help with busy multi-lane roads?", "Yes. We practise lane changes, merging and large intersections on Liverpool's main roads once you're ready."),
        ],
    },
    {
        "slug": "blacktown",
        "name": "Blacktown",
        "title": "Driving Lessons Blacktown | Joseph Driving School",
        "desc": "Driving lessons in Blacktown for beginners, test preparation and refreshers. Learners of all ages and levels. Call Joseph Driving School on 0412 489 478.",
        "intro": "Blacktown mixes quiet suburban streets with fast arterial roads, which makes it a good place to build every skill you need for the test.",
        "practice": "We start in the side streets and work up to roads like the Great Western Highway, Richmond Road and Flushcombe Road, practising speed management, roundabouts and right turns across traffic.",
        "nearby": ["Seven Hills", "Prospect", "Doonside", "Lalor Park", "Kings Park", "Marayong", "Quakers Hill"],
        "faq": [
            ("Do you cover suburbs around Blacktown?", "Yes, including Seven Hills, Doonside and Quakers Hill. Call to check your street."),
        ],
    },
    {
        "slug": "parramatta",
        "name": "Parramatta",
        "title": "Driving Lessons Parramatta | Joseph Driving School",
        "desc": "Driving lessons in Parramatta and nearby suburbs. Build confidence in city traffic with a licensed instructor. Call Joseph Driving School on 0412 489 478.",
        "intro": "Parramatta is Sydney's second CBD, and driving here takes real confidence. Lessons help you get there calmly, at your own pace.",
        "practice": "Lessons cover city-style driving around Church Street, James Ruse Drive and the Great Western Highway: heavy traffic, frequent signals, pedestrians, and sharing the road with the light rail.",
        "nearby": ["Westmead", "North Parramatta", "Harris Park", "Rosehill", "Granville", "Merrylands"],
        "faq": [
            ("I'm nervous about city traffic. Can you help?", "Yes. We start away from the busiest streets and only move into heavier traffic when you're ready."),
        ],
    },
    {
        "slug": "cabramatta",
        "name": "Cabramatta",
        "title": "Driving Lessons Cabramatta | Joseph Driving School",
        "desc": "Driving lessons in Cabramatta, Canley Heights and nearby. Beginner lessons, test preparation and refreshers. Call Joseph Driving School on 0412 489 478.",
        "intro": "Cabramatta is just down the road from our base in Fairfield West, so it's one of the areas we teach in most.",
        "practice": "Lessons cover the busy streets around John Street, plus Cabramatta Road and the Hume Highway, with plenty of practice at parking, pedestrian crossings and roundabouts.",
        "nearby": ["Cabramatta West", "Canley Heights", "Canley Vale", "Lansvale", "Mount Pritchard", "Bonnyrigg"],
        "faq": [
            ("Is Cabramatta close to where you're based?", "Yes. We're based in nearby Fairfield West."),
        ],
    },
    {
        "slug": "wetherill-park",
        "name": "Wetherill Park",
        "title": "Driving Lessons Wetherill Park & Smithfield | Joseph Driving School",
        "desc": "Driving lessons in Wetherill Park, Smithfield, Bossley Park and Prairiewood. Learners of all ages and levels. Call Joseph Driving School on 0412 489 478.",
        "intro": "Wetherill Park and Smithfield sit right next to our base in Fairfield West, making them some of the easiest areas for us to teach in.",
        "practice": "Lessons use The Horsley Drive, Cowpasture Road and the streets around the industrial area, where you learn to share the road safely with trucks and other heavy vehicles.",
        "nearby": ["Smithfield", "Prairiewood", "Bossley Park", "Greenfield Park", "Edensor Park", "Horsley Park"],
        "faq": [
            ("Do you teach around Smithfield too?", "Yes. Smithfield, Bossley Park and Prairiewood are all close to our base."),
        ],
    },
]

HEAD_COMMON = """  <meta name="theme-color" content="#ffd400">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png">
  <link rel="manifest" href="/site.webmanifest">
  <link rel="preload" href="/assets/fonts/archivo-latin-800-normal.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="/assets/fonts/manrope-latin-400-normal.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="/assets/fonts/manrope-latin-800-normal.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="/assets/styles.css?v=e2d1b295">"""

PHONE_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/></svg>'

FORM = """        <form id="booking-form" class="form-card" novalidate>
          <h2>Request a call back</h2>
          <p class="sub">Leave your details and we'll call you to book a time.</p>
          <div class="row-2">
            <div class="field">
              <label for="f-name">Your name</label>
              <input id="f-name" name="name" autocomplete="name" required>
            </div>
            <div class="field">
              <label for="f-phone">Mobile number</label>
              <input id="f-phone" name="phone" type="tel" inputmode="tel" autocomplete="tel" required>
            </div>
          </div>
          <div class="field">
            <label for="f-suburb">Suburb</label>
            <input id="f-suburb" name="suburb" autocomplete="address-level2" value="{suburb}">
          </div>
          <div class="field">
            <fieldset>
              <legend>Driving experience</legend>
              <div class="choices">
                <label><input type="radio" name="experience" value="Never driven"><span>Never driven</span></label>
                <label><input type="radio" name="experience" value="Some practice"><span>Some practice</span></label>
                <label><input type="radio" name="experience" value="Test coming up"><span>Test coming up</span></label>
                <label><input type="radio" name="experience" value="Refresher"><span>Refresher</span></label>
              </div>
            </fieldset>
          </div>
          <div class="row-2">
            <div class="field">
              <label for="f-trans">Car</label>
              <select id="f-trans" name="transmission">
                <option value="">Not sure</option>
                <option>Automatic</option>
                <option>Manual</option>
              </select>
            </div>
            <div class="field">
              <label for="f-when">Best time to call</label>
              <select id="f-when" name="when">
                <option value="">Any time</option>
                <option>Morning</option>
                <option>Afternoon</option>
                <option>Evening</option>
              </select>
            </div>
          </div>
          <div class="hp" aria-hidden="true"><label>Company <input name="company" tabindex="-1" autocomplete="off"></label></div>
          <button class="btn btn-plate" type="submit">Request a call back</button>
          <p class="form-msg" role="status" aria-live="polite"></p>
          <div class="fallback" role="alert">
            <strong>One more tap.</strong> Send your details to us by text and we'll call you back.
            <a class="btn btn-ink" href="sms:+61412489478">Send by text</a>
          </div>
          <p class="privacy-note">We only use your details to contact you about lessons. <a href="/privacy">Privacy</a></p>
        </form>"""


def area_links(current=None):
    items = []
    for s in SUBURBS:
        if s["slug"] == current:
            continue
        items.append('<li><a href="/driving-lessons/%s">%s</a></li>' % (s["slug"], html.escape(s["name"])))
    return "".join(items)


def footer():
    return """  <footer class="site-footer">
    <div class="wrap">
      <a class="brand" href="/"><span class="plate" aria-hidden="true">L</span><span>Joseph Driving School<small>Fairfield West, NSW</small></span></a>
      <ul class="footer-links">
        <li><a href="tel:+61412489478" data-action="call" data-phone-text>0412 489 478</a></li>
        <li><a href="https://www.facebook.com/josephdrivingschool/" rel="noopener" target="_blank">Facebook</a></li>
        <li><a href="/privacy">Privacy</a></li>
      </ul>
      <nav class="footer-areas" aria-label="Areas we cover">
        <span>Driving lessons in:</span>
        <ul>%s</ul>
      </nav>
      <p class="copy">© <span data-year>2026</span> Joseph Driving School</p>
    </div>
  </footer>""" % area_links()


def suburb_page(s):
    url = "%s/driving-lessons/%s" % (SITE, s["slug"])
    name = html.escape(s["name"])
    faq_all = s["faq"] + [
        ("Do lessons count towards my logbook?", "Yes. In NSW, each one-hour lesson with a licensed driving instructor is recorded as three logbook hours, for up to ten lessons (30 hours)."),
        ("How much do lessons cost?", "Call or message us for current prices and package deals."),
    ]
    schema = [
        {
            "@context": "https://schema.org",
            "@type": "Service",
            "serviceType": "Driving lessons",
            "name": "Driving lessons in %s" % s["name"],
            "url": url,
            "provider": {"@id": SITE + "/#school"},
            "areaServed": [{"@type": "Place", "name": n + ", NSW"} for n in [s["name"]] + s["nearby"]],
        },
        {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
                {"@type": "ListItem", "position": 1, "name": "Home", "item": SITE + "/"},
                {"@type": "ListItem", "position": 2, "name": "Driving lessons in %s" % s["name"], "item": url},
            ],
        },
        {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": [
                {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in faq_all
            ],
        },
    ]
    faq_html = "\n".join(
        "          <details>\n            <summary>%s</summary>\n            <p>%s</p>\n          </details>" % (html.escape(q), html.escape(a))
        for q, a in faq_all
    )
    nearby = "".join("<li>%s</li>" % html.escape(n) for n in s["nearby"])

    return """<!doctype html>
<html lang="en-AU">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{title}</title>
  <meta name="description" content="{desc}">
  <link rel="canonical" href="{url}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Joseph Driving School">
  <meta property="og:url" content="{url}">
  <meta property="og:title" content="{title}">
  <meta property="og:description" content="{desc}">
  <meta property="og:image" content="{site}/og.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:locale" content="en_AU">
  <meta name="twitter:card" content="summary_large_image">
{head}
  <script type="application/ld+json">{schema}</script>
</head>
<body>
  <a class="skip" href="#main">Skip to content</a>

  <header class="site-header">
    <div class="wrap">
      <a class="brand" href="/">
        <span class="plate" aria-hidden="true">L</span>
        <span>Joseph Driving School<small>Fairfield West · Western Sydney</small></span>
      </a>
      <nav class="nav" aria-label="Main">
        <a href="/#lessons">Lessons</a>
        <a href="/#areas">Areas</a>
        <a href="/#faq">FAQ</a>
        <a class="btn btn-plate btn-sm" href="tel:{tel}" data-action="call">Call <span data-phone-text>{phone}</span></a>
      </nav>
    </div>
  </header>

  <main id="main">
    <nav class="crumbs wrap" aria-label="Breadcrumb"><a href="/">Home</a> <span aria-hidden="true">/</span> <span aria-current="page">Driving lessons in {name}</span></nav>

    <section class="hero">
      <div class="wrap hero-grid">
        <div>
          <span class="eyebrow"><span class="plate sm" aria-hidden="true">L</span> {name} &amp; nearby suburbs</span>
          <h1>Driving lessons in <em>{name}</em></h1>
          <p class="lede">{intro}</p>
          <div class="btn-row">
            <a class="btn btn-plate" href="tel:{tel}" data-action="call">{svg} Call <span data-phone-text>{phone}</span></a>
            <a class="btn btn-ghost" href="sms:{tel}" data-action="sms">Send a text</a>
            <a class="btn btn-ghost hidden" href="#" data-action="whatsapp">WhatsApp</a>
          </div>
          <ul class="hero-points">
            <li><span class="tick" aria-hidden="true">✓</span> Lessons for learners of all ages and levels</li>
            <li><span class="tick" aria-hidden="true">✓</span> Beginner lessons, test preparation and refreshers</li>
            <li><span class="tick" aria-hidden="true">✓</span> Each lesson counts as 3 logbook hours (NSW rules)</li>
          </ul>
        </div>
{form}
      </div>
    </section>

    <section class="alt">
      <div class="wrap prose">
        <span class="kicker">Where you'll practise</span>
        <h2>Learning to drive around {name}</h2>
        <p>{practice}</p>
        <p>Every learner is different, so your lessons follow what you need to work on, whether that's your very first drive, getting test-ready, or rebuilding confidence after time off the road.</p>
        <h3>Lessons we offer in {name}</h3>
        <ul class="tick-list">
          <li>First lessons for new learners</li>
          <li>Driving test preparation</li>
          <li>Driving test package (ask when you book)</li>
          <li>Refresher lessons</li>
          <li>Lessons for overseas licence holders</li>
        </ul>
      </div>
    </section>

    <section>
      <div class="wrap">
        <div class="section-head">
          <span class="kicker">Nearby</span>
          <h2>Also covering suburbs near {name}</h2>
        </div>
        <ul class="areas">{nearby}</ul>
        <p class="areas-note">See also: </p>
        <ul class="areas linked">{others}</ul>
      </div>
    </section>

    <section class="alt">
      <div class="wrap">
        <div class="section-head">
          <span class="kicker">FAQ</span>
          <h2>Questions about lessons in {name}</h2>
        </div>
        <div class="faq">
{faq}
        </div>
      </div>
    </section>

    <div class="cta-band">
      <div class="wrap">
        <h2>Book a driving lesson in {name}.</h2>
        <div class="btn-row">
          <a class="btn btn-ink" href="tel:{tel}" data-action="call">Call <span data-phone-text>{phone}</span></a>
          <a class="btn btn-ghost" href="#booking-form">Request a call back</a>
        </div>
      </div>
    </div>
  </main>

{footer}

  <div class="mobile-bar">
    <a class="btn btn-plate" href="tel:{tel}" data-action="call">Call now</a>
    <a class="btn btn-ink" href="#booking-form">Call back</a>
  </div>

  <script src="/assets/config.js?v=e2d1b295"></script>
  <script src="/assets/site.js?v=e2d1b295" defer></script>
</body>
</html>
""".format(
        title=html.escape(s["title"]),
        desc=html.escape(s["desc"]),
        url=url,
        site=SITE,
        head=HEAD_COMMON,
        schema=json.dumps(schema, ensure_ascii=False),
        name=name,
        intro=html.escape(s["intro"]),
        practice=html.escape(s["practice"]),
        tel=TEL,
        phone=PHONE,
        svg=PHONE_SVG,
        form=FORM.replace("{suburb}", name),
        nearby=nearby,
        others=area_links(s["slug"]),
        faq=faq_html,
        footer=footer(),
    )


def sitemap():
    today = datetime.date.today().isoformat()
    urls = [(SITE + "/", "1.0")]
    urls += [("%s/driving-lessons/%s" % (SITE, s["slug"]), "0.8") for s in SUBURBS]
    urls += [(SITE + "/privacy", "0.2")]
    body = "\n".join(
        "  <url><loc>%s</loc><lastmod>%s</lastmod><priority>%s</priority></url>" % (u, today, p) for u, p in urls
    )
    return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n%s\n</urlset>\n' % body


def stamp_assets(root):
    """Adds ?v=<hash> to CSS/JS links on every page so phones pick up changes at once."""
    import glob, hashlib, re
    h = hashlib.sha1()
    for f in ("assets/styles.css", "assets/site.js", "assets/config.js"):
        with open(os.path.join(root, f), "rb") as fh:
            h.update(fh.read())
    v = h.hexdigest()[:8]
    pages = glob.glob(os.path.join(root, "**", "*.html"), recursive=True)
    for p in pages:
        if os.sep + "node_modules" + os.sep in p:
            continue
        with open(p, encoding="utf-8") as fh:
            s = fh.read()
        s2 = re.sub(r'/assets/(styles\.css|site\.js|config\.js)(\?v=[0-9a-f]+)?"', lambda m: '/assets/%s?v=%s"' % (m.group(1), v), s)
        if s2 != s:
            with open(p, "w", encoding="utf-8") as fh:
                fh.write(s2)
    return v


def main():
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    for s in SUBURBS:
        d = os.path.join(root, "driving-lessons", s["slug"])
        os.makedirs(d, exist_ok=True)
        with open(os.path.join(d, "index.html"), "w", encoding="utf-8") as f:
            f.write(suburb_page(s))
    with open(os.path.join(root, "sitemap.xml"), "w", encoding="utf-8") as f:
        f.write(sitemap())
    v = stamp_assets(root)
    print("Built %d suburb pages and sitemap.xml (assets v=%s)" % (len(SUBURBS), v))


if __name__ == "__main__":
    main()

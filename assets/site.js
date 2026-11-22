(function () {
  "use strict";

  var cfg = window.JDS || {};
  var ads = cfg.googleAds || {};
  var labels = ads.labels || {};

  /* ---------- Safe session storage ---------- */
  function ssGet(k) { try { return window.sessionStorage.getItem(k); } catch (e) { return null; } }
  function ssSet(k, v) { try { window.sessionStorage.setItem(k, v); } catch (e) {} }
  function ssDel(k) { try { window.sessionStorage.removeItem(k); } catch (e) {} }

  /* ---------- PostHog analytics (loads after the page is ready) ---------- */
  var ph = cfg.posthog || {};
  if (ph.key) {
    !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="capture identify alias people.set people.set_once set_config register register_once unregister opt_out_capturing has_opted_out_capturing opt_in_capturing reset isFeatureEnabled onFeatureFlags getFeatureFlag getFeatureFlagPayload reloadFeatureFlags group getActiveMatchingSurveys getSurveys onSessionId".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
    var startPosthog = function () {
      window.posthog.init(ph.key, {
        api_host: ph.host || "https://eu.i.posthog.com",
        person_profiles: "identified_only",
        capture_pageview: true,
        capture_pageleave: true,
        autocapture: true,
        disable_session_recording: true
      });
    };
    if (document.readyState === "complete") setTimeout(startPosthog, 0);
    else window.addEventListener("load", function () { setTimeout(startPosthog, 0); });
  }
  function phCapture(name, props) {
    try { if (window.posthog && window.posthog.capture) window.posthog.capture(name, props || {}); } catch (e) {}
  }

  /* ---------- Google Ads tag ---------- */
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };

  if (ads.id) {
    var s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(ads.id);
    document.head.appendChild(s);
    window.gtag("js", new Date());
    window.gtag("config", ads.id);
  }

  function track(kind) {
    window.dataLayer.push({ event: "jds_" + kind });
    phCapture(kind === "form" ? "lead_submitted" : "contact_click", kind === "form" ? {} : { method: kind });
    if (ads.id && labels[kind]) {
      window.gtag("event", "conversion", { send_to: ads.id + "/" + labels[kind] });
    }
  }

  /* ---------- Keep the ad click id for attribution ---------- */
  var params = new URLSearchParams(window.location.search);
  ["gclid", "gbraid", "wbraid", "utm_source", "utm_medium", "utm_campaign", "utm_term"].forEach(function (k) {
    var v = params.get(k);
    if (v) ssSet("jds_" + k, v);
  });
  // Remember the site that sent the visitor (first page only).
  try {
    if (!ssGet("jds_ref") && document.referrer) {
      var refHost = new URL(document.referrer).hostname.replace(/^www\./, "");
      if (refHost && refHost !== window.location.hostname.replace(/^www\./, "")) ssSet("jds_ref", refHost);
    }
  } catch (e) {}

  /* ---------- Contact links ---------- */
  var phone = cfg.phoneE164 || "+61412489478";
  var waNumber = phone.replace(/[^0-9]/g, "");

  function smsHref(body) {
    return "sms:" + phone + (body ? "?&body=" + encodeURIComponent(body) : "");
  }
  function waHref(body) {
    return "https://wa.me/" + waNumber + (body ? "?text=" + encodeURIComponent(body) : "");
  }

  var defaultText = "Hi, I'd like to book a driving lesson with " + (cfg.businessName || "Joseph Driving School") + ".";

  document.querySelectorAll("[data-action]").forEach(function (el) {
    var kind = el.getAttribute("data-action");
    if (kind === "call") el.setAttribute("href", "tel:" + phone);
    if (kind === "sms") el.setAttribute("href", smsHref(defaultText));
    if (kind === "whatsapp") {
      if (!cfg.whatsappEnabled) return;
      el.classList.remove("hidden");
      el.setAttribute("href", waHref(defaultText));
      el.setAttribute("target", "_blank");
      el.setAttribute("rel", "noopener");
    }
    el.addEventListener("click", function () { track(kind); });
  });

  document.querySelectorAll("[data-phone-text]").forEach(function (el) {
    el.textContent = cfg.phoneDisplay || "0412 489 478";
  });

  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = String(new Date().getFullYear());
  });

  /* ---------- Thank-you page conversion ---------- */
  if (document.body.hasAttribute("data-thanks") && ssGet("jds_lead") === "1") {
    ssDel("jds_lead");
    // Enhanced conversions: the Google tag hashes this before it leaves the browser.
    var leadPhone = ssGet("jds_lead_phone");
    ssDel("jds_lead_phone");
    if (ads.id && leadPhone) window.gtag("set", "user_data", { phone_number: leadPhone });
    track("form");
  }

  function toE164(raw) {
    var d = String(raw || "").replace(/[^0-9+]/g, "");
    if (d.indexOf("+") === 0) return d;
    d = d.replace(/[^0-9]/g, "");
    if (d.indexOf("61") === 0 && d.length >= 11) return "+" + d;
    if (d.indexOf("0") === 0 && d.length === 10) return "+61" + d.slice(1);
    return "";
  }

  /* ---------- Booking form ---------- */
  var form = document.getElementById("booking-form");
  if (!form) return;

  // Nearby-suburb chips: fill in the suburb, then scroll to the form.
  document.querySelectorAll("a[data-suburb]").forEach(function (a) {
    a.addEventListener("click", function () {
      var field = form.elements.suburb;
      if (field) field.value = a.getAttribute("data-suburb");
    });
  });

  var msg = form.querySelector(".form-msg");
  var fallback = form.querySelector(".fallback");
  var submitBtn = form.querySelector("button[type=submit]");

  // Spam protection: a signed, time-stamped token from the server must come back
  // with the enquiry. Bots that post straight to the endpoint don't have one.
  var formToken = "";
  var tokenAt = 0;
  function getToken() {
    return fetch("/api/lead", { cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        if (j && j.token) { formToken = j.token; tokenAt = Date.now(); }
        return formToken;
      })
      .catch(function () { return formToken; });
  }
  getToken();

  function readyToken() {
    // Refresh tokens older than 90 minutes, and keep at least 3.5s between
    // issuing the token and sending the form (the server rejects faster posts).
    var p = (!formToken || Date.now() - tokenAt > 90 * 60e3) ? getToken() : Promise.resolve(formToken);
    return p.then(function (t) {
      var wait = tokenAt ? 3500 - (Date.now() - tokenAt) : 0;
      return wait > 0 ? new Promise(function (r) { setTimeout(function () { r(t); }, wait); }) : t;
    });
  }

  function value(name) {
    var el = form.elements[name];
    if (!el) return "";
    if (el instanceof RadioNodeList) return el.value || "";
    return (el.value || "").trim();
  }

  function leadText(d) {
    var lines = ["New lesson enquiry (website)", "Name: " + d.name, "Phone: " + d.phone];
    if (d.suburb) lines.push("Suburb: " + d.suburb);
    if (d.transmission) lines.push("Car: " + d.transmission);
    if (d.experience) lines.push("Experience: " + d.experience);
    if (d.when) lines.push("Best time: " + d.when);
    if (d.message) lines.push("Note: " + d.message);
    return lines.join("\n");
  }

  function showError(text) {
    msg.textContent = text;
    msg.className = "form-msg err";
  }

  function goThanks() {
    ssSet("jds_lead", "1");
    window.location.href = "/thanks";
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    msg.textContent = "";
    msg.className = "form-msg";

    if (value("company")) return; // honeypot

    var data = {
      name: value("name"),
      phone: value("phone"),
      suburb: value("suburb"),
      transmission: value("transmission"),
      experience: value("experience"),
      when: value("when"),
      message: value("message"),
      page: window.location.pathname,
      gclid: ssGet("jds_gclid") || "",
      gbraid: ssGet("jds_gbraid") || "",
      wbraid: ssGet("jds_wbraid") || "",
      utm_source: ssGet("jds_utm_source") || "",
      utm_medium: ssGet("jds_utm_medium") || "",
      ref: ssGet("jds_ref") || "",
      utm_campaign: ssGet("jds_utm_campaign") || "",
      utm_term: ssGet("jds_utm_term") || ""
    };

    if (!data.name) { showError("Please add your name."); form.elements.name.focus(); return; }
    var e164 = toE164(data.phone);
    if (!/^\+61[23478]\d{8}$/.test(e164)) {
      showError("Please enter an Australian phone number, e.g. 0412 345 678.");
      form.elements.phone.focus();
      return;
    }
    ssSet("jds_lead_phone", e164);

    submitBtn.disabled = true;
    submitBtn.textContent = "Sending…";

    readyToken()
      .then(function (token) {
        data.token = token;
        return fetch("/api/lead", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data)
        });
      })
      .then(function (res) { return res.ok ? goThanks() : Promise.reject(res.status); })
      .catch(function () {
        // Online delivery isn't available: let the visitor send the same details by text.
        submitBtn.disabled = false;
        submitBtn.textContent = "Request a call back";
        var link = fallback.querySelector("a");
        link.setAttribute("href", smsHref(leadText(data)));
        fallback.classList.add("show");
        link.focus();
      });
  });

  if (fallback) {
    var fbLink = fallback.querySelector("a");
    fbLink.addEventListener("click", function () {
      // Counted once, as a form lead, on the thank-you page.
      setTimeout(goThanks, 900);
    });
  }
})();

(function () {
  "use strict";

  var cfg = window.JDS || {};
  var ads = cfg.googleAds || {};
  var labels = ads.labels || {};

  /* ---------- Safe session storage ---------- */
  function ssGet(k) { try { return window.sessionStorage.getItem(k); } catch (e) { return null; } }
  function ssSet(k, v) { try { window.sessionStorage.setItem(k, v); } catch (e) {} }
  function ssDel(k) { try { window.sessionStorage.removeItem(k); } catch (e) {} }

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
    track("form");
  }

  /* ---------- Booking form ---------- */
  var form = document.getElementById("booking-form");
  if (!form) return;

  var msg = form.querySelector(".form-msg");
  var fallback = form.querySelector(".fallback");
  var submitBtn = form.querySelector("button[type=submit]");

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
      utm_campaign: ssGet("jds_utm_campaign") || "",
      utm_term: ssGet("jds_utm_term") || ""
    };

    if (!data.name) { showError("Please add your name."); form.elements.name.focus(); return; }
    var digits = data.phone.replace(/[^0-9]/g, "");
    if (digits.length < 8) { showError("Please add a phone number we can call you on."); form.elements.phone.focus(); return; }

    submitBtn.disabled = true;
    submitBtn.textContent = "Sending…";

    fetch("/api/lead", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
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

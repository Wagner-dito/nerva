(function () {
  var script = document.currentScript;
  if (!script) return;

  var botId = script.getAttribute("data-bot-id");
  if (!botId) {
    console.error("[Nerva] Missing data-bot-id on <script> tag.");
    return;
  }

  var host;
  try {
    host = new URL(script.src).origin;
  } catch (e) {
    console.error("[Nerva] Could not derive host from script src.");
    return;
  }

  // Visitor id — persistent across sessions.
  var VISITOR_KEY = "nerva_visitor_id";
  var visitorId;
  try {
    visitorId = localStorage.getItem(VISITOR_KEY);
  } catch (_) {}
  if (!visitorId) {
    visitorId =
      "v-" +
      Math.random().toString(36).slice(2, 10) +
      Date.now().toString(36);
    try {
      localStorage.setItem(VISITOR_KEY, visitorId);
    } catch (_) {}
  }

  // Traffic source — capture on landing, persist so follow-up visits keep attribution.
  var TRACKING_KEY = "nerva_tracking";
  var stored = null;
  try {
    stored = JSON.parse(localStorage.getItem(TRACKING_KEY) || "null");
  } catch (_) {}

  var currentParams = new URLSearchParams(window.location.search);
  var newUtms = {
    utm_source: currentParams.get("utm_source"),
    utm_medium: currentParams.get("utm_medium"),
    utm_campaign: currentParams.get("utm_campaign"),
  };
  var hasNewUtms =
    newUtms.utm_source || newUtms.utm_medium || newUtms.utm_campaign;

  var tracking = hasNewUtms
    ? newUtms
    : stored || { utm_source: null, utm_medium: null, utm_campaign: null };

  tracking.source_url = clip(window.location.href, 500);
  tracking.referrer = clip(document.referrer || null, 500);

  try {
    localStorage.setItem(TRACKING_KEY, JSON.stringify(tracking));
  } catch (_) {}

  var CLOSED = { w: 96, h: 96 };

  function clip(s, max) {
    if (!s) return null;
    return s.length > max ? s.slice(0, max) : s;
  }

  function mount() {
    if (document.getElementById("nerva-widget-iframe")) return;

    var qs = new URLSearchParams();
    qs.set("v", visitorId);
    if (tracking.source_url) qs.set("u", tracking.source_url);
    if (tracking.referrer) qs.set("r", tracking.referrer);
    if (tracking.utm_source) qs.set("us", tracking.utm_source);
    if (tracking.utm_medium) qs.set("um", tracking.utm_medium);
    if (tracking.utm_campaign) qs.set("uc", tracking.utm_campaign);

    var iframe = document.createElement("iframe");
    iframe.id = "nerva-widget-iframe";
    iframe.src =
      host + "/widget/" + encodeURIComponent(botId) + "?" + qs.toString();
    iframe.allow = "clipboard-write";
    iframe.title = "Nerva chat";
    iframe.style.cssText = [
      "position:fixed",
      "bottom:0",
      "right:0",
      "width:" + CLOSED.w + "px",
      "height:" + CLOSED.h + "px",
      "border:0",
      "background:transparent",
      "color-scheme:normal",
      "z-index:2147483647",
      "transition:width 180ms ease, height 180ms ease",
    ].join(";");

    document.body.appendChild(iframe);

    window.addEventListener("message", function (evt) {
      if (evt.origin !== host) return;
      var data = evt.data;
      if (!data || data.source !== "nerva") return;
      if (data.type === "resize") {
        var w = Math.max(40, Math.min(1200, Number(data.width) || CLOSED.w));
        var h = Math.max(40, Math.min(1200, Number(data.height) || CLOSED.h));
        iframe.style.width = w + "px";
        iframe.style.height = h + "px";
      } else if (data.type === "configure") {
        if (data.position === "left") {
          iframe.style.right = "auto";
          iframe.style.left = "0";
        } else {
          iframe.style.left = "auto";
          iframe.style.right = "0";
        }
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
})();

const API_KEY  = "aea3f826788513ec5eaa86686454d9f5";          // ← Replace with your key
const BASE_URL = "https://api.openweathermap.org/data/2.5";
const STORAGE_KEY = "skyvault_recent";
const MAX_RECENT  = 7;

// ── State ──────────────────────────────────────────────────────
let currentTempC  = null;   // raw °C value for toggle
let isCelsius     = true;
let activeWeather = null;   // last fetched weather data

// ── DOM ────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const cityInput      = $("cityInput");
const searchBtn      = $("searchBtn");
const locationBtn    = $("locationBtn");
const recentDropdown = $("recentDropdown");
const recentList     = $("recentList");
const clearRecent    = $("clearRecent");
const alertBanner    = $("alertBanner");
const alertText      = $("alertText");
const alertIcon      = $("alertIcon");
const errorToast     = $("errorToast");
const inlineError    = $("inlineError");
const hintSection    = $("hintSection");
const loaderSection  = $("loaderSection");
const weatherContent = $("weatherContent");
const btnC           = $("btnC");
const btnF           = $("btnF");
const starsLayer     = $("starsLayer");

// ── Build stars ────────────────────────────────────────────────
(function buildStars() {
  for (let i = 0; i < 80; i++) {
    const s = document.createElement("div");
    s.className = "star";
    const sz = Math.random() * 2 + 1;
    s.style.cssText = `width:${sz}px;height:${sz}px;top:${Math.random()*100}%;left:${Math.random()*100}%;--d:${(Math.random()*3+2).toFixed(1)}s;animation-delay:-${(Math.random()*5).toFixed(1)}s;`;
    starsLayer.appendChild(s);
  }
})();

// ── Live clock ─────────────────────────────────────────────────
(function clock() {
  const el = $("liveClock");
  const tick = () => {
    const n = new Date();
    el.innerHTML = n.toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"})
      + "<br>" + n.toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"});
  };
  tick(); setInterval(tick, 10000);
})();

// ═══════════════════════════════════════════════════════════════
// RECENT CITIES  (sessionStorage)
// Storage format: [{ name: "London", ts: 1713000000000 }, …]
// ═══════════════════════════════════════════════════════════════

/* ── Read / Write ── */
function getRecent() {
  try { return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "[]"); }
  catch { return []; }
}

function addRecent(cityName) {
  let list = getRecent();
  // Remove any existing entry for this city (case-insensitive, avoid duplicates)
  list = list.filter(e => e.name.toLowerCase() !== cityName.toLowerCase());
  // Prepend with current timestamp
  list.unshift({ name: cityName, ts: Date.now() });
  // Keep only MAX_RECENT entries
  if (list.length > MAX_RECENT) list = list.slice(0, MAX_RECENT);
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

function removeRecentByName(cityName) {
  const list = getRecent().filter(e => e.name.toLowerCase() !== cityName.toLowerCase());
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

/* ── Relative timestamp label ── */
function relativeTime(ts) {
  const diff = Date.now() - ts;
  const min  = Math.floor(diff / 60000);
  const hr   = Math.floor(diff / 3600000);
  if (min < 1)  return "just now";
  if (min < 60) return `${min}m ago`;
  if (hr  < 24) return `${hr}h ago`;
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/* ── Keyboard-navigation state ── */
let kbIndex = -1;
function kbItems() { return Array.from(recentList.querySelectorAll(".recent-item")); }
function kbHighlight(idx) {
  kbItems().forEach((el, i) => el.classList.toggle("kbd-focus", i === idx));
  kbIndex = idx;
}

/* ── Build & display dropdown ── */
function showDropdown(entries) {
  kbIndex = -1;
  recentList.innerHTML = "";

  if (!entries.length) {
    recentList.innerHTML = `<div class="dd-empty">No matches in recent searches</div>`;
    $("ddCount").textContent = getRecent().length;
    recentDropdown.style.display = "block";
    return;
  }

  // Count badge always shows total saved, not filtered
  $("ddCount").textContent = getRecent().length;

  entries.forEach(entry => {
    const cityName = typeof entry === "string" ? entry : entry.name;
    const ts       = typeof entry === "object"  ? entry.ts  : null;

    const item = document.createElement("div");
    item.className = "recent-item";
    item.setAttribute("role", "option");
    item.dataset.city = cityName;

    item.innerHTML = `
      <div class="ri-icon">🕐</div>
      <div class="ri-body">
        <div class="ri-name">${escapeHtml(cityName)}</div>
        ${ts ? `<div class="ri-meta">${relativeTime(ts)}</div>` : ""}
      </div>
      <span class="ri-rm" data-rm="${escapeHtml(cityName)}" title="Remove">✕</span>`;

    // mousedown keeps focus on input while still acting
    item.addEventListener("mousedown", e => {
      if (e.target.dataset.rm) {
        // ✕ clicked — remove this city
        e.preventDefault();
        e.stopPropagation();
        removeRecentByName(e.target.dataset.rm);
        const remaining = getRecent();
        if (remaining.length) showDropdown(remaining);
        else closeDropdown();
        return;
      }
      e.preventDefault();    // don't blur the input
      selectCity(cityName);
    });

    recentList.appendChild(item);
  });

  recentDropdown.style.display = "block";
}

/* ── Close dropdown ── */
function closeDropdown() {
  recentDropdown.style.display = "none";
  kbIndex = -1;
}

/* ── Select city from dropdown → fetch weather ── */
function selectCity(cityName) {
  cityInput.value = cityName;
  closeDropdown();
  clearInlineError();
  fetchByCity(cityName);
}

/* ── Refresh dropdown, with optional text filter ── */
function refreshDropdown(filter = "") {
  const all = getRecent();
  if (!all.length) { closeDropdown(); return; }
  const shown = filter
    ? all.filter(e => e.name.toLowerCase().includes(filter.toLowerCase()))
    : all;
  showDropdown(shown);
}

// ═══════════════════════════════════════════════════════════════
// EVENT LISTENERS
// ═══════════════════════════════════════════════════════════════

// Search button click
searchBtn.addEventListener("click", () => {
  const city = cityInput.value.trim();
  if (!validateCityInput(city)) return;
  closeDropdown();
  fetchByCity(city);
});

// Keyboard events on the input (Enter, arrows, Escape)
cityInput.addEventListener("keydown", e => {
  const items = kbItems();

  if (e.key === "ArrowDown") {
    e.preventDefault();
    if (recentDropdown.style.display === "none") refreshDropdown();
    kbHighlight(Math.min(kbIndex + 1, items.length - 1));
    return;
  }
  if (e.key === "ArrowUp") {
    e.preventDefault();
    kbHighlight(Math.max(kbIndex - 1, 0));
    return;
  }
  if (e.key === "Enter") {
    if (kbIndex >= 0 && items[kbIndex]) {
      e.preventDefault();
      selectCity(items[kbIndex].dataset.city);
    } else {
      const city = cityInput.value.trim();
      if (!validateCityInput(city)) return;
      closeDropdown();
      fetchByCity(city);
    }
    return;
  }
  if (e.key === "Escape") {
    closeDropdown();
    return;
  }
});

// Open dropdown on focus (if history exists)
cityInput.addEventListener("focus", () => {
  if (getRecent().length) refreshDropdown(cityInput.value.trim());
});

// Live-filter dropdown as user types
cityInput.addEventListener("input", () => {
  clearInlineError();
  refreshDropdown(cityInput.value.trim());
});

// Locate button
locationBtn.addEventListener("click", () => {
  clearInlineError();
  closeDropdown();
  if (!navigator.geolocation) {
    toastInfo("Your browser does not support geolocation. Search by city name instead.", "Not Supported");
    showErrorModal("geolocation_unavailable",
      "Geolocation is not supported by your browser. Search by city name instead.", null);
    return;
  }
  showLoader();
  navigator.geolocation.getCurrentPosition(
    pos => fetchByCoords(pos.coords.latitude, pos.coords.longitude),
    err => {
      showHint();
      // Map GeolocationPositionError codes to our error keys
      const geoKeys = {
        1: "geolocation_denied",
        2: "geolocation_unavailable",
        3: "geolocation_timeout"
      };
      const geoMessages = {
        1: "Location access was denied. Allow it in your browser settings or search by city.",
        2: "Your location could not be determined. Try searching by city name.",
        3: "Location request timed out. Move to an open area or search by city name."
      };
      const key = geoKeys[err.code] || "unknown";
      const msg = geoMessages[err.code] || "Location failed for an unknown reason.";
      toastWarning(msg, ERROR_CONFIGS[key]?.title);
      showErrorModal(key, msg, null);
    },
    { timeout: 10000, maximumAge: 60000 }
  );
});

// Dismiss weather alert banner
document.getElementById("alertClose").addEventListener("click", () => {
  alertBanner.style.display = "none";
});

// Clear all recent searches
clearRecent.addEventListener("click", e => {
  e.stopPropagation();
  sessionStorage.removeItem(STORAGE_KEY);
  closeDropdown();
});
clearRecent.addEventListener("keydown", e => {
  if (e.key === "Enter" || e.key === " ") { e.preventDefault(); clearRecent.click(); }
});

// Close dropdown when clicking outside the search area
document.addEventListener("mousedown", e => {
  if (!e.target.closest(".search-area")) closeDropdown();
});

// Temperature unit toggle (°C / °F) — only affects today's temperature
btnC.addEventListener("click", () => {
  if (isCelsius) return;
  isCelsius = true;
  btnC.classList.add("active");
  btnF.classList.remove("active");
  updateTempDisplay();
});

btnF.addEventListener("click", () => {
  if (!isCelsius) return;
  isCelsius = false;
  btnF.classList.add("active");
  btnC.classList.remove("active");
  updateTempDisplay();
});

// ═══════════════════════════════════════════════════════════════
// INPUT VALIDATION
// ═══════════════════════════════════════════════════════════════
// API FETCH
// ═══════════════════════════════════════════════════════════════
async function fetchByCity(city) {
  showLoader();
  closeDropdown();
  clearInlineError();

  // Pre-flight: check connectivity
  if (!navigator.onLine) {
    showHint();
    showInlineError("No internet connection. Please check your network.");
    showErrorModal("network_error",
      "You appear to be offline. Connect to the internet and try again.",
      () => fetchByCity(city));
    return;
  }

  try {
    const [cRes, fRes] = await Promise.all([
      fetch(`${BASE_URL}/weather?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric`),
      fetch(`${BASE_URL}/forecast?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric`)
    ]);

    if (!cRes.ok) {
      const errBody = await cRes.json().catch(() => ({}));
      const errKey  = classifyError(cRes.status, errBody.message);

      // For user-facing messages
      const messages = {
        city_not_found:  `"${city}" could not be found. Check the spelling or try a nearby city.`,
        invalid_api_key: "Your API key is missing or invalid. Update it in app.js.",
        rate_limited:    "You've hit the API rate limit (60 calls/min). Wait a moment.",
        server_error:    `OpenWeatherMap returned a server error (${cRes.status}). Try again.`,
        unknown:         errBody.message || `Unexpected error (status ${cRes.status}).`
      };

      const msg = messages[errKey] || messages.unknown;
      showHint();
      showInlineError(msg);
      toastError(msg, ERROR_CONFIGS[errKey]?.title);

      // Show modal for hard errors that need user action
      if (["city_not_found","invalid_api_key","rate_limited","server_error"].includes(errKey)) {
        showErrorModal(errKey, msg, errKey !== "invalid_api_key" ? () => fetchByCity(city) : null);
      }
      return;
    }

    if (!fRes.ok) {
      toastWarning("Forecast data unavailable, showing current weather only.", "Partial Data");
    }

    const [cur, fore] = [await cRes.json(), await fRes.json()];

    if (!cur || !cur.main) {
      showHint();
      showErrorModal("empty_response", "The API returned an empty response.", () => fetchByCity(city));
      return;
    }

    addRecent(cur.name);
    render(cur, fore);
    toastSuccess(`Weather loaded for ${cur.name}, ${cur.sys.country}`, "Done");

  } catch (e) {
    showHint();
    const isNetErr = e instanceof TypeError && e.message.includes("fetch");
    const errKey   = isNetErr ? "network_error" : "unknown";
    const msg      = isNetErr
      ? "Network request failed. Check your internet connection."
      : (e.message || "An unexpected error occurred.");

    showInlineError(msg);
    toastError(msg, ERROR_CONFIGS[errKey]?.title);
    showErrorModal(errKey, msg, () => fetchByCity(city));
  }
}

async function fetchByCoords(lat, lon) {
  if (!navigator.onLine) {
    showHint();
    showErrorModal("network_error",
      "No internet connection. Please check your network.",
      () => fetchByCoords(lat, lon));
    return;
  }
  try {
    const [cRes, fRes] = await Promise.all([
      fetch(`${BASE_URL}/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`),
      fetch(`${BASE_URL}/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`)
    ]);

    if (!cRes.ok) {
      const errKey = classifyError(cRes.status);
      const msg    = `Could not load weather for your location (${cRes.status}).`;
      showHint();
      toastError(msg, ERROR_CONFIGS[errKey]?.title);
      showErrorModal(errKey, msg, () => fetchByCoords(lat, lon));
      return;
    }

    const [cur, fore] = [await cRes.json(), await fRes.json()];
    addRecent(cur.name);
    render(cur, fore);
    toastSuccess(`Location weather loaded: ${cur.name}`, "Done");

  } catch (e) {
    showHint();
    const msg = "Failed to fetch weather for your location.";
    toastError(msg);
    showErrorModal("network_error", msg, () => fetchByCoords(lat, lon));
  }
}

// ═══════════════════════════════════════════════════════════════
// RENDER
// ═══════════════════════════════════════════════════════════════
function render(cur, fore) {
  activeWeather = cur;
  currentTempC  = cur.main.temp;
  isCelsius     = true;
  btnC.classList.add("active");
  btnF.classList.remove("active");

  // City info
  set("cityName",      cur.name);
  set("countryBadge",  cur.sys.country);
  set("conditionBadge", cur.weather[0].description);
  set("humidity",      cur.main.humidity + "%");
  set("wind",          cur.wind.speed.toFixed(1) + " m/s");
  set("visibility",    cur.visibility ? (cur.visibility / 1000).toFixed(1) + " km" : "N/A");
  set("pressure",      cur.main.pressure + " hPa");
  set("tempHigh",      Math.round(cur.main.temp_max) + "°C");
  set("tempLow",       Math.round(cur.main.temp_min) + "°C");
  set("coords",        `${cur.coord.lat.toFixed(4)}°N, ${cur.coord.lon.toFixed(4)}°E`);

  // Temperature (°C default)
  updateTempDisplay();

  // Feels like
  set("feelsLike", Math.round(cur.main.feels_like) + "°C");

  // Weather icon
  const icon = $("weatherIcon");
  icon.src = `https://openweathermap.org/img/wn/${cur.weather[0].icon}@2x.png`;
  icon.alt = cur.weather[0].description;

  // Local date/time
  const localMs   = (Date.now() / 1000 + cur.timezone) * 1000;
  const localDate = new Date(localMs);
  set("localDateTime",
    localDate.toUTCString().replace(" GMT", "").slice(5, -3) + " (local time)");

  // Bars
  const hum = cur.main.humidity;
  const cld = cur.clouds?.all ?? 0;
  const spd = Math.min(cur.wind.speed, 30);
  $("cloudinessBar").style.width  = cld + "%";
  $("humidityBarEl").style.width  = hum + "%";
  $("windBar").style.width        = (spd / 30 * 100) + "%";
  set("cloudiness",  cld + "%");
  set("humidityBar2", hum + "%");
  set("windForce",    spd.toFixed(1) + " m/s");

  // Sun tracker
  const srMs  = (cur.sys.sunrise + cur.timezone) * 1000;
  const ssMs  = (cur.sys.sunset  + cur.timezone) * 1000;
  const nowMs = localMs;
  set("sunrise", fmtUTCTime(srMs));
  set("sunset",  fmtUTCTime(ssMs));
  const dayLen  = ssMs - srMs;
  const elapsed = Math.max(0, Math.min(nowMs - srMs, dayLen));
  const pct = dayLen > 0 ? (elapsed / dayLen * 100).toFixed(1) : 0;
  $("sunProgress").style.width = pct + "%";
  $("sunDot").style.left = `calc(${pct}% - 6px)`;

  // UV (estimated)
  const uvRaw = dayLen > 0
    ? Math.max(0, Math.round((1 - cld/100) * 8 * Math.sin(Math.PI * elapsed / dayLen)))
    : 0;
  const uv = Math.min(uvRaw, 11);
  set("uvValue", uv);
  set("uvLabel", ["Low","Low","Low","Moderate","Moderate","Moderate","High","High","Very High","Very High","Extreme","Extreme"][uv]);
  $("uvDot").style.left = `calc(${(uv/11*100).toFixed(1)}% - 6px)`;

  // Hourly
  buildHourly(fore.list.slice(0, 8), cur.timezone);

  // Forecast
  buildForecast(fore.list);

  // Dynamic background + weather effects
  applyWeatherTheme(cur.weather[0].main, cur.weather[0].id);

  // Extreme temperature alert
  checkAlert(cur.main.temp, cur.weather[0].main);

  showWeather();
}

// ── Temperature display (toggle °C / °F) ───────────────────────
function updateTempDisplay() {
  if (currentTempC === null) return;
  const display = isCelsius
    ? Math.round(currentTempC) + "°C"
    : Math.round(currentTempC * 9/5 + 32) + "°F";
  set("temperature", display);
}

// ── Extreme temperature alert ─────────────────────────────────
function checkAlert(tempC, condition) {
  let msg = "";
  let icon = "⚠️";

  if (tempC >= 45) {
    msg = `🔥 Extreme Heat Warning! Temperature is ${Math.round(tempC)}°C. Stay indoors, drink water, avoid sun exposure.`;
    icon = "🔥";
  } else if (tempC >= 40) {
    msg = `☀️ Heat Alert! Temperature is ${Math.round(tempC)}°C. Stay hydrated and limit outdoor activity.`;
    icon = "☀️";
  } else if (tempC <= -10) {
    msg = `❄️ Extreme Cold Warning! Temperature is ${Math.round(tempC)}°C. Dress in warm layers and avoid prolonged exposure.`;
    icon = "❄️";
  } else if (tempC <= 0) {
    msg = `🧊 Freezing temperatures (${Math.round(tempC)}°C). Watch for icy surfaces and frost.`;
    icon = "🧊";
  } else if (condition === "Thunderstorm") {
    msg = "⛈️ Thunderstorm Alert! Stay indoors and avoid open areas, trees, and metal objects.";
    icon = "⛈️";
  } else if (condition === "Tornado") {
    msg = "🌪️ Tornado Warning! Seek shelter immediately in a basement or interior room.";
    icon = "🌪️";
  }

  if (msg) {
    alertIcon.textContent = icon;
    alertText.textContent = msg;
    alertBanner.style.display = "block";
  } else {
    alertBanner.style.display = "none";
  }
}

// ── Hourly strip ────────────────────────────────────────────────
function buildHourly(slots, tzOffset) {
  const el = $("hourlyScroll");
  el.innerHTML = "";
  slots.forEach(slot => {
    const ms   = (slot.dt + tzOffset) * 1000;
    const time = new Date(ms).toUTCString().slice(17, 22);
    const temp = Math.round(slot.main.temp);
    const icon = slot.weather[0].icon;
    const pop  = slot.pop ? Math.round(slot.pop * 100) : 0;
    el.innerHTML += `
      <div class="hour-card">
        <div class="hour-time">${time}</div>
        <img src="https://openweathermap.org/img/wn/${icon}.png" style="width:36px;height:36px;margin:0 auto;display:block;" alt="" />
        <div class="hour-temp">${temp}°</div>
        ${pop > 0 ? `<div class="hour-rain">🌧 ${pop}%</div>` : ""}
      </div>`;
  });
}

// ── 5-day forecast ─────────────────────────────────────────────
function buildForecast(list) {
  const el = $("forecastCards");
  el.innerHTML = "";
  const daily = list.filter(i => i.dt_txt.includes("12:00:00")).slice(0, 5);
  daily.forEach((day, i) => {
    const date = new Date(day.dt * 1000);
    const dName = i === 0 ? "Today" : date.toLocaleDateString("en-US", { weekday: "short" });
    const icon  = day.weather[0].icon;
    const hi    = Math.round(day.main.temp_max);
    const lo    = Math.round(day.main.temp_min);
    const desc  = day.weather[0].main;
    const pop   = day.pop ? Math.round(day.pop * 100) : 0;
    el.innerHTML += `
      <div class="fc-card">
        <div class="fc-day">${dName}</div>
        <img src="https://openweathermap.org/img/wn/${icon}.png" style="width:40px;height:40px;margin:0 auto 4px;display:block;" alt="${desc}" />
        <div class="fc-hi">${hi}°</div>
        <div class="fc-lo">${lo}°</div>
        <div class="fc-desc">${desc}</div>
        ${pop > 0 ? `<div class="fc-rain">🌧 ${pop}%</div>` : ""}
      </div>`;
  });
}

// ═══════════════════════════════════════════════════════════════
// DYNAMIC WEATHER BACKGROUND + EFFECTS
// ═══════════════════════════════════════════════════════════════
function applyWeatherTheme(condition, id) {
  const sky     = $("skyBg");
  const rain    = $("rainLayer");
  const snow    = $("snowLayer");
  const light   = $("lightning");

  // Clear all effects first
  rain.style.display  = "none";
  snow.style.display  = "none";
  light.style.display = "none";
  rain.innerHTML = "";
  snow.innerHTML = "";

  const themes = {
    Clear:        "radial-gradient(ellipse at 20% 10%,rgba(79,195,247,.22) 0%,transparent 55%),radial-gradient(ellipse at 80% 85%,rgba(255,213,79,.1) 0%,transparent 55%),linear-gradient(160deg,#0a1520 0%,#0d2137 55%,#091a30 100%)",
    Clouds:       "radial-gradient(ellipse at 30% 10%,rgba(120,140,160,.2) 0%,transparent 55%),linear-gradient(160deg,#111820 0%,#1a2535 100%)",
    Rain:         "radial-gradient(ellipse at 30% 10%,rgba(30,70,140,.35) 0%,transparent 55%),linear-gradient(160deg,#07101a 0%,#0d1c2e 100%)",
    Drizzle:      "radial-gradient(ellipse at 30% 10%,rgba(40,80,130,.25) 0%,transparent 55%),linear-gradient(160deg,#09141e 0%,#0f1e2e 100%)",
    Thunderstorm: "radial-gradient(ellipse at 50% 0%,rgba(80,0,120,.3) 0%,transparent 60%),linear-gradient(160deg,#060a12 0%,#0e1220 100%)",
    Snow:         "radial-gradient(ellipse at 40% 10%,rgba(200,220,255,.2) 0%,transparent 60%),linear-gradient(160deg,#101820 0%,#182030 100%)",
    Mist:         "radial-gradient(ellipse at 50% 50%,rgba(150,170,190,.15) 0%,transparent 70%),linear-gradient(160deg,#0e1620 0%,#141e28 100%)",
    Fog:          "radial-gradient(ellipse at 50% 50%,rgba(140,160,180,.18) 0%,transparent 70%),linear-gradient(160deg,#0d1520 0%,#141c28 100%)",
    Haze:         "radial-gradient(ellipse at 50% 30%,rgba(180,140,80,.15) 0%,transparent 60%),linear-gradient(160deg,#141006 0%,#1e1a10 100%)",
    Smoke:        "radial-gradient(ellipse at 50% 30%,rgba(100,90,80,.2) 0%,transparent 60%),linear-gradient(160deg,#0e0c0a 0%,#1a1612 100%)",
    Dust:         "radial-gradient(ellipse at 50% 30%,rgba(200,140,60,.18) 0%,transparent 60%),linear-gradient(160deg,#1a1006 0%,#241808 100%)",
    Sand:         "radial-gradient(ellipse at 50% 30%,rgba(210,160,70,.2) 0%,transparent 60%),linear-gradient(160deg,#1c1206 0%,#28180a 100%)",
    Ash:          "radial-gradient(ellipse at 50% 30%,rgba(90,80,80,.25) 0%,transparent 60%),linear-gradient(160deg,#0e0c0c 0%,#181414 100%)",
    Squall:       "radial-gradient(ellipse at 30% 10%,rgba(30,60,120,.35) 0%,transparent 55%),linear-gradient(160deg,#080e18 0%,#0c1420 100%)",
    Tornado:      "radial-gradient(ellipse at 50% 50%,rgba(60,40,100,.35) 0%,transparent 60%),linear-gradient(160deg,#07060e 0%,#0f0e1a 100%)",
  };

  sky.style.background = themes[condition] || themes.Clear;

  // ── Rain effect ──
  if (condition === "Rain" || condition === "Drizzle" || condition === "Squall") {
    rain.style.display = "block";
    const count = condition === "Drizzle" ? 60 : condition === "Squall" ? 140 : 100;
    for (let i = 0; i < count; i++) {
      const drop = document.createElement("div");
      drop.className = "raindrop";
      const height = Math.random() * 18 + 8;
      const speed  = Math.random() * 0.5 + 0.4;
      drop.style.cssText = `
        left:${Math.random()*100}%;
        height:${height}px;
        opacity:${Math.random() * 0.5 + 0.3};
        animation-duration:${speed}s;
        animation-delay:-${Math.random()}s;`;
      rain.appendChild(drop);
    }
  }

  // ── Snow effect ──
  if (condition === "Snow") {
    snow.style.display = "block";
    const flakes = ["❄", "❅", "❆", "✦", "·"];
    for (let i = 0; i < 60; i++) {
      const flake = document.createElement("div");
      flake.className = "snowflake";
      flake.textContent = flakes[Math.floor(Math.random() * flakes.length)];
      const size = Math.random() * 8 + 8;
      const dur  = Math.random() * 6 + 4;
      flake.style.cssText = `
        left:${Math.random()*100}%;
        font-size:${size}px;
        animation-duration:${dur}s;
        animation-delay:-${Math.random()*dur}s;`;
      snow.appendChild(flake);
    }
  }

  // ── Thunderstorm lightning ──
  if (condition === "Thunderstorm") {
    rain.style.display = "block";
    for (let i = 0; i < 120; i++) {
      const drop = document.createElement("div");
      drop.className = "raindrop";
      const height = Math.random() * 22 + 10;
      drop.style.cssText = `left:${Math.random()*100}%;height:${height}px;opacity:${Math.random()*.6+.3};animation-duration:${Math.random()*.3+.3}s;animation-delay:-${Math.random()}s;`;
      rain.appendChild(drop);
    }
    // Intermittent lightning flashes
    light.style.display = "block";
    function flashLightning() {
      light.style.animation = "none";
      light.offsetHeight;  // reflow
      light.style.opacity  = "1";
      setTimeout(() => { light.style.opacity = "0"; }, 80);
      setTimeout(flashLightning, Math.random() * 5000 + 3000);
    }
    flashLightning();
  }
}

// ═══════════════════════════════════════════════════════════════
// INPUT VALIDATION
// ═══════════════════════════════════════════════════════════════
function validateCityInput(city) {
  if (!city || !city.trim()) {
    showInlineError("Please enter a city name to search.");
    cityInput.focus();
    return false;
  }
  if (city.trim().length < 2) {
    showInlineError("City name must be at least 2 characters long.");
    return false;
  }
  if (/^\d+$/.test(city.trim())) {
    showInlineError("City name cannot be numbers only. Try a city name like \"Mumbai\".");
    return false;
  }
  if (!/^[a-zA-Z\u00C0-\u024F\s\-'.,()\u4e00-\u9fff\u3400-\u4dbf]+$/.test(city.trim())) {
    showInlineError("Please enter a valid city name (letters and spaces only).");
    return false;
  }
  clearInlineError();
  return true;
}

// ═══════════════════════════════════════════════════════════════
// ERROR CLASSIFICATION  — maps error type → modal config
// ═══════════════════════════════════════════════════════════════
const ERROR_CONFIGS = {
  city_not_found: {
    type: "error", icon: "🗺️",
    title: "City Not Found",
    hint: "Double-check the spelling or try a nearby major city."
  },
  invalid_api_key: {
    type: "warning", icon: "🔑",
    title: "API Key Invalid",
    hint: "Open app.js and replace \"your_api_key_here\" with your OpenWeatherMap key."
  },
  rate_limited: {
    type: "warning", icon: "⏳",
    title: "Too Many Requests",
    hint: "You've hit the API rate limit. Wait a minute, then try again."
  },
  network_error: {
    type: "error", icon: "📡",
    title: "Connection Failed",
    hint: "Check your internet connection and try again."
  },
  geolocation_denied: {
    type: "info", icon: "📍",
    title: "Location Denied",
    hint: "Allow location access in your browser settings, or search by city name instead."
  },
  geolocation_unavailable: {
    type: "info", icon: "📡",
    title: "Location Unavailable",
    hint: "Your device couldn't determine your location. Try searching by city name."
  },
  geolocation_timeout: {
    type: "warning", icon: "⏱️",
    title: "Location Timeout",
    hint: "Location request took too long. Move to an open area or search by city name."
  },
  empty_response: {
    type: "error", icon: "📭",
    title: "No Data Returned",
    hint: "The weather service returned no data. Please try again shortly."
  },
  server_error: {
    type: "error", icon: "🌩️",
    title: "Server Error",
    hint: "OpenWeatherMap is having issues. Try again in a moment."
  },
  unknown: {
    type: "error", icon: "⚠️",
    title: "Something Went Wrong",
    hint: "An unexpected error occurred. Please try again."
  }
};

function classifyError(status, message) {
  if (!navigator.onLine) return "network_error";
  if (status === 401 || status === 403) return "invalid_api_key";
  if (status === 404) return "city_not_found";
  if (status === 429) return "rate_limited";
  if (status >= 500)  return "server_error";
  if (!status && message?.toLowerCase().includes("network")) return "network_error";
  return "unknown";
}

// ═══════════════════════════════════════════════════════════════
// TOAST NOTIFICATION SYSTEM
// ═══════════════════════════════════════════════════════════════
const toastStack = document.getElementById("toastStack");
const TOAST_ICONS = { error:"❌", warning:"⚠️", success:"✅", info:"ℹ️" };
const TOAST_TITLES = { error:"Error", warning:"Warning", success:"Success", info:"Info" };

function showToast(message, type = "error", duration = 5000, title = null) {
  const item = document.createElement("div");
  item.className = `toast-item ${type}`;

  const displayTitle = title || TOAST_TITLES[type];
  const icon = TOAST_ICONS[type];

  item.innerHTML = `
    <div class="toast-icon">${icon}</div>
    <div class="toast-body">
      <div class="toast-title ${type}">${displayTitle}</div>
      <div class="toast-msg">${escapeHtml(message)}</div>
    </div>
    <button class="toast-x" aria-label="Dismiss">✕</button>
    <div class="toast-progress" style="animation-duration:${duration}ms"></div>`;

  // Dismiss on ✕ click
  item.querySelector(".toast-x").addEventListener("click", () => dismissToast(item));

  toastStack.appendChild(item);

  // Auto-dismiss after duration
  const timer = setTimeout(() => dismissToast(item), duration);
  item._timer = timer;

  // Max 4 toasts on screen at once — remove oldest
  const toasts = toastStack.querySelectorAll(".toast-item");
  if (toasts.length > 4) dismissToast(toasts[0]);
}

function dismissToast(el) {
  if (!el || !el.parentNode) return;
  clearTimeout(el._timer);
  el.classList.add("leaving");
  setTimeout(() => el.remove(), 320);
}

// Convenience wrappers
const toastError   = (msg, title) => showToast(msg, "error",   5000, title);
const toastWarning = (msg, title) => showToast(msg, "warning", 4500, title);
const toastSuccess = (msg, title) => showToast(msg, "success", 3500, title);
const toastInfo    = (msg, title) => showToast(msg, "info",    4000, title);

// ═══════════════════════════════════════════════════════════════
// ERROR MODAL
// ═══════════════════════════════════════════════════════════════
const errorModal    = document.getElementById("errorModal");
const modalBackdrop = document.getElementById("modalBackdrop");
const modalCloseX   = document.getElementById("modalCloseX");
const modalRetry    = document.getElementById("modalRetry");
const modalDismiss  = document.getElementById("modalDismiss");
let   _modalRetryFn = null;   // stored retry callback

function showErrorModal(errorKey, customMessage = null, retryFn = null) {
  const cfg = ERROR_CONFIGS[errorKey] || ERROR_CONFIGS.unknown;
  const iconWrap = document.getElementById("modalIconWrap");
  const title    = document.getElementById("modalTitle");
  const body     = document.getElementById("modalBody");
  const hint     = document.getElementById("modalHint");

  iconWrap.className = `modal-icon-wrap ${cfg.type}`;
  document.getElementById("modalIcon").textContent = cfg.icon;
  title.className    = `modal-title ${cfg.type}`;
  title.textContent  = cfg.title;
  body.textContent   = customMessage || "An error occurred.";
  hint.textContent   = cfg.hint;

  // Show/hide Retry button
  _modalRetryFn = retryFn || null;
  modalRetry.style.display = retryFn ? "inline-block" : "none";

  errorModal.classList.add("open");
  document.body.style.overflow = "hidden";
  modalCloseX.focus();
}

function closeErrorModal() {
  errorModal.classList.remove("open");
  document.body.style.overflow = "";
  _modalRetryFn = null;
}

// Modal close handlers
modalCloseX.addEventListener("click", closeErrorModal);
modalDismiss.addEventListener("click", closeErrorModal);
modalBackdrop.addEventListener("click", closeErrorModal);
modalRetry.addEventListener("click", () => {
  closeErrorModal();
  if (_modalRetryFn) _modalRetryFn();
});
// Escape key closes modal
document.addEventListener("keydown", e => {
  if (e.key === "Escape" && errorModal.classList.contains("open")) closeErrorModal();
});

// ═══════════════════════════════════════════════════════════════
// INLINE FIELD ERROR  (below search bar)
// ═══════════════════════════════════════════════════════════════
const inlineErrorEl   = document.getElementById("inlineError");
const inlineErrorText = document.getElementById("inlineErrorText");
let inlineTimer;

function showInlineError(msg) {
  inlineErrorText.textContent = msg;
  inlineErrorEl.style.display = "block";
  // Re-trigger shake animation
  inlineErrorEl.style.animation = "none";
  inlineErrorEl.offsetHeight;
  inlineErrorEl.style.animation = "";
  // Also add red glow to search box
  document.querySelector(".search-box").style.borderColor = "rgba(239,68,68,.6)";
  document.querySelector(".search-box").style.boxShadow  = "0 0 0 3px rgba(239,68,68,.12)";
  clearTimeout(inlineTimer);
  inlineTimer = setTimeout(clearInlineError, 6000);
}

function clearInlineError() {
  inlineErrorEl.style.display = "none";
  inlineErrorText.textContent = "";
  document.querySelector(".search-box").style.borderColor = "";
  document.querySelector(".search-box").style.boxShadow  = "";
}

// Clear inline error as soon as user starts typing again
cityInput.addEventListener("input", clearInlineError, { passive: true });

// ═══════════════════════════════════════════════════════════════
// NETWORK CONNECTIVITY MONITOR
// ═══════════════════════════════════════════════════════════════
window.addEventListener("offline", () => {
  toastWarning("You're offline. Weather data may not update.", "No Connection");
});
window.addEventListener("online", () => {
  toastSuccess("Back online! You can search for weather now.", "Connected");
});

// ═══════════════════════════════════════════════════════════════
// UI STATE HELPERS
// ═══════════════════════════════════════════════════════════════
function showLoader() {
  hintSection.style.display    = "none";
  weatherContent.classList.add("hidden");
  alertBanner.style.display    = "none";
  loaderSection.style.display  = "flex";
}
function showHint() {
  loaderSection.style.display = "none";
  weatherContent.classList.add("hidden");
  hintSection.style.display   = "block";
}
function showWeather() {
  loaderSection.style.display = "none";
  hintSection.style.display   = "none";
  weatherContent.classList.remove("hidden");
}

// ── Helpers ────────────────────────────────────────────────────
function set(id, val) {
  const el = $(id);
  if (el) el.textContent = val;
}
function fmtUTCTime(ms) {
  return new Date(ms).toUTCString().slice(17, 22);
}
function escapeHtml(str) {
  return str.replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
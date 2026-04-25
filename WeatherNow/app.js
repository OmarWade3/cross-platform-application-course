// ─────────────────────────────────────────
//  API endpoints
// ─────────────────────────────────────────
const GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";
const WEATHER_URL   = "https://api.open-meteo.com/v1/forecast";
const WORLDTIME_URL = "https://worldtimeapi.org/api/timezone";

// ─────────────────────────────────────────
//  Weather code lookup table
//  Source: Open-Meteo WMO Weather Codes docs
// ─────────────────────────────────────────
const weatherCodes = {
  0:  { desc: "Clear Sky",           icon: "☀️" },
  1:  { desc: "Mainly Clear",        icon: "🌤️" },
  2:  { desc: "Partly Cloudy",       icon: "⛅" },
  3:  { desc: "Overcast",            icon: "☁️" },
  45: { desc: "Foggy",               icon: "🌫️" },
  48: { desc: "Icy Fog",             icon: "🌫️" },
  51: { desc: "Light Drizzle",       icon: "🌦️" },
  53: { desc: "Drizzle",             icon: "🌦️" },
  55: { desc: "Heavy Drizzle",       icon: "🌧️" },
  61: { desc: "Light Rain",          icon: "🌧️" },
  63: { desc: "Rain",                icon: "🌧️" },
  65: { desc: "Heavy Rain",          icon: "🌧️" },
  71: { desc: "Light Snow",          icon: "🌨️" },
  73: { desc: "Snow",                icon: "❄️" },
  75: { desc: "Heavy Snow",          icon: "❄️" },
  77: { desc: "Snow Grains",         icon: "🌨️" },
  80: { desc: "Light Showers",       icon: "🌦️" },
  81: { desc: "Showers",             icon: "🌧️" },
  82: { desc: "Heavy Showers",       icon: "⛈️" },
  85: { desc: "Snow Showers",        icon: "🌨️" },
  86: { desc: "Heavy Snow Showers",  icon: "❄️" },
  95: { desc: "Thunderstorm",        icon: "⛈️" },
  96: { desc: "Thunderstorm + Hail", icon: "⛈️" },
  99: { desc: "Thunderstorm + Hail", icon: "⛈️" },
};

// Returns weather info for a given code, fallback if code not in table
function getWeatherInfo(code) {
  return weatherCodes[code] || { desc: "Unknown", icon: "🌡️" };
}

// Converts a date string like "2024-06-10" to a short day name like "Mon"
function getDayName(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { weekday: "short" });
}

// ─────────────────────────────────────────
//  Task 1 - skeleton cards
// ─────────────────────────────────────────
function buildSkeletonForecast() {
  const grid = document.getElementById("forecast-grid");
  grid.innerHTML = "";
  for (let i = 0; i < 7; i++) {
    grid.innerHTML += `
      <div class="forecast-card">
        <div class="fc-day skeleton"></div>
        <div class="fc-icon skeleton"></div>
        <div class="fc-high skeleton"></div>
        <div class="fc-low skeleton"></div>
      </div>`;
  }
}

function resetCurrentCardToSkeleton() {
  ["city-name", "weather-desc", "temperature", "humidity", "wind-speed"].forEach(id => {
    const el = document.getElementById(id);
    el.classList.add("skeleton");
    el.textContent = "";
  });

  const icon = document.getElementById("weather-icon");
  icon.classList.add("skeleton", "icon-skel");
  icon.textContent = "";

  document.getElementById("local-time").classList.add("skeleton");
  document.getElementById("time-value").textContent = "";
  document.getElementById("time-zone").textContent  = "";
}

// ─────────────────────────────────────────
//  Task 4 - fetch with 10s AbortController timeout
// ─────────────────────────────────────────
async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeoutId  = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") {
      throw new Error("Request timed out after 10 seconds. Please try again.");
    }
    throw err;
  }
}

// ─────────────────────────────────────────
//  Task 2 - Step 1: Geocoding
// ─────────────────────────────────────────
async function getCoordinates(cityName) {
  const url = `${GEOCODING_URL}?name=${encodeURIComponent(cityName)}&count=1&language=en&format=json`;

  const response = await fetchWithTimeout(url);

  if (!response.ok) {
    throw new Error(`Geocoding request failed (HTTP ${response.status})`);
  }

  const data = await response.json();

  // Empty results means city not found — return null, don't throw
  if (!data.results || data.results.length === 0) {
    return null;
  }

  const { name, country, latitude, longitude, timezone } = data.results[0];
  return { name, country, latitude, longitude, timezone };
}

// ─────────────────────────────────────────
//  Task 2 - Step 2: Weather data
// ─────────────────────────────────────────
async function getWeather(lat, lon) {
  const params = new URLSearchParams({
    latitude:        lat,
    longitude:       lon,
    current_weather: true,
    hourly:          "relativehumidity_2m,windspeed_10m",
    daily:           "temperature_2m_max,temperature_2m_min,weathercode",
    timezone:        "auto",
    forecast_days:   7,
  });

  const response = await fetchWithTimeout(`${WEATHER_URL}?${params}`);

  if (!response.ok) {
    throw new Error(`Weather request failed (HTTP ${response.status})`);
  }

  return await response.json();
}

// ─────────────────────────────────────────
//  Task 2 - Step 3: Populate UI
// ─────────────────────────────────────────
function populateCurrentCard(cityInfo, weatherData) {
  const current   = weatherData.current_weather;
  const info      = getWeatherInfo(current.weathercode);
  const humidity  = weatherData.hourly.relativehumidity_2m[0];
  const windSpeed = weatherData.hourly.windspeed_10m[0];

  function fill(id, value) {
    const el = document.getElementById(id);
    el.classList.remove("skeleton", "icon-skel");
    el.textContent = value;
  }

  fill("city-name",    `${cityInfo.name}, ${cityInfo.country}`);
  fill("weather-desc", info.desc);
  fill("temperature",  `${current.temperature}°C`);
  fill("humidity",     `${humidity}%`);
  fill("wind-speed",   `${windSpeed} km/h`);
  fill("weather-icon", info.icon);

  // local-time skeleton removed here; text filled in Task 3
  document.getElementById("local-time").classList.remove("skeleton");
}

function populateForecastCards(weatherData) {
  const grid  = document.getElementById("forecast-grid");
  const daily = weatherData.daily;
  grid.innerHTML = "";

  for (let i = 0; i < 7; i++) {
    const info = getWeatherInfo(daily.weathercode[i]);
    const day  = getDayName(daily.time[i]);
    const high = Math.round(daily.temperature_2m_max[i]);
    const low  = Math.round(daily.temperature_2m_min[i]);

    grid.innerHTML += `
      <div class="forecast-card">
        <div class="fc-day">${day}</div>
        <div class="fc-icon">${info.icon}</div>
        <div class="fc-high">${high}°</div>
        <div class="fc-low">${low}°</div>
      </div>`;
  }
}

// ─────────────────────────────────────────
//  Task 3 - jQuery $.ajax() for local time
//
//  Why $.ajax and not $.getJSON?
//  $.getJSON() appends a callback param which turns the request into JSONP.
//  WorldTimeAPI supports regular CORS but NOT JSONP, so it fails.
//  $.ajax() with dataType: "json" sends a plain GET with proper CORS headers.
// ─────────────────────────────────────────
function fetchLocalTime(timezone) {
  const url = `${WORLDTIME_URL}/${timezone}`;

  $.ajax({ url: url, method: "GET", dataType: "json" })
    .done(function (data) {
      // data.datetime is an ISO 8601 string e.g. "2024-06-10T14:32:00+08:00"
      const date    = new Date(data.datetime);
      const timeStr = date.toLocaleTimeString("en-US", {
        hour:   "2-digit",
        minute: "2-digit",
        hour12: true,
      });

      document.getElementById("time-value").textContent = timeStr;
      // Replace underscores so "Asia/Kuala_Lumpur" shows as "Asia/Kuala Lumpur"
      document.getElementById("time-zone").textContent  = timezone.replace(/_/g, " ");
    })
    .fail(function (jqXHR, textStatus) {
      // API unavailable or timezone string not recognised — fall back to browser time
      console.warn(`WorldTimeAPI failed (${textStatus}) for "${timezone}" — using browser local time`);

      const now     = new Date();
      const timeStr = now.toLocaleTimeString("en-US", {
        hour:   "2-digit",
        minute: "2-digit",
        hour12: true,
      });

      document.getElementById("time-value").textContent = timeStr;
      document.getElementById("time-zone").textContent  = "Local Time (fallback)";
    })
    .always(function () {
      // Log completion timestamp regardless of success or failure
      console.log(`[WorldTimeAPI] Request completed at: ${new Date().toISOString()}`);
    });
}

// ─────────────────────────────────────────
//  Task 2 - Main search orchestrator
// ─────────────────────────────────────────
async function searchWeather(cityName) {
  hideError();
  resetCurrentCardToSkeleton();
  buildSkeletonForecast();
  setLoading(true);

  try {
    const cityInfo = await getCoordinates(cityName);

    if (!cityInfo) {
      showError(`City "${cityName}" not found. Please check the spelling and try again.`);
      setLoading(false);
      return;
    }

    const weatherData = await getWeather(cityInfo.latitude, cityInfo.longitude);

    populateCurrentCard(cityInfo, weatherData);
    populateForecastCards(weatherData);
    fetchLocalTime(cityInfo.timezone);

  } catch (err) {
    console.error("Search error:", err);
    showError(err.message || "Something went wrong. Please try again.", true);
    resetCurrentCardToSkeleton();
    buildSkeletonForecast();
  }

  setLoading(false);
}

// ─────────────────────────────────────────
//  Task 4 - input validation
// ─────────────────────────────────────────
function validateInput(city) {
  if (!city) {
    showError("Please enter a city name.");
    return false;
  }
  if (city.length < 2) {
    showError("City name must be at least 2 characters.");
    return false;
  }
  return true;
}

// ─────────────────────────────────────────
//  Task 4 - debounce utility
//  Returns a function that waits `delay` ms
//  after the last call before executing
// ─────────────────────────────────────────
function debounce(fn, delay) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

// ─────────────────────────────────────────
//  UI helpers
// ─────────────────────────────────────────
function showError(msg, showRetry = false) {
  document.getElementById("error-text").textContent = msg;
  document.getElementById("error-msg").classList.remove("hidden");
  document.getElementById("retry-btn").style.display = showRetry ? "inline-block" : "none";
}

function hideError() {
  document.getElementById("error-msg").classList.add("hidden");
}

function setLoading(isLoading) {
  const btn = document.getElementById("search-btn");
  btn.disabled    = isLoading;
  btn.textContent = isLoading ? "Loading..." : "Search";
}

// ─────────────────────────────────────────
//  Event listeners
// ─────────────────────────────────────────

// Debounced handler for typing — fires 500ms after user stops
// Only triggers if input is 2+ chars; clears error while typing shorter
const handleDebouncedInput = debounce(function (e) {
  const city = e.target.value.trim();
  if (city.length >= 2) {
    hideError();
    searchWeather(city);
  } else if (city.length === 0) {
    hideError();
  }
}, 500);

document.getElementById("city-input").addEventListener("input", handleDebouncedInput);

// Search button — cancels any pending debounce by re-validating immediately
// This prevents a double API call if the user types and then quickly clicks Search
document.getElementById("search-btn").addEventListener("click", function () {
  // Clear the debounce timer by re-assigning (handled inside debounce closure)
  // We call searchWeather directly here — validateInput prevents empty/short searches
  const city = document.getElementById("city-input").value.trim();
  if (!validateInput(city)) return;
  hideError();
  searchWeather(city);
});

// Enter key triggers the button click (which also bypasses the debounce)
document.getElementById("city-input").addEventListener("keydown", function (e) {
  if (e.key === "Enter") document.getElementById("search-btn").click();
});

// Retry button re-runs the last search
document.getElementById("retry-btn").addEventListener("click", function () {
  const city = document.getElementById("city-input").value.trim();
  if (validateInput(city)) searchWeather(city);
});

// ─────────────────────────────────────────
//  Init
// ─────────────────────────────────────────
buildSkeletonForecast();
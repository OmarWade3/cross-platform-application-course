// ─────────────────────────────────────────
//  API endpoints
// ─────────────────────────────────────────
const GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";
const WEATHER_URL   = "https://api.open-meteo.com/v1/forecast";

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
//  Task 1 - build skeleton forecast cards
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

// Resets the current weather card back to skeleton state
function resetCurrentCardToSkeleton() {
  const ids = ["city-name", "weather-desc", "temperature", "humidity", "wind-speed"];
  ids.forEach(id => {
    const el = document.getElementById(id);
    el.classList.add("skeleton");
    el.textContent = "";
  });

  const icon = document.getElementById("weather-icon");
  icon.classList.add("skeleton", "icon-skel");
  icon.textContent = "";

  // Reset local-time container and clear its inner spans
  document.getElementById("local-time").classList.add("skeleton");
  document.getElementById("time-value").textContent = "";
  document.getElementById("time-zone").textContent  = "";
}

// ─────────────────────────────────────────
//  Task 2 - Step 1: Geocoding API call
//  Resolves city name → lat + lon
// ─────────────────────────────────────────
async function getCoordinates(cityName) {
  const url = `${GEOCODING_URL}?name=${encodeURIComponent(cityName)}&count=1&language=en&format=json`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Geocoding request failed (HTTP ${response.status})`);
  }

  const data = await response.json();

  // Return null if city not found — don't throw, just handle gracefully in the caller
  if (!data.results || data.results.length === 0) {
    return null;
  }

  const { name, country, latitude, longitude, timezone } = data.results[0];
  return { name, country, latitude, longitude, timezone };
}

// ─────────────────────────────────────────
//  Task 2 - Step 2: Weather API call
//  Fetches current weather + 7-day forecast
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

  const response = await fetch(`${WEATHER_URL}?${params}`);

  if (!response.ok) {
    throw new Error(`Weather request failed (HTTP ${response.status})`);
  }

  return await response.json();
}

// ─────────────────────────────────────────
//  Task 2 - Step 3: Populate UI with data
//  Removes skeleton classes and fills values
// ─────────────────────────────────────────
function populateCurrentCard(cityInfo, weatherData) {
  const current = weatherData.current_weather;
  const info    = getWeatherInfo(current.weathercode);

  // Get humidity + wind from first hourly slot (closest to current time)
  const humidity  = weatherData.hourly.relativehumidity_2m[0];
  const windSpeed = weatherData.hourly.windspeed_10m[0];

  // Helper: set text content and remove skeleton styling
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

  // Remove skeleton from local-time container — content filled by Task 3
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
//  Task 2 - Main search function
//  Chains: geocoding → weather → UI update
// ─────────────────────────────────────────
async function searchWeather(cityName) {
  hideError();
  resetCurrentCardToSkeleton();
  buildSkeletonForecast();
  setLoading(true);

  try {
    // Step 1: resolve city name to coordinates
    const cityInfo = await getCoordinates(cityName);

    // City not found — show error without throwing an exception
    if (!cityInfo) {
      showError(`City "${cityName}" not found. Please check the spelling and try again.`);
      setLoading(false);
      return;
    }

    // Step 2: fetch weather using the coordinates
    const weatherData = await getWeather(cityInfo.latitude, cityInfo.longitude);

    // Step 3: update the UI with real data
    populateCurrentCard(cityInfo, weatherData);
    populateForecastCards(weatherData);

    // Task 3: fetch local time using jQuery $.getJSON() to WorldTimeAPI
    fetchLocalTime(cityInfo.timezone);

  } catch (err) {
    // Catches network failures or bad HTTP responses
    console.error("Fetch error:", err);
    showError("Network error: could not load weather data. Please check your connection.", true);
    resetCurrentCardToSkeleton();
    buildSkeletonForecast();
  }

  setLoading(false);
}

// ─────────────────────────────────────────
//  Task 3 - jQuery $.getJSON()
//  Fetches local time from WorldTimeAPI
//  Uses .done(), .fail(), .always() chaining
// ─────────────────────────────────────────
function fetchLocalTime(timezone) {
  // WorldTimeAPI expects the timezone in the URL path e.g. "Asia/Kuala_Lumpur"
  const url = `https://worldtimeapi.org/api/timezone/${timezone}`;

  $.getJSON(url)
    .done(function (data) {
      // Parse the datetime string and format it as HH:MM
      const date = new Date(data.datetime);
      const timeStr = date.toLocaleTimeString("en-US", {
        hour:   "2-digit",
        minute: "2-digit",
        hour12: true,
      });

      document.getElementById("time-value").textContent = timeStr;
      document.getElementById("time-zone").textContent  = timezone.replace("_", " ");
    })
    .fail(function () {
      // Timezone not found or API unavailable — fall back to browser local time
      console.warn("WorldTimeAPI failed for timezone:", timezone, "— using browser local time");

      const now = new Date();
      const timeStr = now.toLocaleTimeString("en-US", {
        hour:   "2-digit",
        minute: "2-digit",
        hour12: true,
      });

      document.getElementById("time-value").textContent = timeStr;
      document.getElementById("time-zone").textContent  = "Local Time (fallback)";
    })
    .always(function () {
      // Log a timestamp every time the request completes (success or failure)
      console.log(`[WorldTimeAPI] Request completed at: ${new Date().toISOString()}`);
    });
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
document.getElementById("search-btn").addEventListener("click", function () {
  const city = document.getElementById("city-input").value.trim();
  if (!city) {
    showError("Please enter a city name.");
    return;
  }
  searchWeather(city);
});

document.getElementById("city-input").addEventListener("keydown", function (e) {
  if (e.key === "Enter") document.getElementById("search-btn").click();
});

// Retry button re-runs the last search
document.getElementById("retry-btn").addEventListener("click", function () {
  const city = document.getElementById("city-input").value.trim();
  if (city) searchWeather(city);
});

// ─────────────────────────────────────────
//  Init
// ─────────────────────────────────────────
buildSkeletonForecast();
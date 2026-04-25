// Task 1 - render skeleton forecast cards on page load
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

// Allow pressing Enter to trigger search
document.getElementById("city-input").addEventListener("keydown", function (e) {
  if (e.key === "Enter") {
    document.getElementById("search-btn").click();
  }
});

// Search button click handler - API logic will be added in Tasks 2 & 3
document.getElementById("search-btn").addEventListener("click", function () {
  const city = document.getElementById("city-input").value.trim();

  if (!city) {
    showError("Please enter a city name.");
    return;
  }

  hideError();
  console.log("Searching for:", city);
  // TODO Task 2: call geocoding API, then fetch weather using Fetch API
  // TODO Task 3: fetch local time using jQuery $.ajax()
});

// Helper - show error banner
function showError(msg) {
  document.getElementById("error-text").textContent = msg;
  document.getElementById("error-msg").classList.remove("hidden");
}

// Helper - hide error banner
function hideError() {
  document.getElementById("error-msg").classList.add("hidden");
}

// Run on page load
buildSkeletonForecast();
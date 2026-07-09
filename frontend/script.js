/**
 * URL Shortener — frontend logic
 * ---------------------------------------------------------------------------
 * Talks to the Cloudflare Worker API to create short links, then displays
 * the result with copy-to-clipboard support.
 *
 * IMPORTANT: replace WORKER_BASE_URL below with your deployed Worker URL,
 * e.g. "https://url-shortener-worker.yourname.workers.dev"
 * ---------------------------------------------------------------------------
 */

const WORKER_BASE_URL = "https://url-shortener-worker.ashika-url.workers.dev";

// --- DOM references -----------------------------------------------------
const form = document.getElementById("shorten-form");
const urlInput = document.getElementById("url-input");
const shortenBtn = document.getElementById("shorten-btn");
const btnText = document.getElementById("btn-text");
const btnSpinner = document.getElementById("btn-spinner");
const errorMessage = document.getElementById("error-message");
const resultBox = document.getElementById("result");
const shortUrlOutput = document.getElementById("short-url-output");
const copyBtn = document.getElementById("copy-btn");
const copyFeedback = document.getElementById("copy-feedback");
const statsLink = document.getElementById("stats-link");

// --- UI helpers -----------------------------------------------------------

function showError(message) {
  errorMessage.textContent = message;
  errorMessage.classList.remove("hidden");
}

function hideError() {
  errorMessage.classList.add("hidden");
  errorMessage.textContent = "";
}

function setLoading(isLoading) {
  shortenBtn.disabled = isLoading;
  btnText.classList.toggle("hidden", isLoading);
  btnSpinner.classList.toggle("hidden", !isLoading);
}

function showResult(shortCode) {
  const shortUrl = `${WORKER_BASE_URL}/${shortCode}`;
  shortUrlOutput.value = shortUrl;
  statsLink.href = `${WORKER_BASE_URL}/api/stats/${shortCode}`;
  statsLink.classList.remove("hidden");
  copyFeedback.classList.add("hidden");
  resultBox.classList.remove("hidden");
}

function isLikelyValidUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

// --- Main form submit handler ---------------------------------------------

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  hideError();
  resultBox.classList.add("hidden");

  const rawUrl = urlInput.value.trim();

  if (!rawUrl) {
    showError("Please enter a URL.");
    return;
  }

  if (!isLikelyValidUrl(rawUrl)) {
    showError("Please enter a valid URL starting with http:// or https://");
    return;
  }

  if (WORKER_BASE_URL.includes("REPLACE_WITH_YOUR_WORKER_URL")) {
    showError(
      "The app isn't configured yet — set WORKER_BASE_URL in script.js to your deployed Worker URL."
    );
    return;
  }

  setLoading(true);

  try {
    const response = await fetch(`${WORKER_BASE_URL}/api/shorten`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: rawUrl }),
    });

    const data = await response.json();

    if (!response.ok) {
      showError(data.error || "Something went wrong. Please try again.");
      return;
    }

    showResult(data.short_code);
    form.reset();
  } catch (err) {
    console.error("Network or server error:", err);
    showError("Could not reach the server. Check your connection and try again.");
  } finally {
    setLoading(false);
  }
});

// --- Copy-to-clipboard ------------------------------------------------------

copyBtn.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(shortUrlOutput.value);
    copyFeedback.classList.remove("hidden");
    setTimeout(() => copyFeedback.classList.add("hidden"), 2000);
  } catch (err) {
    // Fallback for older browsers without Clipboard API support
    shortUrlOutput.select();
    document.execCommand("copy");
    copyFeedback.classList.remove("hidden");
    setTimeout(() => copyFeedback.classList.add("hidden"), 2000);
  }
});

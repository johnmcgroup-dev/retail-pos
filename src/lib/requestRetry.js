// Shared helpers for the app's own request patterns.
//
// A rate limit means the server rejected the request outright — nothing was
// saved. Retrying exactly those failures (and nothing else) keeps normal
// transactions flowing without ever repeating a call that may have been
// applied already, so no duplicate or partial records can be created.

export function isRateLimitError(error) {
  if (!error) return false;
  const status = error.status || error.response?.status || error.code;
  if (status === 429 || status === "429") return true;
  const message = `${error.message || ""} ${error.detail || ""} ${error.data?.message || ""}`;
  return /rate.?limit|too many requests|429/i.test(message);
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Retries a single request in the background when — and only when — it was
// rejected by a rate limit. Any other error is rethrown untouched.
export async function retryOnRateLimit(request, { attempts = 3, baseDelay = 800 } = {}) {
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await request();
    } catch (error) {
      if (!isRateLimitError(error)) throw error;
      lastError = error;
      if (attempt < attempts - 1) await wait(baseDelay * 2 ** attempt);
    }
  }
  throw lastError;
}

// User-facing wording for a failed request: a genuinely reached limit reads as
// a short explanation instead of a raw error, and makes clear nothing was saved.
export function friendlyRequestMessage(error, fallback = "Something went wrong. Please try again.") {
  if (isRateLimitError(error)) {
    return "The system is busy right now. Please wait a few seconds and try again — nothing was saved yet.";
  }
  return error?.message || fallback;
}
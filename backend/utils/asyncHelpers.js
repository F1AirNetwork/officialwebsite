// ─────────────────────────────────────────────────────────
// Utility: Add timeout to any async operation
// Prevents backend hangs from slow external services
// ─────────────────────────────────────────────────────────

export const withTimeout = async (promise, timeoutMs, errorMessage) => {
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error(errorMessage || `Operation timed out after ${timeoutMs}ms`)), timeoutMs)
  );
  return Promise.race([promise, timeoutPromise]);
};

// ─────────────────────────────────────────────────────────
// Utility: Retry async operation with exponential backoff
// Useful for flaky external services (payment gateways, etc)
// ─────────────────────────────────────────────────────────

export const withRetry = async (
  fn,
  maxRetries = 3,
  initialDelayMs = 1000,
  errorMessage = "Operation failed after retries"
) => {
  let lastError;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      console.warn(`⚠️  Attempt ${i + 1}/${maxRetries} failed:`, err.message);

      if (i < maxRetries - 1) {
        // Exponential backoff: wait 1s, 2s, 4s, etc
        const delay = initialDelayMs * Math.pow(2, i);
        console.log(`⏳ Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw new Error(`${errorMessage}: ${lastError?.message}`);
};

// ─────────────────────────────────────────────────────────
// Utility: Circuit breaker pattern
// Prevents cascading failures to external services
// ─────────────────────────────────────────────────────────

export class CircuitBreaker {
  constructor(failureThreshold = 5, resetTimeoutMs = 60000) {
    this.failureThreshold = failureThreshold;
    this.resetTimeoutMs = resetTimeoutMs;
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.state = "CLOSED"; // CLOSED, OPEN, HALF_OPEN
  }

  async execute(fn, fallback = null) {
    if (this.state === "OPEN") {
      if (Date.now() - this.lastFailureTime > this.resetTimeoutMs) {
        console.log("🔄 Circuit breaker: HALF_OPEN, testing recovery...");
        this.state = "HALF_OPEN";
      } else {
        console.warn("🚫 Circuit breaker: OPEN, service unavailable");
        if (fallback) return fallback();
        throw new Error("Service temporarily unavailable. Please try again later.");
      }
    }

    try {
      const result = await fn();
      if (this.state === "HALF_OPEN") {
        console.log("✅ Circuit breaker: CLOSED, service recovered");
        this.state = "CLOSED";
        this.failureCount = 0;
      }
      return result;
    } catch (err) {
      this.failureCount++;
      this.lastFailureTime = Date.now();

      if (this.failureCount >= this.failureThreshold) {
        console.error(`❌ Circuit breaker: OPEN after ${this.failureCount} failures`);
        this.state = "OPEN";
      }

      throw err;
    }
  }

  reset() {
    this.failureCount = 0;
    this.state = "CLOSED";
    this.lastFailureTime = null;
  }
}

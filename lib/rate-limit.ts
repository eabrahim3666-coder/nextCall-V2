const requestCounts = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = requestCounts.get(key);
  if (!entry || now > entry.resetAt) {
    requestCounts.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= maxRequests) {
    return false;
  }
  entry.count++;
  return true;
}

// Cleanup stale entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of requestCounts) {
      if (now > entry.resetAt) requestCounts.delete(key);
    }
  }, 5 * 60 * 1000);
}

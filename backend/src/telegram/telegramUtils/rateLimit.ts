/**
 * Simple in-memory sliding-window rate limiter keyed by Telegram user ID.
 */
export class TelegramRateLimiter {
  private readonly hits = new Map<number, number[]>();

  constructor(
    private readonly max: number,
    private readonly windowMs: number,
  ) {}

  /** Returns true if the request is allowed. */
  allow(telegramUserId: number, now = Date.now()): boolean {
    const cutoff = now - this.windowMs;
    const prev = this.hits.get(telegramUserId) ?? [];
    const recent = prev.filter((t) => t > cutoff);
    if (recent.length >= this.max) {
      this.hits.set(telegramUserId, recent);
      return false;
    }
    recent.push(now);
    this.hits.set(telegramUserId, recent);
    return true;
  }

  reset(telegramUserId: number): void {
    this.hits.delete(telegramUserId);
  }
}

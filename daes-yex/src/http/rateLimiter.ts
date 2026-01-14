import { RateLimitError } from "../errors.js";

/**
 * Simple token bucket per minute.
 * YEX menciona pesos por IP y UID; aquí controlamos "requests/min" genérico.
 * Ajusta weights si quieres.
 * 
 * YEX global limits:
 * - 12,000/min por IP
 * - 60,000/min por UID
 */
export class MinuteRateLimiter {
  private windowStart = Date.now();
  private used = 0;

  constructor(private limitPerMinute: number) {}

  take(cost = 1): void {
    const now = Date.now();
    if (now - this.windowStart >= 60_000) {
      this.windowStart = now;
      this.used = 0;
    }
    if (this.used + cost > this.limitPerMinute) {
      throw new RateLimitError(
        `Local rate limit exceeded: ${this.used}/${this.limitPerMinute} in current minute`
      );
    }
    this.used += cost;
  }

  reset(): void {
    this.windowStart = Date.now();
    this.used = 0;
  }

  getUsed(): number {
    return this.used;
  }

  getRemaining(): number {
    return Math.max(0, this.limitPerMinute - this.used);
  }
}

/**
 * Rate limiter por segundo (para endpoints más restrictivos)
 */
export class SecondRateLimiter {
  private windowStart = Date.now();
  private used = 0;

  constructor(private limitPerSecond: number) {}

  take(cost = 1): void {
    const now = Date.now();
    if (now - this.windowStart >= 1_000) {
      this.windowStart = now;
      this.used = 0;
    }
    if (this.used + cost > this.limitPerSecond) {
      throw new RateLimitError(
        `Local rate limit exceeded: ${this.used}/${this.limitPerSecond} in current second`
      );
    }
    this.used += cost;
  }
}




/**
 * Simple token bucket per minute.
 * YEX menciona pesos por IP y UID; aquí controlamos "requests/min" genérico.
 * Ajusta weights si quieres.
 * 
 * YEX global limits:
 * - 12,000/min por IP
 * - 60,000/min por UID
 */
export class MinuteRateLimiter {
  private windowStart = Date.now();
  private used = 0;

  constructor(private limitPerMinute: number) {}

  take(cost = 1): void {
    const now = Date.now();
    if (now - this.windowStart >= 60_000) {
      this.windowStart = now;
      this.used = 0;
    }
    if (this.used + cost > this.limitPerMinute) {
      throw new RateLimitError(
        `Local rate limit exceeded: ${this.used}/${this.limitPerMinute} in current minute`
      );
    }
    this.used += cost;
  }

  reset(): void {
    this.windowStart = Date.now();
    this.used = 0;
  }

  getUsed(): number {
    return this.used;
  }

  getRemaining(): number {
    return Math.max(0, this.limitPerMinute - this.used);
  }
}

/**
 * Rate limiter por segundo (para endpoints más restrictivos)
 */
export class SecondRateLimiter {
  private windowStart = Date.now();
  private used = 0;

  constructor(private limitPerSecond: number) {}

  take(cost = 1): void {
    const now = Date.now();
    if (now - this.windowStart >= 1_000) {
      this.windowStart = now;
      this.used = 0;
    }
    if (this.used + cost > this.limitPerSecond) {
      throw new RateLimitError(
        `Local rate limit exceeded: ${this.used}/${this.limitPerSecond} in current second`
      );
    }
    this.used += cost;
  }
}





/**
 * Simple token bucket per minute.
 * YEX menciona pesos por IP y UID; aquí controlamos "requests/min" genérico.
 * Ajusta weights si quieres.
 * 
 * YEX global limits:
 * - 12,000/min por IP
 * - 60,000/min por UID
 */
export class MinuteRateLimiter {
  private windowStart = Date.now();
  private used = 0;

  constructor(private limitPerMinute: number) {}

  take(cost = 1): void {
    const now = Date.now();
    if (now - this.windowStart >= 60_000) {
      this.windowStart = now;
      this.used = 0;
    }
    if (this.used + cost > this.limitPerMinute) {
      throw new RateLimitError(
        `Local rate limit exceeded: ${this.used}/${this.limitPerMinute} in current minute`
      );
    }
    this.used += cost;
  }

  reset(): void {
    this.windowStart = Date.now();
    this.used = 0;
  }

  getUsed(): number {
    return this.used;
  }

  getRemaining(): number {
    return Math.max(0, this.limitPerMinute - this.used);
  }
}

/**
 * Rate limiter por segundo (para endpoints más restrictivos)
 */
export class SecondRateLimiter {
  private windowStart = Date.now();
  private used = 0;

  constructor(private limitPerSecond: number) {}

  take(cost = 1): void {
    const now = Date.now();
    if (now - this.windowStart >= 1_000) {
      this.windowStart = now;
      this.used = 0;
    }
    if (this.used + cost > this.limitPerSecond) {
      throw new RateLimitError(
        `Local rate limit exceeded: ${this.used}/${this.limitPerSecond} in current second`
      );
    }
    this.used += cost;
  }
}




/**
 * Simple token bucket per minute.
 * YEX menciona pesos por IP y UID; aquí controlamos "requests/min" genérico.
 * Ajusta weights si quieres.
 * 
 * YEX global limits:
 * - 12,000/min por IP
 * - 60,000/min por UID
 */
export class MinuteRateLimiter {
  private windowStart = Date.now();
  private used = 0;

  constructor(private limitPerMinute: number) {}

  take(cost = 1): void {
    const now = Date.now();
    if (now - this.windowStart >= 60_000) {
      this.windowStart = now;
      this.used = 0;
    }
    if (this.used + cost > this.limitPerMinute) {
      throw new RateLimitError(
        `Local rate limit exceeded: ${this.used}/${this.limitPerMinute} in current minute`
      );
    }
    this.used += cost;
  }

  reset(): void {
    this.windowStart = Date.now();
    this.used = 0;
  }

  getUsed(): number {
    return this.used;
  }

  getRemaining(): number {
    return Math.max(0, this.limitPerMinute - this.used);
  }
}

/**
 * Rate limiter por segundo (para endpoints más restrictivos)
 */
export class SecondRateLimiter {
  private windowStart = Date.now();
  private used = 0;

  constructor(private limitPerSecond: number) {}

  take(cost = 1): void {
    const now = Date.now();
    if (now - this.windowStart >= 1_000) {
      this.windowStart = now;
      this.used = 0;
    }
    if (this.used + cost > this.limitPerSecond) {
      throw new RateLimitError(
        `Local rate limit exceeded: ${this.used}/${this.limitPerSecond} in current second`
      );
    }
    this.used += cost;
  }
}





/**
 * Simple token bucket per minute.
 * YEX menciona pesos por IP y UID; aquí controlamos "requests/min" genérico.
 * Ajusta weights si quieres.
 * 
 * YEX global limits:
 * - 12,000/min por IP
 * - 60,000/min por UID
 */
export class MinuteRateLimiter {
  private windowStart = Date.now();
  private used = 0;

  constructor(private limitPerMinute: number) {}

  take(cost = 1): void {
    const now = Date.now();
    if (now - this.windowStart >= 60_000) {
      this.windowStart = now;
      this.used = 0;
    }
    if (this.used + cost > this.limitPerMinute) {
      throw new RateLimitError(
        `Local rate limit exceeded: ${this.used}/${this.limitPerMinute} in current minute`
      );
    }
    this.used += cost;
  }

  reset(): void {
    this.windowStart = Date.now();
    this.used = 0;
  }

  getUsed(): number {
    return this.used;
  }

  getRemaining(): number {
    return Math.max(0, this.limitPerMinute - this.used);
  }
}

/**
 * Rate limiter por segundo (para endpoints más restrictivos)
 */
export class SecondRateLimiter {
  private windowStart = Date.now();
  private used = 0;

  constructor(private limitPerSecond: number) {}

  take(cost = 1): void {
    const now = Date.now();
    if (now - this.windowStart >= 1_000) {
      this.windowStart = now;
      this.used = 0;
    }
    if (this.used + cost > this.limitPerSecond) {
      throw new RateLimitError(
        `Local rate limit exceeded: ${this.used}/${this.limitPerSecond} in current second`
      );
    }
    this.used += cost;
  }
}




/**
 * Simple token bucket per minute.
 * YEX menciona pesos por IP y UID; aquí controlamos "requests/min" genérico.
 * Ajusta weights si quieres.
 * 
 * YEX global limits:
 * - 12,000/min por IP
 * - 60,000/min por UID
 */
export class MinuteRateLimiter {
  private windowStart = Date.now();
  private used = 0;

  constructor(private limitPerMinute: number) {}

  take(cost = 1): void {
    const now = Date.now();
    if (now - this.windowStart >= 60_000) {
      this.windowStart = now;
      this.used = 0;
    }
    if (this.used + cost > this.limitPerMinute) {
      throw new RateLimitError(
        `Local rate limit exceeded: ${this.used}/${this.limitPerMinute} in current minute`
      );
    }
    this.used += cost;
  }

  reset(): void {
    this.windowStart = Date.now();
    this.used = 0;
  }

  getUsed(): number {
    return this.used;
  }

  getRemaining(): number {
    return Math.max(0, this.limitPerMinute - this.used);
  }
}

/**
 * Rate limiter por segundo (para endpoints más restrictivos)
 */
export class SecondRateLimiter {
  private windowStart = Date.now();
  private used = 0;

  constructor(private limitPerSecond: number) {}

  take(cost = 1): void {
    const now = Date.now();
    if (now - this.windowStart >= 1_000) {
      this.windowStart = now;
      this.used = 0;
    }
    if (this.used + cost > this.limitPerSecond) {
      throw new RateLimitError(
        `Local rate limit exceeded: ${this.used}/${this.limitPerSecond} in current second`
      );
    }
    this.used += cost;
  }
}





/**
 * Simple token bucket per minute.
 * YEX menciona pesos por IP y UID; aquí controlamos "requests/min" genérico.
 * Ajusta weights si quieres.
 * 
 * YEX global limits:
 * - 12,000/min por IP
 * - 60,000/min por UID
 */
export class MinuteRateLimiter {
  private windowStart = Date.now();
  private used = 0;

  constructor(private limitPerMinute: number) {}

  take(cost = 1): void {
    const now = Date.now();
    if (now - this.windowStart >= 60_000) {
      this.windowStart = now;
      this.used = 0;
    }
    if (this.used + cost > this.limitPerMinute) {
      throw new RateLimitError(
        `Local rate limit exceeded: ${this.used}/${this.limitPerMinute} in current minute`
      );
    }
    this.used += cost;
  }

  reset(): void {
    this.windowStart = Date.now();
    this.used = 0;
  }

  getUsed(): number {
    return this.used;
  }

  getRemaining(): number {
    return Math.max(0, this.limitPerMinute - this.used);
  }
}

/**
 * Rate limiter por segundo (para endpoints más restrictivos)
 */
export class SecondRateLimiter {
  private windowStart = Date.now();
  private used = 0;

  constructor(private limitPerSecond: number) {}

  take(cost = 1): void {
    const now = Date.now();
    if (now - this.windowStart >= 1_000) {
      this.windowStart = now;
      this.used = 0;
    }
    if (this.used + cost > this.limitPerSecond) {
      throw new RateLimitError(
        `Local rate limit exceeded: ${this.used}/${this.limitPerSecond} in current second`
      );
    }
    this.used += cost;
  }
}




/**
 * Simple token bucket per minute.
 * YEX menciona pesos por IP y UID; aquí controlamos "requests/min" genérico.
 * Ajusta weights si quieres.
 * 
 * YEX global limits:
 * - 12,000/min por IP
 * - 60,000/min por UID
 */
export class MinuteRateLimiter {
  private windowStart = Date.now();
  private used = 0;

  constructor(private limitPerMinute: number) {}

  take(cost = 1): void {
    const now = Date.now();
    if (now - this.windowStart >= 60_000) {
      this.windowStart = now;
      this.used = 0;
    }
    if (this.used + cost > this.limitPerMinute) {
      throw new RateLimitError(
        `Local rate limit exceeded: ${this.used}/${this.limitPerMinute} in current minute`
      );
    }
    this.used += cost;
  }

  reset(): void {
    this.windowStart = Date.now();
    this.used = 0;
  }

  getUsed(): number {
    return this.used;
  }

  getRemaining(): number {
    return Math.max(0, this.limitPerMinute - this.used);
  }
}

/**
 * Rate limiter por segundo (para endpoints más restrictivos)
 */
export class SecondRateLimiter {
  private windowStart = Date.now();
  private used = 0;

  constructor(private limitPerSecond: number) {}

  take(cost = 1): void {
    const now = Date.now();
    if (now - this.windowStart >= 1_000) {
      this.windowStart = now;
      this.used = 0;
    }
    if (this.used + cost > this.limitPerSecond) {
      throw new RateLimitError(
        `Local rate limit exceeded: ${this.used}/${this.limitPerSecond} in current second`
      );
    }
    this.used += cost;
  }
}




/**
 * Simple token bucket per minute.
 * YEX menciona pesos por IP y UID; aquí controlamos "requests/min" genérico.
 * Ajusta weights si quieres.
 * 
 * YEX global limits:
 * - 12,000/min por IP
 * - 60,000/min por UID
 */
export class MinuteRateLimiter {
  private windowStart = Date.now();
  private used = 0;

  constructor(private limitPerMinute: number) {}

  take(cost = 1): void {
    const now = Date.now();
    if (now - this.windowStart >= 60_000) {
      this.windowStart = now;
      this.used = 0;
    }
    if (this.used + cost > this.limitPerMinute) {
      throw new RateLimitError(
        `Local rate limit exceeded: ${this.used}/${this.limitPerMinute} in current minute`
      );
    }
    this.used += cost;
  }

  reset(): void {
    this.windowStart = Date.now();
    this.used = 0;
  }

  getUsed(): number {
    return this.used;
  }

  getRemaining(): number {
    return Math.max(0, this.limitPerMinute - this.used);
  }
}

/**
 * Rate limiter por segundo (para endpoints más restrictivos)
 */
export class SecondRateLimiter {
  private windowStart = Date.now();
  private used = 0;

  constructor(private limitPerSecond: number) {}

  take(cost = 1): void {
    const now = Date.now();
    if (now - this.windowStart >= 1_000) {
      this.windowStart = now;
      this.used = 0;
    }
    if (this.used + cost > this.limitPerSecond) {
      throw new RateLimitError(
        `Local rate limit exceeded: ${this.used}/${this.limitPerSecond} in current second`
      );
    }
    this.used += cost;
  }
}




/**
 * Simple token bucket per minute.
 * YEX menciona pesos por IP y UID; aquí controlamos "requests/min" genérico.
 * Ajusta weights si quieres.
 * 
 * YEX global limits:
 * - 12,000/min por IP
 * - 60,000/min por UID
 */
export class MinuteRateLimiter {
  private windowStart = Date.now();
  private used = 0;

  constructor(private limitPerMinute: number) {}

  take(cost = 1): void {
    const now = Date.now();
    if (now - this.windowStart >= 60_000) {
      this.windowStart = now;
      this.used = 0;
    }
    if (this.used + cost > this.limitPerMinute) {
      throw new RateLimitError(
        `Local rate limit exceeded: ${this.used}/${this.limitPerMinute} in current minute`
      );
    }
    this.used += cost;
  }

  reset(): void {
    this.windowStart = Date.now();
    this.used = 0;
  }

  getUsed(): number {
    return this.used;
  }

  getRemaining(): number {
    return Math.max(0, this.limitPerMinute - this.used);
  }
}

/**
 * Rate limiter por segundo (para endpoints más restrictivos)
 */
export class SecondRateLimiter {
  private windowStart = Date.now();
  private used = 0;

  constructor(private limitPerSecond: number) {}

  take(cost = 1): void {
    const now = Date.now();
    if (now - this.windowStart >= 1_000) {
      this.windowStart = now;
      this.used = 0;
    }
    if (this.used + cost > this.limitPerSecond) {
      throw new RateLimitError(
        `Local rate limit exceeded: ${this.used}/${this.limitPerSecond} in current second`
      );
    }
    this.used += cost;
  }
}





/**
 * Simple token bucket per minute.
 * YEX menciona pesos por IP y UID; aquí controlamos "requests/min" genérico.
 * Ajusta weights si quieres.
 * 
 * YEX global limits:
 * - 12,000/min por IP
 * - 60,000/min por UID
 */
export class MinuteRateLimiter {
  private windowStart = Date.now();
  private used = 0;

  constructor(private limitPerMinute: number) {}

  take(cost = 1): void {
    const now = Date.now();
    if (now - this.windowStart >= 60_000) {
      this.windowStart = now;
      this.used = 0;
    }
    if (this.used + cost > this.limitPerMinute) {
      throw new RateLimitError(
        `Local rate limit exceeded: ${this.used}/${this.limitPerMinute} in current minute`
      );
    }
    this.used += cost;
  }

  reset(): void {
    this.windowStart = Date.now();
    this.used = 0;
  }

  getUsed(): number {
    return this.used;
  }

  getRemaining(): number {
    return Math.max(0, this.limitPerMinute - this.used);
  }
}

/**
 * Rate limiter por segundo (para endpoints más restrictivos)
 */
export class SecondRateLimiter {
  private windowStart = Date.now();
  private used = 0;

  constructor(private limitPerSecond: number) {}

  take(cost = 1): void {
    const now = Date.now();
    if (now - this.windowStart >= 1_000) {
      this.windowStart = now;
      this.used = 0;
    }
    if (this.used + cost > this.limitPerSecond) {
      throw new RateLimitError(
        `Local rate limit exceeded: ${this.used}/${this.limitPerSecond} in current second`
      );
    }
    this.used += cost;
  }
}




/**
 * Simple token bucket per minute.
 * YEX menciona pesos por IP y UID; aquí controlamos "requests/min" genérico.
 * Ajusta weights si quieres.
 * 
 * YEX global limits:
 * - 12,000/min por IP
 * - 60,000/min por UID
 */
export class MinuteRateLimiter {
  private windowStart = Date.now();
  private used = 0;

  constructor(private limitPerMinute: number) {}

  take(cost = 1): void {
    const now = Date.now();
    if (now - this.windowStart >= 60_000) {
      this.windowStart = now;
      this.used = 0;
    }
    if (this.used + cost > this.limitPerMinute) {
      throw new RateLimitError(
        `Local rate limit exceeded: ${this.used}/${this.limitPerMinute} in current minute`
      );
    }
    this.used += cost;
  }

  reset(): void {
    this.windowStart = Date.now();
    this.used = 0;
  }

  getUsed(): number {
    return this.used;
  }

  getRemaining(): number {
    return Math.max(0, this.limitPerMinute - this.used);
  }
}

/**
 * Rate limiter por segundo (para endpoints más restrictivos)
 */
export class SecondRateLimiter {
  private windowStart = Date.now();
  private used = 0;

  constructor(private limitPerSecond: number) {}

  take(cost = 1): void {
    const now = Date.now();
    if (now - this.windowStart >= 1_000) {
      this.windowStart = now;
      this.used = 0;
    }
    if (this.used + cost > this.limitPerSecond) {
      throw new RateLimitError(
        `Local rate limit exceeded: ${this.used}/${this.limitPerSecond} in current second`
      );
    }
    this.used += cost;
  }
}




/**
 * Simple token bucket per minute.
 * YEX menciona pesos por IP y UID; aquí controlamos "requests/min" genérico.
 * Ajusta weights si quieres.
 * 
 * YEX global limits:
 * - 12,000/min por IP
 * - 60,000/min por UID
 */
export class MinuteRateLimiter {
  private windowStart = Date.now();
  private used = 0;

  constructor(private limitPerMinute: number) {}

  take(cost = 1): void {
    const now = Date.now();
    if (now - this.windowStart >= 60_000) {
      this.windowStart = now;
      this.used = 0;
    }
    if (this.used + cost > this.limitPerMinute) {
      throw new RateLimitError(
        `Local rate limit exceeded: ${this.used}/${this.limitPerMinute} in current minute`
      );
    }
    this.used += cost;
  }

  reset(): void {
    this.windowStart = Date.now();
    this.used = 0;
  }

  getUsed(): number {
    return this.used;
  }

  getRemaining(): number {
    return Math.max(0, this.limitPerMinute - this.used);
  }
}

/**
 * Rate limiter por segundo (para endpoints más restrictivos)
 */
export class SecondRateLimiter {
  private windowStart = Date.now();
  private used = 0;

  constructor(private limitPerSecond: number) {}

  take(cost = 1): void {
    const now = Date.now();
    if (now - this.windowStart >= 1_000) {
      this.windowStart = now;
      this.used = 0;
    }
    if (this.used + cost > this.limitPerSecond) {
      throw new RateLimitError(
        `Local rate limit exceeded: ${this.used}/${this.limitPerSecond} in current second`
      );
    }
    this.used += cost;
  }
}




/**
 * Simple token bucket per minute.
 * YEX menciona pesos por IP y UID; aquí controlamos "requests/min" genérico.
 * Ajusta weights si quieres.
 * 
 * YEX global limits:
 * - 12,000/min por IP
 * - 60,000/min por UID
 */
export class MinuteRateLimiter {
  private windowStart = Date.now();
  private used = 0;

  constructor(private limitPerMinute: number) {}

  take(cost = 1): void {
    const now = Date.now();
    if (now - this.windowStart >= 60_000) {
      this.windowStart = now;
      this.used = 0;
    }
    if (this.used + cost > this.limitPerMinute) {
      throw new RateLimitError(
        `Local rate limit exceeded: ${this.used}/${this.limitPerMinute} in current minute`
      );
    }
    this.used += cost;
  }

  reset(): void {
    this.windowStart = Date.now();
    this.used = 0;
  }

  getUsed(): number {
    return this.used;
  }

  getRemaining(): number {
    return Math.max(0, this.limitPerMinute - this.used);
  }
}

/**
 * Rate limiter por segundo (para endpoints más restrictivos)
 */
export class SecondRateLimiter {
  private windowStart = Date.now();
  private used = 0;

  constructor(private limitPerSecond: number) {}

  take(cost = 1): void {
    const now = Date.now();
    if (now - this.windowStart >= 1_000) {
      this.windowStart = now;
      this.used = 0;
    }
    if (this.used + cost > this.limitPerSecond) {
      throw new RateLimitError(
        `Local rate limit exceeded: ${this.used}/${this.limitPerSecond} in current second`
      );
    }
    this.used += cost;
  }
}





/**
 * Simple token bucket per minute.
 * YEX menciona pesos por IP y UID; aquí controlamos "requests/min" genérico.
 * Ajusta weights si quieres.
 * 
 * YEX global limits:
 * - 12,000/min por IP
 * - 60,000/min por UID
 */
export class MinuteRateLimiter {
  private windowStart = Date.now();
  private used = 0;

  constructor(private limitPerMinute: number) {}

  take(cost = 1): void {
    const now = Date.now();
    if (now - this.windowStart >= 60_000) {
      this.windowStart = now;
      this.used = 0;
    }
    if (this.used + cost > this.limitPerMinute) {
      throw new RateLimitError(
        `Local rate limit exceeded: ${this.used}/${this.limitPerMinute} in current minute`
      );
    }
    this.used += cost;
  }

  reset(): void {
    this.windowStart = Date.now();
    this.used = 0;
  }

  getUsed(): number {
    return this.used;
  }

  getRemaining(): number {
    return Math.max(0, this.limitPerMinute - this.used);
  }
}

/**
 * Rate limiter por segundo (para endpoints más restrictivos)
 */
export class SecondRateLimiter {
  private windowStart = Date.now();
  private used = 0;

  constructor(private limitPerSecond: number) {}

  take(cost = 1): void {
    const now = Date.now();
    if (now - this.windowStart >= 1_000) {
      this.windowStart = now;
      this.used = 0;
    }
    if (this.used + cost > this.limitPerSecond) {
      throw new RateLimitError(
        `Local rate limit exceeded: ${this.used}/${this.limitPerSecond} in current second`
      );
    }
    this.used += cost;
  }
}




/**
 * Simple token bucket per minute.
 * YEX menciona pesos por IP y UID; aquí controlamos "requests/min" genérico.
 * Ajusta weights si quieres.
 * 
 * YEX global limits:
 * - 12,000/min por IP
 * - 60,000/min por UID
 */
export class MinuteRateLimiter {
  private windowStart = Date.now();
  private used = 0;

  constructor(private limitPerMinute: number) {}

  take(cost = 1): void {
    const now = Date.now();
    if (now - this.windowStart >= 60_000) {
      this.windowStart = now;
      this.used = 0;
    }
    if (this.used + cost > this.limitPerMinute) {
      throw new RateLimitError(
        `Local rate limit exceeded: ${this.used}/${this.limitPerMinute} in current minute`
      );
    }
    this.used += cost;
  }

  reset(): void {
    this.windowStart = Date.now();
    this.used = 0;
  }

  getUsed(): number {
    return this.used;
  }

  getRemaining(): number {
    return Math.max(0, this.limitPerMinute - this.used);
  }
}

/**
 * Rate limiter por segundo (para endpoints más restrictivos)
 */
export class SecondRateLimiter {
  private windowStart = Date.now();
  private used = 0;

  constructor(private limitPerSecond: number) {}

  take(cost = 1): void {
    const now = Date.now();
    if (now - this.windowStart >= 1_000) {
      this.windowStart = now;
      this.used = 0;
    }
    if (this.used + cost > this.limitPerSecond) {
      throw new RateLimitError(
        `Local rate limit exceeded: ${this.used}/${this.limitPerSecond} in current second`
      );
    }
    this.used += cost;
  }
}




/**
 * Simple token bucket per minute.
 * YEX menciona pesos por IP y UID; aquí controlamos "requests/min" genérico.
 * Ajusta weights si quieres.
 * 
 * YEX global limits:
 * - 12,000/min por IP
 * - 60,000/min por UID
 */
export class MinuteRateLimiter {
  private windowStart = Date.now();
  private used = 0;

  constructor(private limitPerMinute: number) {}

  take(cost = 1): void {
    const now = Date.now();
    if (now - this.windowStart >= 60_000) {
      this.windowStart = now;
      this.used = 0;
    }
    if (this.used + cost > this.limitPerMinute) {
      throw new RateLimitError(
        `Local rate limit exceeded: ${this.used}/${this.limitPerMinute} in current minute`
      );
    }
    this.used += cost;
  }

  reset(): void {
    this.windowStart = Date.now();
    this.used = 0;
  }

  getUsed(): number {
    return this.used;
  }

  getRemaining(): number {
    return Math.max(0, this.limitPerMinute - this.used);
  }
}

/**
 * Rate limiter por segundo (para endpoints más restrictivos)
 */
export class SecondRateLimiter {
  private windowStart = Date.now();
  private used = 0;

  constructor(private limitPerSecond: number) {}

  take(cost = 1): void {
    const now = Date.now();
    if (now - this.windowStart >= 1_000) {
      this.windowStart = now;
      this.used = 0;
    }
    if (this.used + cost > this.limitPerSecond) {
      throw new RateLimitError(
        `Local rate limit exceeded: ${this.used}/${this.limitPerSecond} in current second`
      );
    }
    this.used += cost;
  }
}




/**
 * Simple token bucket per minute.
 * YEX menciona pesos por IP y UID; aquí controlamos "requests/min" genérico.
 * Ajusta weights si quieres.
 * 
 * YEX global limits:
 * - 12,000/min por IP
 * - 60,000/min por UID
 */
export class MinuteRateLimiter {
  private windowStart = Date.now();
  private used = 0;

  constructor(private limitPerMinute: number) {}

  take(cost = 1): void {
    const now = Date.now();
    if (now - this.windowStart >= 60_000) {
      this.windowStart = now;
      this.used = 0;
    }
    if (this.used + cost > this.limitPerMinute) {
      throw new RateLimitError(
        `Local rate limit exceeded: ${this.used}/${this.limitPerMinute} in current minute`
      );
    }
    this.used += cost;
  }

  reset(): void {
    this.windowStart = Date.now();
    this.used = 0;
  }

  getUsed(): number {
    return this.used;
  }

  getRemaining(): number {
    return Math.max(0, this.limitPerMinute - this.used);
  }
}

/**
 * Rate limiter por segundo (para endpoints más restrictivos)
 */
export class SecondRateLimiter {
  private windowStart = Date.now();
  private used = 0;

  constructor(private limitPerSecond: number) {}

  take(cost = 1): void {
    const now = Date.now();
    if (now - this.windowStart >= 1_000) {
      this.windowStart = now;
      this.used = 0;
    }
    if (this.used + cost > this.limitPerSecond) {
      throw new RateLimitError(
        `Local rate limit exceeded: ${this.used}/${this.limitPerSecond} in current second`
      );
    }
    this.used += cost;
  }
}





/**
 * Simple token bucket per minute.
 * YEX menciona pesos por IP y UID; aquí controlamos "requests/min" genérico.
 * Ajusta weights si quieres.
 * 
 * YEX global limits:
 * - 12,000/min por IP
 * - 60,000/min por UID
 */
export class MinuteRateLimiter {
  private windowStart = Date.now();
  private used = 0;

  constructor(private limitPerMinute: number) {}

  take(cost = 1): void {
    const now = Date.now();
    if (now - this.windowStart >= 60_000) {
      this.windowStart = now;
      this.used = 0;
    }
    if (this.used + cost > this.limitPerMinute) {
      throw new RateLimitError(
        `Local rate limit exceeded: ${this.used}/${this.limitPerMinute} in current minute`
      );
    }
    this.used += cost;
  }

  reset(): void {
    this.windowStart = Date.now();
    this.used = 0;
  }

  getUsed(): number {
    return this.used;
  }

  getRemaining(): number {
    return Math.max(0, this.limitPerMinute - this.used);
  }
}

/**
 * Rate limiter por segundo (para endpoints más restrictivos)
 */
export class SecondRateLimiter {
  private windowStart = Date.now();
  private used = 0;

  constructor(private limitPerSecond: number) {}

  take(cost = 1): void {
    const now = Date.now();
    if (now - this.windowStart >= 1_000) {
      this.windowStart = now;
      this.used = 0;
    }
    if (this.used + cost > this.limitPerSecond) {
      throw new RateLimitError(
        `Local rate limit exceeded: ${this.used}/${this.limitPerSecond} in current second`
      );
    }
    this.used += cost;
  }
}




/**
 * Simple token bucket per minute.
 * YEX menciona pesos por IP y UID; aquí controlamos "requests/min" genérico.
 * Ajusta weights si quieres.
 * 
 * YEX global limits:
 * - 12,000/min por IP
 * - 60,000/min por UID
 */
export class MinuteRateLimiter {
  private windowStart = Date.now();
  private used = 0;

  constructor(private limitPerMinute: number) {}

  take(cost = 1): void {
    const now = Date.now();
    if (now - this.windowStart >= 60_000) {
      this.windowStart = now;
      this.used = 0;
    }
    if (this.used + cost > this.limitPerMinute) {
      throw new RateLimitError(
        `Local rate limit exceeded: ${this.used}/${this.limitPerMinute} in current minute`
      );
    }
    this.used += cost;
  }

  reset(): void {
    this.windowStart = Date.now();
    this.used = 0;
  }

  getUsed(): number {
    return this.used;
  }

  getRemaining(): number {
    return Math.max(0, this.limitPerMinute - this.used);
  }
}

/**
 * Rate limiter por segundo (para endpoints más restrictivos)
 */
export class SecondRateLimiter {
  private windowStart = Date.now();
  private used = 0;

  constructor(private limitPerSecond: number) {}

  take(cost = 1): void {
    const now = Date.now();
    if (now - this.windowStart >= 1_000) {
      this.windowStart = now;
      this.used = 0;
    }
    if (this.used + cost > this.limitPerSecond) {
      throw new RateLimitError(
        `Local rate limit exceeded: ${this.used}/${this.limitPerSecond} in current second`
      );
    }
    this.used += cost;
  }
}




/**
 * Simple token bucket per minute.
 * YEX menciona pesos por IP y UID; aquí controlamos "requests/min" genérico.
 * Ajusta weights si quieres.
 * 
 * YEX global limits:
 * - 12,000/min por IP
 * - 60,000/min por UID
 */
export class MinuteRateLimiter {
  private windowStart = Date.now();
  private used = 0;

  constructor(private limitPerMinute: number) {}

  take(cost = 1): void {
    const now = Date.now();
    if (now - this.windowStart >= 60_000) {
      this.windowStart = now;
      this.used = 0;
    }
    if (this.used + cost > this.limitPerMinute) {
      throw new RateLimitError(
        `Local rate limit exceeded: ${this.used}/${this.limitPerMinute} in current minute`
      );
    }
    this.used += cost;
  }

  reset(): void {
    this.windowStart = Date.now();
    this.used = 0;
  }

  getUsed(): number {
    return this.used;
  }

  getRemaining(): number {
    return Math.max(0, this.limitPerMinute - this.used);
  }
}

/**
 * Rate limiter por segundo (para endpoints más restrictivos)
 */
export class SecondRateLimiter {
  private windowStart = Date.now();
  private used = 0;

  constructor(private limitPerSecond: number) {}

  take(cost = 1): void {
    const now = Date.now();
    if (now - this.windowStart >= 1_000) {
      this.windowStart = now;
      this.used = 0;
    }
    if (this.used + cost > this.limitPerSecond) {
      throw new RateLimitError(
        `Local rate limit exceeded: ${this.used}/${this.limitPerSecond} in current second`
      );
    }
    this.used += cost;
  }
}




/**
 * Simple token bucket per minute.
 * YEX menciona pesos por IP y UID; aquí controlamos "requests/min" genérico.
 * Ajusta weights si quieres.
 * 
 * YEX global limits:
 * - 12,000/min por IP
 * - 60,000/min por UID
 */
export class MinuteRateLimiter {
  private windowStart = Date.now();
  private used = 0;

  constructor(private limitPerMinute: number) {}

  take(cost = 1): void {
    const now = Date.now();
    if (now - this.windowStart >= 60_000) {
      this.windowStart = now;
      this.used = 0;
    }
    if (this.used + cost > this.limitPerMinute) {
      throw new RateLimitError(
        `Local rate limit exceeded: ${this.used}/${this.limitPerMinute} in current minute`
      );
    }
    this.used += cost;
  }

  reset(): void {
    this.windowStart = Date.now();
    this.used = 0;
  }

  getUsed(): number {
    return this.used;
  }

  getRemaining(): number {
    return Math.max(0, this.limitPerMinute - this.used);
  }
}

/**
 * Rate limiter por segundo (para endpoints más restrictivos)
 */
export class SecondRateLimiter {
  private windowStart = Date.now();
  private used = 0;

  constructor(private limitPerSecond: number) {}

  take(cost = 1): void {
    const now = Date.now();
    if (now - this.windowStart >= 1_000) {
      this.windowStart = now;
      this.used = 0;
    }
    if (this.used + cost > this.limitPerSecond) {
      throw new RateLimitError(
        `Local rate limit exceeded: ${this.used}/${this.limitPerSecond} in current second`
      );
    }
    this.used += cost;
  }
}




/**
 * Simple token bucket per minute.
 * YEX menciona pesos por IP y UID; aquí controlamos "requests/min" genérico.
 * Ajusta weights si quieres.
 * 
 * YEX global limits:
 * - 12,000/min por IP
 * - 60,000/min por UID
 */
export class MinuteRateLimiter {
  private windowStart = Date.now();
  private used = 0;

  constructor(private limitPerMinute: number) {}

  take(cost = 1): void {
    const now = Date.now();
    if (now - this.windowStart >= 60_000) {
      this.windowStart = now;
      this.used = 0;
    }
    if (this.used + cost > this.limitPerMinute) {
      throw new RateLimitError(
        `Local rate limit exceeded: ${this.used}/${this.limitPerMinute} in current minute`
      );
    }
    this.used += cost;
  }

  reset(): void {
    this.windowStart = Date.now();
    this.used = 0;
  }

  getUsed(): number {
    return this.used;
  }

  getRemaining(): number {
    return Math.max(0, this.limitPerMinute - this.used);
  }
}

/**
 * Rate limiter por segundo (para endpoints más restrictivos)
 */
export class SecondRateLimiter {
  private windowStart = Date.now();
  private used = 0;

  constructor(private limitPerSecond: number) {}

  take(cost = 1): void {
    const now = Date.now();
    if (now - this.windowStart >= 1_000) {
      this.windowStart = now;
      this.used = 0;
    }
    if (this.used + cost > this.limitPerSecond) {
      throw new RateLimitError(
        `Local rate limit exceeded: ${this.used}/${this.limitPerSecond} in current second`
      );
    }
    this.used += cost;
  }
}




/**
 * Simple token bucket per minute.
 * YEX menciona pesos por IP y UID; aquí controlamos "requests/min" genérico.
 * Ajusta weights si quieres.
 * 
 * YEX global limits:
 * - 12,000/min por IP
 * - 60,000/min por UID
 */
export class MinuteRateLimiter {
  private windowStart = Date.now();
  private used = 0;

  constructor(private limitPerMinute: number) {}

  take(cost = 1): void {
    const now = Date.now();
    if (now - this.windowStart >= 60_000) {
      this.windowStart = now;
      this.used = 0;
    }
    if (this.used + cost > this.limitPerMinute) {
      throw new RateLimitError(
        `Local rate limit exceeded: ${this.used}/${this.limitPerMinute} in current minute`
      );
    }
    this.used += cost;
  }

  reset(): void {
    this.windowStart = Date.now();
    this.used = 0;
  }

  getUsed(): number {
    return this.used;
  }

  getRemaining(): number {
    return Math.max(0, this.limitPerMinute - this.used);
  }
}

/**
 * Rate limiter por segundo (para endpoints más restrictivos)
 */
export class SecondRateLimiter {
  private windowStart = Date.now();
  private used = 0;

  constructor(private limitPerSecond: number) {}

  take(cost = 1): void {
    const now = Date.now();
    if (now - this.windowStart >= 1_000) {
      this.windowStart = now;
      this.used = 0;
    }
    if (this.used + cost > this.limitPerSecond) {
      throw new RateLimitError(
        `Local rate limit exceeded: ${this.used}/${this.limitPerSecond} in current second`
      );
    }
    this.used += cost;
  }
}




/**
 * Simple token bucket per minute.
 * YEX menciona pesos por IP y UID; aquí controlamos "requests/min" genérico.
 * Ajusta weights si quieres.
 * 
 * YEX global limits:
 * - 12,000/min por IP
 * - 60,000/min por UID
 */
export class MinuteRateLimiter {
  private windowStart = Date.now();
  private used = 0;

  constructor(private limitPerMinute: number) {}

  take(cost = 1): void {
    const now = Date.now();
    if (now - this.windowStart >= 60_000) {
      this.windowStart = now;
      this.used = 0;
    }
    if (this.used + cost > this.limitPerMinute) {
      throw new RateLimitError(
        `Local rate limit exceeded: ${this.used}/${this.limitPerMinute} in current minute`
      );
    }
    this.used += cost;
  }

  reset(): void {
    this.windowStart = Date.now();
    this.used = 0;
  }

  getUsed(): number {
    return this.used;
  }

  getRemaining(): number {
    return Math.max(0, this.limitPerMinute - this.used);
  }
}

/**
 * Rate limiter por segundo (para endpoints más restrictivos)
 */
export class SecondRateLimiter {
  private windowStart = Date.now();
  private used = 0;

  constructor(private limitPerSecond: number) {}

  take(cost = 1): void {
    const now = Date.now();
    if (now - this.windowStart >= 1_000) {
      this.windowStart = now;
      this.used = 0;
    }
    if (this.used + cost > this.limitPerSecond) {
      throw new RateLimitError(
        `Local rate limit exceeded: ${this.used}/${this.limitPerSecond} in current second`
      );
    }
    this.used += cost;
  }
}




/**
 * Simple token bucket per minute.
 * YEX menciona pesos por IP y UID; aquí controlamos "requests/min" genérico.
 * Ajusta weights si quieres.
 * 
 * YEX global limits:
 * - 12,000/min por IP
 * - 60,000/min por UID
 */
export class MinuteRateLimiter {
  private windowStart = Date.now();
  private used = 0;

  constructor(private limitPerMinute: number) {}

  take(cost = 1): void {
    const now = Date.now();
    if (now - this.windowStart >= 60_000) {
      this.windowStart = now;
      this.used = 0;
    }
    if (this.used + cost > this.limitPerMinute) {
      throw new RateLimitError(
        `Local rate limit exceeded: ${this.used}/${this.limitPerMinute} in current minute`
      );
    }
    this.used += cost;
  }

  reset(): void {
    this.windowStart = Date.now();
    this.used = 0;
  }

  getUsed(): number {
    return this.used;
  }

  getRemaining(): number {
    return Math.max(0, this.limitPerMinute - this.used);
  }
}

/**
 * Rate limiter por segundo (para endpoints más restrictivos)
 */
export class SecondRateLimiter {
  private windowStart = Date.now();
  private used = 0;

  constructor(private limitPerSecond: number) {}

  take(cost = 1): void {
    const now = Date.now();
    if (now - this.windowStart >= 1_000) {
      this.windowStart = now;
      this.used = 0;
    }
    if (this.used + cost > this.limitPerSecond) {
      throw new RateLimitError(
        `Local rate limit exceeded: ${this.used}/${this.limitPerSecond} in current second`
      );
    }
    this.used += cost;
  }
}







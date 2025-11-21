/**
 * Amount Value Object
 * Representa un monto monetario con validación
 */

export class Amount {
  private readonly value: number;

  private constructor(value: number) {
    this.value = value;
  }

  static create(amount: number | string): Amount {
    const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

    if (isNaN(numericAmount)) {
      throw new Error(`Invalid amount: ${amount} is not a valid number`);
    }

    if (numericAmount <= 0) {
      throw new Error(`Amount must be greater than zero. Received: ${numericAmount}`);
    }

    if (!Number.isFinite(numericAmount)) {
      throw new Error(`Amount must be a finite number. Received: ${numericAmount}`);
    }

    // Redondear a 2 decimales
    const rounded = Math.round(numericAmount * 100) / 100;

    return new Amount(rounded);
  }

  getValue(): number {
    return this.value;
  }

  getFormatted(locale: string = 'en-US'): string {
    return this.value.toLocaleString(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  toFixed(decimals: number = 2): string {
    return this.value.toFixed(decimals);
  }

  equals(other: Amount): boolean {
    return this.value === other.value;
  }

  greaterThan(other: Amount): boolean {
    return this.value > other.value;
  }

  lessThan(other: Amount): boolean {
    return this.value < other.value;
  }

  toString(): string {
    return this.value.toFixed(2);
  }
}


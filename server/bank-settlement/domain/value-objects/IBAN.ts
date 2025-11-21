/**
 * IBAN Value Object
 * Valida formato básico de IBAN
 */

export class IBAN {
  private readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  static create(iban: string): IBAN {
    const cleaned = iban.replace(/\s+/g, '').toUpperCase();

    // Validación básica de longitud y formato
    if (cleaned.length < 15 || cleaned.length > 34) {
      throw new Error(`Invalid IBAN length: ${cleaned.length}. Must be between 15-34 characters.`);
    }

    // Debe empezar con 2 letras (código de país)
    if (!/^[A-Z]{2}/.test(cleaned)) {
      throw new Error(`Invalid IBAN format: must start with 2-letter country code`);
    }

    // Resto debe ser alfanumérico
    if (!/^[A-Z]{2}[0-9A-Z]+$/.test(cleaned)) {
      throw new Error(`Invalid IBAN format: contains invalid characters`);
    }

    return new IBAN(cleaned);
  }

  getValue(): string {
    return this.value;
  }

  getFormatted(): string {
    // Formato legible: AE69 0260 0010 2538 1452 402
    return this.value.replace(/(.{4})/g, '$1 ').trim();
  }

  equals(other: IBAN): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}


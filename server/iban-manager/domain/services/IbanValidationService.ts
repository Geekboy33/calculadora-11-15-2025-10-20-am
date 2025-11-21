/**
 * IBAN Validation Service
 * Valida IBANs según ISO 13616
 */

export interface IbanValidationResult {
  isValid: boolean;
  errors: string[];
  lengthValid: boolean;
  checkDigitsValid: boolean;
  formatValid: boolean;
}

export class IbanValidationService {
  /**
   * Valida IBAN completo
   */
  validate(iban: string, expectedCountry?: string): IbanValidationResult {
    const errors: string[] = [];
    let lengthValid = false;
    let checkDigitsValid = false;
    let formatValid = false;

    try {
      // 1. Limpiar y uppercase
      const cleaned = iban.replace(/\s+/g, '').toUpperCase();

      // 2. Validar formato básico
      if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/.test(cleaned)) {
        errors.push('Invalid IBAN format. Must start with 2 letters + 2 digits');
        return { isValid: false, errors, lengthValid, checkDigitsValid, formatValid };
      }

      formatValid = true;

      const countryCode = cleaned.substring(0, 2);
      const checkDigits = cleaned.substring(2, 4);
      const bban = cleaned.substring(4);

      // 3. Validar país esperado
      if (expectedCountry && countryCode !== expectedCountry) {
        errors.push(`Expected country ${expectedCountry}, got ${countryCode}`);
      }

      // 4. Validar longitud según país
      const expectedLength = this.getExpectedLength(countryCode);
      if (expectedLength > 0 && cleaned.length !== expectedLength) {
        errors.push(`Invalid length for ${countryCode}. Expected ${expectedLength}, got ${cleaned.length}`);
      } else {
        lengthValid = true;
      }

      // 5. Validar check digits con mod 97
      const isCheckDigitValid = this.validateCheckDigits(cleaned);
      if (!isCheckDigitValid) {
        errors.push('Invalid check digits. IBAN mod 97 validation failed');
      } else {
        checkDigitsValid = true;
      }

    } catch (error: any) {
      errors.push(error.message || 'Unexpected validation error');
    }

    const isValid = errors.length === 0;

    return {
      isValid,
      errors,
      lengthValid,
      checkDigitsValid,
      formatValid
    };
  }

  /**
   * Valida check digits usando algoritmo mod 97
   */
  private validateCheckDigits(iban: string): boolean {
    try {
      // 1. Mover primeros 4 caracteres al final
      const rearranged = iban.substring(4) + iban.substring(0, 4);

      // 2. Convertir a numérico
      const numericString = this.convertToNumeric(rearranged);

      // 3. Calcular mod 97
      const remainder = this.mod97(numericString);

      // 4. Resultado debe ser 1 para IBAN válido
      return remainder === 1;

    } catch (error) {
      return false;
    }
  }

  /**
   * Convierte alfanumérico a numérico
   */
  private convertToNumeric(input: string): string {
    let result = '';
    
    for (const char of input) {
      if (char >= '0' && char <= '9') {
        result += char;
      } else if (char >= 'A' && char <= 'Z') {
        result += (char.charCodeAt(0) - 'A'.charCodeAt(0) + 10).toString();
      } else {
        throw new Error(`Invalid character: ${char}`);
      }
    }

    return result;
  }

  /**
   * Mod 97 para strings numéricos largos
   */
  private mod97(numericString: string): number {
    let remainder = 0;

    for (let i = 0; i < numericString.length; i++) {
      remainder = (remainder * 10 + parseInt(numericString[i], 10)) % 97;
    }

    return remainder;
  }

  /**
   * Longitudes esperadas por país
   */
  private getExpectedLength(countryCode: string): number {
    const lengths: Record<string, number> = {
      'AE': 23,
      'DE': 22,
      'ES': 24,
      'GB': 22,
      'FR': 27,
      'IT': 27,
      'NL': 18,
      'BE': 16,
      'CH': 21,
      'AT': 20
    };

    return lengths[countryCode] || 0;
  }

  /**
   * Formatea IBAN para display (con espacios cada 4 chars)
   */
  formatForDisplay(iban: string): string {
    const cleaned = iban.replace(/\s+/g, '').toUpperCase();
    return cleaned.replace(/(.{4})/g, '$1 ').trim();
  }
}


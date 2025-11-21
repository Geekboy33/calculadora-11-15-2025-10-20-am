/**
 * IBAN Generation Service
 * Implementa algoritmo ISO 13616 (mod 97) para generación de IBANs
 */

import { CountryCode } from '../value-objects/CountryCode';

export interface IbanComponents {
  countryCode: string;
  bankCode: string;
  branchCode?: string;
  accountNumber: string;
}

export class IbanGenerationService {
  /**
   * Genera IBAN completo con check digits según ISO 13616
   */
  generateIban(components: IbanComponents): string {
    const { countryCode, bankCode, branchCode, accountNumber } = components;

    // 1. Construir BBAN según país
    const bban = this.buildBBAN(countryCode, bankCode, branchCode, accountNumber);

    // 2. Calcular check digits con mod 97
    const checkDigits = this.calculateCheckDigits(countryCode, bban);

    // 3. Construir IBAN final
    const iban = `${countryCode}${checkDigits}${bban}`;

    console.log('[IbanGenerationService] IBAN generado:', {
      country: countryCode,
      checkDigits,
      bban,
      iban
    });

    return iban;
  }

  /**
   * Construye BBAN (Basic Bank Account Number) según país
   */
  private buildBBAN(
    countryCode: string,
    bankCode: string,
    branchCode: string | undefined,
    accountNumber: string
  ): string {
    switch (countryCode) {
      case 'AE':
        // UAE: 3 digit bank code + 16 digit account number
        return this.padLeft(bankCode, 3, '0') + this.padLeft(accountNumber, 16, '0');

      case 'DE':
        // Germany: 8 digit BLZ (bank code) + 10 digit account
        return this.padLeft(bankCode, 8, '0') + this.padLeft(accountNumber, 10, '0');

      case 'ES':
        // Spain: 4 bank + 4 branch + 2 control + 10 account
        const branch = branchCode || '0000';
        const controlDigits = this.calculateSpanishControl(bankCode, branch, accountNumber);
        return this.padLeft(bankCode, 4, '0') + 
               this.padLeft(branch, 4, '0') + 
               controlDigits + 
               this.padLeft(accountNumber, 10, '0');

      default:
        throw new Error(`BBAN format not defined for country: ${countryCode}`);
    }
  }

  /**
   * Calcula check digits según ISO 13616 usando mod 97
   */
  private calculateCheckDigits(countryCode: string, bban: string): string {
    // 1. Mover país + "00" al final
    const rearranged = bban + countryCode + '00';

    // 2. Convertir letras a números (A=10, B=11, ..., Z=35)
    const numericString = this.convertToNumeric(rearranged);

    // 3. Calcular mod 97
    const remainder = this.mod97(numericString);

    // 4. Check digits = 98 - remainder
    const checkDigits = 98 - remainder;

    // 5. Pad con cero a la izquierda si es necesario
    return this.padLeft(checkDigits.toString(), 2, '0');
  }

  /**
   * Convierte string alfanumérico a string numérico
   * A=10, B=11, ..., Z=35
   */
  private convertToNumeric(input: string): string {
    let result = '';
    
    for (const char of input) {
      if (char >= '0' && char <= '9') {
        result += char;
      } else if (char >= 'A' && char <= 'Z') {
        // A=10, B=11, ..., Z=35
        result += (char.charCodeAt(0) - 'A'.charCodeAt(0) + 10).toString();
      } else if (char >= 'a' && char <= 'z') {
        result += (char.charCodeAt(0) - 'a'.charCodeAt(0) + 10).toString();
      } else {
        throw new Error(`Invalid character in IBAN: ${char}`);
      }
    }

    return result;
  }

  /**
   * Calcula mod 97 de un string numérico muy largo
   * Necesario porque JavaScript no maneja BigInt mod directamente con strings
   */
  private mod97(numericString: string): number {
    let remainder = 0;

    for (let i = 0; i < numericString.length; i++) {
      remainder = (remainder * 10 + parseInt(numericString[i], 10)) % 97;
    }

    return remainder;
  }

  /**
   * Calcula dígitos de control para cuentas españolas
   * España requiere 2 dígitos de control adicionales
   */
  private calculateSpanishControl(
    bankCode: string,
    branchCode: string,
    accountNumber: string
  ): string {
    const weights = [1, 2, 4, 8, 5, 10, 9, 7, 3, 6];

    // Primer dígito: sobre banco + sucursal
    const part1 = '00' + bankCode + branchCode;
    let sum1 = 0;
    for (let i = 0; i < 10; i++) {
      sum1 += parseInt(part1[i], 10) * weights[i];
    }
    const digit1 = (11 - (sum1 % 11)) % 11;
    const control1 = digit1 === 10 ? '1' : digit1.toString();

    // Segundo dígito: sobre número de cuenta
    let sum2 = 0;
    for (let i = 0; i < 10; i++) {
      sum2 += parseInt(accountNumber[i] || '0', 10) * weights[i];
    }
    const digit2 = (11 - (sum2 % 11)) % 11;
    const control2 = digit2 === 10 ? '1' : digit2.toString();

    return control1 + control2;
  }

  /**
   * Pad string con caracteres a la izquierda
   */
  private padLeft(value: string, length: number, padChar: string): string {
    return value.padStart(length, padChar);
  }

  /**
   * Valida longitud esperada según país
   */
  getExpectedLength(countryCode: string): number {
    const lengths: Record<string, number> = {
      'AE': 23,
      'DE': 22,
      'ES': 24,
      'GB': 22,
      'FR': 27,
      'IT': 27,
      'NL': 18,
      'BE': 16
    };

    return lengths[countryCode] || 0;
  }
}


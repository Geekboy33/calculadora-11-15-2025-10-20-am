/**
 * Exchange Rates Manager
 * Manages currency conversion rates for multi-currency dashboard
 */

export interface ExchangeRate {
  from: string;
  to: string;
  rate: number;
  lastUpdated: Date;
}

const EXCHANGE_RATES_KEY = 'exchange_rates';
const RATES_EXPIRY_HOURS = 24;

const DEFAULT_RATES: { [key: string]: { [key: string]: number } } = {
  USD: { USD: 1, EUR: 0.92, GBP: 0.79, CHF: 0.88, CAD: 1.35, AUD: 1.52, JPY: 149.50, CNY: 7.24, INR: 83.12, MXN: 17.05, BRL: 4.97, RUB: 92.50, KRW: 1329.50, SGD: 1.34, HKD: 7.83 },
  EUR: { USD: 1.09, EUR: 1, GBP: 0.86, CHF: 0.96, CAD: 1.47, AUD: 1.66, JPY: 162.80, CNY: 7.89, INR: 90.60, MXN: 18.58, BRL: 5.42, RUB: 100.80, KRW: 1448.70, SGD: 1.46, HKD: 8.53 },
  GBP: { USD: 1.27, EUR: 1.16, GBP: 1, CHF: 1.11, CAD: 1.71, AUD: 1.93, JPY: 189.24, CNY: 9.17, INR: 105.32, MXN: 21.60, BRL: 6.30, RUB: 117.18, KRW: 1684.00, SGD: 1.70, HKD: 9.92 },
  CHF: { USD: 1.14, EUR: 1.04, GBP: 0.90, CHF: 1, CAD: 1.54, AUD: 1.73, JPY: 170.00, CNY: 8.23, INR: 94.68, MXN: 19.42, BRL: 5.66, RUB: 105.30, KRW: 1513.60, SGD: 1.53, HKD: 8.91 },
  CAD: { USD: 0.74, EUR: 0.68, GBP: 0.58, CHF: 0.65, CAD: 1, AUD: 1.13, JPY: 110.74, CNY: 5.36, INR: 61.57, MXN: 12.63, BRL: 3.68, RUB: 68.52, KRW: 985.19, SGD: 0.99, HKD: 5.80 },
  AUD: { USD: 0.66, EUR: 0.60, GBP: 0.52, CHF: 0.58, CAD: 0.88, AUD: 1, JPY: 98.36, CNY: 4.76, INR: 54.68, MXN: 11.22, BRL: 3.27, RUB: 60.86, KRW: 875.00, SGD: 0.88, HKD: 5.15 },
  JPY: { USD: 0.0067, EUR: 0.0061, GBP: 0.0053, CHF: 0.0059, CAD: 0.0090, AUD: 0.0102, JPY: 1, CNY: 0.0484, INR: 0.5558, MXN: 0.1141, BRL: 0.0332, RUB: 0.6188, KRW: 8.8950, SGD: 0.0090, HKD: 0.0524 },
  CNY: { USD: 0.138, EUR: 0.127, GBP: 0.109, CHF: 0.122, CAD: 0.187, AUD: 0.210, JPY: 20.66, CNY: 1, INR: 11.48, MXN: 2.36, BRL: 0.69, RUB: 12.78, KRW: 183.68, SGD: 0.19, HKD: 1.08 },
  INR: { USD: 0.012, EUR: 0.011, GBP: 0.0095, CHF: 0.0106, CAD: 0.0162, AUD: 0.0183, JPY: 1.80, CNY: 0.087, INR: 1, MXN: 0.205, BRL: 0.060, RUB: 1.113, KRW: 15.99, SGD: 0.016, HKD: 0.094 },
  MXN: { USD: 0.059, EUR: 0.054, GBP: 0.046, CHF: 0.051, CAD: 0.079, AUD: 0.089, JPY: 8.77, CNY: 0.424, INR: 4.87, MXN: 1, BRL: 0.291, RUB: 5.42, KRW: 77.99, SGD: 0.079, HKD: 0.459 },
  BRL: { USD: 0.201, EUR: 0.184, GBP: 0.159, CHF: 0.177, CAD: 0.272, AUD: 0.306, JPY: 30.09, CNY: 1.46, INR: 16.74, MXN: 3.44, BRL: 1, RUB: 18.61, KRW: 267.54, SGD: 0.270, HKD: 1.57 },
  RUB: { USD: 0.0108, EUR: 0.0099, GBP: 0.0085, CHF: 0.0095, CAD: 0.0146, AUD: 0.0164, JPY: 1.616, CNY: 0.078, INR: 0.899, MXN: 0.185, BRL: 0.054, RUB: 1, KRW: 14.37, SGD: 0.015, HKD: 0.085 },
  KRW: { USD: 0.00075, EUR: 0.00069, GBP: 0.00059, CHF: 0.00066, CAD: 0.00101, AUD: 0.00114, JPY: 0.1124, CNY: 0.0054, INR: 0.0625, MXN: 0.0128, BRL: 0.0037, RUB: 0.0696, KRW: 1, SGD: 0.0010, HKD: 0.0059 },
  SGD: { USD: 0.75, EUR: 0.69, GBP: 0.59, CHF: 0.65, CAD: 1.01, AUD: 1.14, JPY: 111.94, CNY: 5.42, INR: 62.24, MXN: 12.78, BRL: 3.72, RUB: 69.33, KRW: 996.64, SGD: 1, HKD: 5.86 },
  HKD: { USD: 0.128, EUR: 0.117, GBP: 0.101, CHF: 0.112, CAD: 0.172, AUD: 0.194, JPY: 19.08, CNY: 0.924, INR: 10.61, MXN: 2.18, BRL: 0.635, RUB: 11.82, KRW: 169.95, SGD: 0.171, HKD: 1 }
};

class ExchangeRatesManager {
  private rates: Map<string, Map<string, number>> = new Map();
  private lastUpdate: Date | null = null;

  constructor() {
    this.loadRates();
  }

  private loadRates(): void {
    try {
      const stored = localStorage.getItem(EXCHANGE_RATES_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        this.lastUpdate = new Date(data.lastUpdate);

        if (this.isExpired()) {
          console.log('[ExchangeRates] Rates expired, using defaults');
          this.initializeDefaultRates();
        } else {
          Object.keys(data.rates).forEach(from => {
            const ratesMap = new Map<string, number>();
            Object.keys(data.rates[from]).forEach(to => {
              ratesMap.set(to, data.rates[from][to]);
            });
            this.rates.set(from, ratesMap);
          });
          console.log('[ExchangeRates] Loaded rates from storage');
        }
      } else {
        this.initializeDefaultRates();
      }
    } catch (error) {
      console.error('[ExchangeRates] Error loading rates:', error);
      this.initializeDefaultRates();
    }
  }

  private initializeDefaultRates(): void {
    Object.keys(DEFAULT_RATES).forEach(from => {
      const ratesMap = new Map<string, number>();
      Object.keys(DEFAULT_RATES[from]).forEach(to => {
        ratesMap.set(to, DEFAULT_RATES[from][to]);
      });
      this.rates.set(from, ratesMap);
    });
    this.lastUpdate = new Date();
    this.saveRates();
    console.log('[ExchangeRates] Initialized default rates');
  }

  private saveRates(): void {
    try {
      const data: any = {
        lastUpdate: this.lastUpdate?.toISOString(),
        rates: {}
      };

      this.rates.forEach((ratesMap, from) => {
        data.rates[from] = {};
        ratesMap.forEach((rate, to) => {
          data.rates[from][to] = rate;
        });
      });

      localStorage.setItem(EXCHANGE_RATES_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('[ExchangeRates] Error saving rates:', error);
    }
  }

  private isExpired(): boolean {
    if (!this.lastUpdate) return true;
    const now = new Date();
    const diff = now.getTime() - this.lastUpdate.getTime();
    return diff > RATES_EXPIRY_HOURS * 60 * 60 * 1000;
  }

  convert(amount: number, from: string, to: string): number {
    if (from === to) return amount;

    const fromRates = this.rates.get(from);
    if (!fromRates) {
      console.warn(`[ExchangeRates] No rates for ${from}`);
      return amount;
    }

    const rate = fromRates.get(to);
    if (!rate) {
      console.warn(`[ExchangeRates] No rate for ${from} -> ${to}`);
      return amount;
    }

    return amount * rate;
  }

  getRate(from: string, to: string): number {
    if (from === to) return 1;

    const fromRates = this.rates.get(from);
    if (!fromRates) return 1;

    return fromRates.get(to) || 1;
  }

  getAllRates(from: string): Map<string, number> {
    return this.rates.get(from) || new Map();
  }

  getLastUpdate(): Date | null {
    return this.lastUpdate;
  }

  refreshRates(): void {
    this.initializeDefaultRates();
  }
}

export const exchangeRatesManager = new ExchangeRatesManager();

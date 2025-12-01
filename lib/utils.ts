import { clsx, type ClassValue } from 'clsx'
import { formatCurrencyByCodeSync, refreshCurrencyCache } from './currenciesManager'

// Initialize currency cache on module load
if (typeof window !== 'undefined') {
  refreshCurrencyCache()
}

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

/**
 * Format currency amount using the dynamic currency system
 * @param amount - The amount to format
 * @param currencyCode - Optional currency code (e.g., 'AED', 'USD', 'SAR'). If not provided, uses default currency.
 */
export function formatCurrency(amount: number, currencyCode?: string): string {
  return formatCurrencyByCodeSync(amount, currencyCode)
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num)
}

export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str
  return str.slice(0, length) + '...'
}



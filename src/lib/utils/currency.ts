/**
 * Converts centavos (integer) to pesos for display purposes.
 * @param centavos - Amount stored as an integer in centavos
 * @returns Peso amount as a float
 */
export function toPesos(centavos: number): number {
  return centavos / 100
}

/**
 * Converts a peso input value to centavos for database storage.
 * @param pesos - Amount in pesos (e.g. from a form input)
 * @returns Integer centavo amount (rounded)
 */
export function toCentavos(pesos: number): number {
  return Math.round(pesos * 100)
}

/**
 * Formats a centavo integer as a Philippine Peso string.
 * @param centavos - Amount stored as an integer in centavos
 * @returns Formatted string, e.g. "₱1,500.00"
 */
export function formatPHP(centavos: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(toPesos(centavos))
}

/**
 * Formats a centavo integer as a compact Philippine Peso string.
 * @param centavos - Amount stored as an integer in centavos
 * @returns Compact formatted string, e.g. "₱1.5K", "₱30K", "₱1.2M"
 */
export function formatPHPCompact(centavos: number): string {
  const pesos = toPesos(centavos)

  if (Math.abs(pesos) >= 1_000_000) {
    const value = pesos / 1_000_000
    const formatted = value % 1 === 0 ? `${value}` : value.toFixed(1)
    return `₱${formatted}M`
  }

  if (Math.abs(pesos) >= 1_000) {
    const value = pesos / 1_000
    const formatted = value % 1 === 0 ? `${value}` : value.toFixed(1)
    return `₱${formatted}K`
  }

  return formatPHP(centavos)
}

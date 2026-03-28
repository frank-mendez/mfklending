/// <reference types="vitest/globals" />

import { formatPHP, formatPHPCompact, toCentavos, toPesos } from '../currency'

describe('toPesos', () => {
  it('converts centavos to pesos', () => {
    expect(toPesos(150000)).toBe(1500)
    expect(toPesos(100)).toBe(1)
    expect(toPesos(0)).toBe(0)
  })

  it('handles sub-peso amounts', () => {
    expect(toPesos(50)).toBe(0.5)
    expect(toPesos(1)).toBe(0.01)
  })
})

describe('toCentavos', () => {
  it('converts pesos to centavos', () => {
    expect(toCentavos(1500)).toBe(150000)
    expect(toCentavos(1)).toBe(100)
    expect(toCentavos(0)).toBe(0)
  })

  it('rounds fractional centavos', () => {
    expect(toCentavos(0.015)).toBe(2) // 1.5 centavos rounds to 2
    expect(toCentavos(0.014)).toBe(1) // 1.4 centavos rounds to 1
  })

  it('roundtrip: toCentavos(toPesos(x)) === x', () => {
    expect(toCentavos(toPesos(150000))).toBe(150000)
    expect(toCentavos(toPesos(3000000))).toBe(3000000)
  })
})

describe('formatPHP', () => {
  it('formats centavos as peso currency string', () => {
    const result = formatPHP(150000)
    expect(result).toContain('1,500')
    expect(result).toContain('.00')
  })

  it('formats zero correctly', () => {
    const result = formatPHP(0)
    expect(result).toContain('0')
    expect(result).toContain('.00')
  })

  it('includes PHP currency symbol', () => {
    const result = formatPHP(3000000)
    // en-PH locale uses ₱ or PHP prefix
    expect(result).toMatch(/₱|PHP/)
  })
})

describe('formatPHPCompact', () => {
  it('formats amounts below ₱1,000 with full format', () => {
    const result = formatPHPCompact(50000) // ₱500
    expect(result).toMatch(/₱|PHP/)
  })

  it('formats amounts in thousands with K suffix', () => {
    expect(formatPHPCompact(150000)).toBe('₱1.5K') // ₱1,500
    expect(formatPHPCompact(3000000)).toBe('₱30K') // ₱30,000
    expect(formatPHPCompact(500000)).toBe('₱5K') // ₱5,000
  })

  it('formats round thousands without decimal', () => {
    expect(formatPHPCompact(1000000)).toBe('₱10K')
    expect(formatPHPCompact(10000000)).toBe('₱100K')
  })

  it('formats amounts in millions with M suffix', () => {
    expect(formatPHPCompact(100000000)).toBe('₱1M') // ₱1,000,000
    expect(formatPHPCompact(150000000)).toBe('₱1.5M') // ₱1,500,000
  })

  it('handles negative amounts in millions', () => {
    const result = formatPHPCompact(-100000000)
    expect(result).toContain('M')
  })

  it('handles negative amounts in thousands', () => {
    const result = formatPHPCompact(-1000000)
    expect(result).toContain('K')
  })
})

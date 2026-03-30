import { beforeEach, describe, expect, it } from 'vitest'
import { useFiltersStore } from '../filters.store'
import { useLoanFormStore } from '../loan-form.store'
import { useUIStore } from '../ui.store'

// ─── useFiltersStore ───────────────────────────────────────────────────────────
describe('useFiltersStore', () => {
  beforeEach(() => useFiltersStore.setState({ loanStatus: 'all', loanType: 'all', loanSearch: '' }))

  it('has correct default state', () => {
    const { loanStatus, loanType, loanSearch } = useFiltersStore.getState()
    expect(loanStatus).toBe('all')
    expect(loanType).toBe('all')
    expect(loanSearch).toBe('')
  })

  it('setLoanStatus updates status', () => {
    useFiltersStore.getState().setLoanStatus('active')
    expect(useFiltersStore.getState().loanStatus).toBe('active')
  })

  it('setLoanType updates type', () => {
    useFiltersStore.getState().setLoanType('flat_interest')
    expect(useFiltersStore.getState().loanType).toBe('flat_interest')
  })

  it('setLoanSearch updates search', () => {
    useFiltersStore.getState().setLoanSearch('Juan')
    expect(useFiltersStore.getState().loanSearch).toBe('Juan')
  })

  it('resetLoanFilters resets all to defaults', () => {
    useFiltersStore.getState().setLoanStatus('paid')
    useFiltersStore.getState().setLoanType('diminishing')
    useFiltersStore.getState().setLoanSearch('test')
    useFiltersStore.getState().resetLoanFilters()
    const { loanStatus, loanType, loanSearch } = useFiltersStore.getState()
    expect(loanStatus).toBe('all')
    expect(loanType).toBe('all')
    expect(loanSearch).toBe('')
  })
})

// ─── useLoanFormStore ──────────────────────────────────────────────────────────
describe('useLoanFormStore', () => {
  beforeEach(() => useLoanFormStore.getState().reset())

  it('has correct default state', () => {
    const state = useLoanFormStore.getState()
    expect(state.step).toBe(1)
    expect(state.borrowerId).toBeNull()
    expect(state.loanType).toBeNull()
    expect(state.principal).toBe(0)
    expect(state.termMonths).toBe(3)
    expect(state.startDate).toBe('')
    expect(state.purpose).toBe('')
  })

  it('setStep updates step', () => {
    useLoanFormStore.getState().setStep(2)
    expect(useLoanFormStore.getState().step).toBe(2)
  })

  it('setField updates borrowerId', () => {
    useLoanFormStore.getState().setField('borrowerId', 'abc-123')
    expect(useLoanFormStore.getState().borrowerId).toBe('abc-123')
  })

  it('setField updates principal', () => {
    useLoanFormStore.getState().setField('principal', 3000000)
    expect(useLoanFormStore.getState().principal).toBe(3000000)
  })

  it('setField updates loanType', () => {
    useLoanFormStore.getState().setField('loanType', 'diminishing')
    expect(useLoanFormStore.getState().loanType).toBe('diminishing')
  })

  it('reset returns to defaults after changes', () => {
    useLoanFormStore.getState().setStep(3)
    useLoanFormStore.getState().setField('borrowerId', 'xyz')
    useLoanFormStore.getState().reset()
    const state = useLoanFormStore.getState()
    expect(state.step).toBe(1)
    expect(state.borrowerId).toBeNull()
  })
})

// ─── useUIStore ────────────────────────────────────────────────────────────────
describe('useUIStore', () => {
  beforeEach(() => useUIStore.setState({ sidebarOpen: false }))

  it('has sidebarOpen false by default', () => {
    expect(useUIStore.getState().sidebarOpen).toBe(false)
  })

  it('setSidebarOpen sets to true', () => {
    useUIStore.getState().setSidebarOpen(true)
    expect(useUIStore.getState().sidebarOpen).toBe(true)
  })

  it('setSidebarOpen sets to false', () => {
    useUIStore.setState({ sidebarOpen: true })
    useUIStore.getState().setSidebarOpen(false)
    expect(useUIStore.getState().sidebarOpen).toBe(false)
  })

  it('toggleSidebar flips open to closed', () => {
    useUIStore.setState({ sidebarOpen: true })
    useUIStore.getState().toggleSidebar()
    expect(useUIStore.getState().sidebarOpen).toBe(false)
  })

  it('toggleSidebar flips closed to open', () => {
    useUIStore.getState().toggleSidebar()
    expect(useUIStore.getState().sidebarOpen).toBe(true)
  })
})

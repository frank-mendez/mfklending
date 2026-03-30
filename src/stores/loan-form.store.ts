import { create } from 'zustand'
import type { LoanType } from '@/types'

interface LoanFormState {
  step: 1 | 2 | 3
  borrowerId: string | null
  loanType: LoanType | null
  /** Principal in centavos */
  principal: number
  termMonths: number
  startDate: string
  purpose: string
}

interface LoanFormStore extends LoanFormState {
  setStep: (step: 1 | 2 | 3) => void
  setField: <K extends keyof LoanFormState>(field: K, value: LoanFormState[K]) => void
  reset: () => void
}

const defaultState: LoanFormState = {
  step: 1,
  borrowerId: null,
  loanType: null,
  principal: 0,
  termMonths: 3,
  startDate: '',
  purpose: '',
}

export const useLoanFormStore = create<LoanFormStore>((set) => ({
  ...defaultState,
  setStep: (step) => set({ step }),
  setField: (field, value) => set({ [field]: value } as Partial<LoanFormState>),
  reset: () => set(defaultState),
}))

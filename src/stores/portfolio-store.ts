import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface PortfolioStore {
  activePortfolioId: number | null
  setActivePortfolio: (id: number | null) => void
}

export const usePortfolioStore = create<PortfolioStore>()(
  persist(
    (set) => ({
      activePortfolioId: null,
      setActivePortfolio: (id) => set({ activePortfolioId: id }),
    }),
    { name: 'stocksense-portfolio' }
  )
)

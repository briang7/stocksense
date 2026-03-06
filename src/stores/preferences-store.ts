import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface Preferences {
  defaultInterval: string
  activeIndicators: string[]
  toggleIndicator: (indicator: string) => void
  setDefaultInterval: (interval: string) => void
}

export const usePreferencesStore = create<Preferences>()(
  persist(
    (set) => ({
      defaultInterval: '1d',
      activeIndicators: ['sma'],
      toggleIndicator: (indicator) =>
        set((s) => ({
          activeIndicators: s.activeIndicators.includes(indicator)
            ? s.activeIndicators.filter((i) => i !== indicator)
            : [...s.activeIndicators, indicator],
        })),
      setDefaultInterval: (interval) => set({ defaultInterval: interval }),
    }),
    { name: 'stocksense-preferences' }
  )
)

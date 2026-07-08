import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react'
import { isSameJalali, todayJalali, type JalaliDate } from '../lib/jalaliUtils'

type Ctx = {
  selected: JalaliDate
  setSelected: (d: JalaliDate) => void
  isSelected: (d: JalaliDate) => boolean
}

const SelectedDayContext = createContext<Ctx | null>(null)

export function SelectedDayProvider({ children }: { children: ReactNode }) {
  const [selected, setSelectedState] = useState<JalaliDate>(() => todayJalali())

  const setSelected = useCallback((d: JalaliDate) => {
    setSelectedState({ jy: d.jy, jm: d.jm, jd: d.jd })
  }, [])

  const isSelected = useCallback(
    (d: JalaliDate) => isSameJalali(d, selected),
    [selected],
  )

  const value: Ctx = { selected, setSelected, isSelected }

  return (
    <SelectedDayContext.Provider value={value}>
      {children}
    </SelectedDayContext.Provider>
  )
}

export function useSelectedDay(): Ctx {
  const ctx = useContext(SelectedDayContext)
  if (!ctx) throw new Error('useSelectedDay needs SelectedDayProvider')
  return ctx
}

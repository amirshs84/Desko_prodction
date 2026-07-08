import { Navigate, Route, Routes } from 'react-router-dom'
import { todayJalali } from './lib/jalaliUtils'
import { DayView } from './views/DayView'
import { HomeworkDashboard } from './views/HomeworkDashboard'
import { HomeworkDetail } from './views/HomeworkDetail'
import { MonthView } from './views/MonthView'
import { WeekView } from './views/WeekView'
import { YearView } from './views/YearView'

/** مسیرهای نسبی زیر /calendar/* */
export function UnifiedCalendar() {
  const t = todayJalali()
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-black">
      <Routes>
        <Route path="/" element={<Navigate to={`week/${t.jy}/${t.jm}/${t.jd}`} replace />} />
        <Route path="year/:jy" element={<YearView />} />
        <Route path="month/:jy/:jm" element={<MonthView />} />
        <Route path="week/:jy/:jm/:jd" element={<WeekView />} />
        <Route path="day/:jy/:jm/:jd" element={<DayView />} />
        <Route path="homework" element={<HomeworkDashboard />} />
        <Route path="homework/:id" element={<HomeworkDetail />} />
        <Route path="*" element={<Navigate to={`week/${t.jy}/${t.jm}/${t.jd}`} replace />} />
      </Routes>
    </div>
  )
}

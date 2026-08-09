import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import StudyTimer from './pages/StudyTimer';
import Courses from './pages/Courses';
import ManagerDashboardDemo from './pages/manager/ManagerDashboardDemo';
import StudentProfile from './pages/manager/StudentProfile';
import ConsultantDashboard from './pages/consultant/ConsultantDashboard';
import StudentProfilePage from './pages/consultant/student-profile/StudentProfilePage';
import SuperAdminDashboard from './pages/superadmin/SuperAdminDashboard';
import InstallApp from './pages/InstallApp';
import QuickNotes from './pages/QuickNotes';
import PDFReader from './pages/PDFReader';
import Settings from './pages/Settings';
import AiAssistant from './pages/AiAssistant';
import ExamResults from './pages/ExamResults';
import Achievements from './pages/Achievements';
import OnlineClass from './pages/OnlineClass';
import TodoList from './pages/TodoList';
import { UnifiedCalendar } from './calendar/UnifiedCalendar';
import { EventsProvider } from './calendar/context/EventsContext';
import { SelectedDayProvider } from './calendar/context/SelectedDayContext';
import BottomNav from './components/BottomNav';

function CalendarPage() {
  return (
    <EventsProvider>
      <SelectedDayProvider>
        <div className="h-full" style={{ paddingBottom: '5rem' }}>
          <UnifiedCalendar />
        </div>
        <BottomNav />
      </SelectedDayProvider>
    </EventsProvider>
  );
}

function App() {
  return (
    <ThemeProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />

          <Route path="/install-app" element={<InstallApp />} />

          {/* Student Routes */}
          <Route path="/timer"     element={<StudyTimer />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/courses"   element={<Courses />} />
          <Route path="/notes"         element={<QuickNotes />} />
          <Route path="/ai-assistant"  element={<AiAssistant />} />
          <Route path="/exam-results"  element={<ExamResults />} />
          <Route path="/achievements"  element={<Achievements />} />
          <Route path="/online-class"  element={<OnlineClass />} />
          <Route path="/todos"         element={<TodoList />} />
          <Route path="/pdf-reader"    element={<PDFReader />} />
          <Route path="/settings"      element={<Settings />} />
          <Route path="/calendar/*"    element={<CalendarPage />} />

          {/* Manager Routes */}
          <Route path="/manager"                      element={<ManagerDashboardDemo />} />
          <Route path="/manager-demo"                 element={<Navigate to="/manager" replace />} />
          <Route path="/manager/student/:userId"      element={<StudentProfile />} />

          {/* Consultant Routes */}
          <Route path="/consultant"                        element={<ConsultantDashboard />} />
          <Route path="/consultant/student/:userId/*"       element={<StudentProfilePage />} />

          {/* SuperAdmin Routes */}
          <Route path="/superadmin" element={<SuperAdminDashboard />} />

          {/* Legacy redirects */}
          <Route path="/home"        element={<Navigate to="/timer" replace />} />
          <Route path="/study-timer" element={<Navigate to="/timer" replace />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;

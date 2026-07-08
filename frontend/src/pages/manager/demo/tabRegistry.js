import { DashboardDesktop, DashboardMobile } from './tabs/DashboardTab';
import { StudentsDesktop, StudentsMobile } from './tabs/StudentsTab';
import { ClassesDesktop, ClassesMobile } from './tabs/ClassesTab';
import { TeachersDesktop, TeachersMobile } from './tabs/TeachersTab';
import { AttendanceDesktop, AttendanceMobile } from './tabs/AttendanceTab';
import { ExamsDesktop, ExamsMobile } from './tabs/ExamsTab';
import { GradesDesktop, GradesMobile } from './tabs/GradesTab';
import { ReportsDesktop, ReportsMobile } from './tabs/ReportsTab';
import { SettingsDesktop, SettingsMobile } from './tabs/SettingsTab';
import { SupportDesktop, SupportMobile } from './tabs/SupportTab';
import {
  MessagesDesktop, MessagesMobile,
  NotificationsDesktop, NotificationsMobile,
} from './tabs/MobileUtilityTabs';
import { DEFAULT_TAB_ID } from './constants/navItems';

export const TAB_REGISTRY = {
  dashboard: { Desktop: DashboardDesktop, Mobile: DashboardMobile },
  students: { Desktop: StudentsDesktop, Mobile: StudentsMobile },
  teachers: { Desktop: TeachersDesktop, Mobile: TeachersMobile },
  classes: { Desktop: ClassesDesktop, Mobile: ClassesMobile },
  attendance: { Desktop: AttendanceDesktop, Mobile: AttendanceMobile },
  exams: { Desktop: ExamsDesktop, Mobile: ExamsMobile },
  grades: { Desktop: GradesDesktop, Mobile: GradesMobile },
  reports: { Desktop: ReportsDesktop, Mobile: ReportsMobile },
  settings: { Desktop: SettingsDesktop, Mobile: SettingsMobile },
  support: { Desktop: SupportDesktop, Mobile: SupportMobile },
  messages: { Desktop: MessagesDesktop, Mobile: MessagesMobile },
  notifications: { Desktop: NotificationsDesktop, Mobile: NotificationsMobile },
};

export function resolveTab(tabId) {
  return TAB_REGISTRY[tabId] ?? TAB_REGISTRY[DEFAULT_TAB_ID];
}

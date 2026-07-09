/**
 * TanStack Query hooks for manager panel API.
 *
 * الگوی مشابه useDataQueries.js:
 *  - queryKey ثابت و قابل invalidate
 *  - staleTime پیش‌فرض از queryClient
 *  - mutationها بعد از موفقیت cache را invalidate می‌کنند
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { managerAPI, notificationAPI } from '../api/client';

const isLoggedIn = () => !!localStorage.getItem('isLoggedIn');

export const MANAGER_QUERY_KEYS = {
  classes: (filters = {}) => ['manager', 'classes', filters],
  classStudents: (classId, filters = {}) => ['manager', 'classes', classId, 'students', filters],
  students: (filters = {}) => ['manager', 'students', filters],
  dashboard: () => ['manager', 'dashboard'],
  attendance: (filters = {}) => ['manager', 'attendance', filters],
  notifications: () => ['manager', 'notifications'],
  notificationsUnread: () => ['manager', 'notifications', 'unread'],
  tickets: (filters = {}) => ['manager', 'tickets', filters],
  schoolSettings: () => ['manager', 'school', 'settings'],
};

function buildClassParams(filters) {
  const params = {};
  if (filters.search) params.search = filters.search;
  if (filters.grade) params.grade = filters.grade;
  if (filters.is_active !== '' && filters.is_active != null) {
    params.is_active = filters.is_active;
  }
  return params;
}

export function extractManagerClassError(err, fallback = 'خطا در انجام عملیات') {
  const data = err?.response?.data;
  return data?.code?.[0] || data?.name?.[0] || data?.grade?.[0] || data?.error || fallback;
}

export function extractManagerSettingsError(err, fallback = 'خطا در انجام عملیات') {
  const data = err?.response?.data;
  if (!data) return fallback;
  if (typeof data.error === 'string') return data.error;
  if (data.name?.[0]) return data.name[0];
  if (data.email?.[0]) return data.email[0];
  if (data.new_password_confirm?.[0]) return data.new_password_confirm[0];
  if (data.current_password?.[0]) return data.current_password[0];
  return fallback;
}

/** داشبورد KPI مدیر */
export function useManagerDashboardQuery({ enabled = true } = {}) {
  return useQuery({
    queryKey: MANAGER_QUERY_KEYS.dashboard(),
    queryFn: () => managerAPI.getDashboardKPI().then((r) => r.data),
    enabled: isLoggedIn() && enabled,
    staleTime: 0,
    refetchOnMount: 'always',
  });
}

/** حضور و غیاب مدیر (بر اساس StudySession) */
export function useManagerAttendanceQuery(filters = {}, { enabled = true } = {}) {
  const params = {};
  if (filters.date) params.date = filters.date;
  if (filters.class_id) params.class_id = filters.class_id;
  if (filters.search) params.search = filters.search;
  if (filters.page) params.page = filters.page;
  if (filters.page_size) params.page_size = filters.page_size;

  return useQuery({
    queryKey: MANAGER_QUERY_KEYS.attendance(params),
    queryFn: () => managerAPI.getAttendance(params).then((r) => r.data),
    enabled: isLoggedIn() && enabled,
    staleTime: 0,
    refetchOnMount: 'always',
  });
}

/** لیست کلاس‌های مدرسه */
export function useManagerClassesQuery(filters) {
  return useQuery({
    queryKey: MANAGER_QUERY_KEYS.classes(filters),
    queryFn: () => managerAPI.getClasses(buildClassParams(filters)).then((r) => r.data),
    enabled: isLoggedIn(),
    staleTime: 0,
    refetchOnMount: 'always',
  });
}

/** لیست دانش‌آموزان مدرسه (برای افزودن به کلاس) */
export function useManagerStudentsQuery(filters, { enabled = true } = {}) {
  return useQuery({
    queryKey: MANAGER_QUERY_KEYS.students(filters),
    queryFn: () => managerAPI.getStudentList(filters).then((r) => r.data),
    enabled: isLoggedIn() && enabled,
    // داده مدیر سریع عوض می‌شود؛ کش persist نباید رفرش را بلاک کند
    staleTime: 0,
    refetchOnMount: 'always',
  });
}

function invalidateManagerStudents(queryClient) {
  return queryClient.invalidateQueries({ queryKey: ['manager', 'students'] });
}

/** دانش‌آموزان یک کلاس */
export function useClassStudentsQuery(classId, { enabled = true, search = '', grade = '' } = {}) {
  const filters = {};
  if (search) filters.search = search;
  if (grade) filters.grade = grade;

  return useQuery({
    queryKey: MANAGER_QUERY_KEYS.classStudents(classId, filters),
    queryFn: () => managerAPI.getClassStudents(classId, filters).then((r) => r.data),
    enabled: isLoggedIn() && !!classId && enabled,
  });
}

function invalidateManagerClasses(queryClient) {
  return queryClient.invalidateQueries({ queryKey: ['manager', 'classes'] });
}

/** ایجاد کلاس جدید */
export function useCreateClassMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => managerAPI.createClass(data).then((r) => r.data),
    onSuccess: () => invalidateManagerClasses(queryClient),
  });
}

/** ویرایش کلاس */
export function useUpdateClassMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ classId, data }) => managerAPI.updateClass(classId, data).then((r) => r.data),
    onSuccess: () => invalidateManagerClasses(queryClient),
  });
}

/** حذف کلاس */
export function useDeleteClassMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (classId) => managerAPI.deleteClass(classId),
    onSuccess: () => invalidateManagerClasses(queryClient),
  });
}

/** افزودن دانش‌آموزان به کلاس */
export function useAddClassStudentsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ classId, studentIds }) =>
      managerAPI.addClassStudents(classId, studentIds).then((r) => r.data),
    onSuccess: (_data, { classId }) => {
      invalidateManagerClasses(queryClient);
      invalidateManagerStudents(queryClient);
      queryClient.invalidateQueries({ queryKey: ['manager', 'classes', classId, 'students'] });
    },
  });
}

/** حذف دانش‌آموز از کلاس */
export function useRemoveClassStudentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ classId, userId }) =>
      managerAPI.removeClassStudent(classId, userId).then((r) => r.data),
    onSuccess: (_data, { classId }) => {
      invalidateManagerClasses(queryClient);
      invalidateManagerStudents(queryClient);
      queryClient.invalidateQueries({ queryKey: ['manager', 'classes', classId, 'students'] });
    },
  });
}

/** invalidate دستی cache کلاس‌ها */
export function useInvalidateManagerClasses() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['manager', 'classes'] });
}

/** لیست اعلان‌های مدیر (همان endpoint دانش‌آموز) */
export function useManagerNotificationsQuery({ enabled = true } = {}) {
  return useQuery({
    queryKey: MANAGER_QUERY_KEYS.notifications(),
    queryFn: () => notificationAPI.getNotifications().then((r) => r.data),
    enabled: isLoggedIn() && enabled,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchInterval: 30_000,
  });
}

/** تعداد اعلان‌های نخوانده */
export function useManagerUnreadNotificationsQuery({ enabled = true } = {}) {
  return useQuery({
    queryKey: MANAGER_QUERY_KEYS.notificationsUnread(),
    queryFn: () => notificationAPI.getUnreadCount().then((r) => r.data),
    enabled: isLoggedIn() && enabled,
    staleTime: 0,
    refetchInterval: 30_000,
  });
}

/** علامت‌گذاری همه اعلان‌ها به‌عنوان خوانده‌شده */
export function useMarkAllNotificationsReadMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => notificationAPI.markAllRead().then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manager', 'notifications'] });
    },
  });
}

/** لیست پیام‌های مشاوره دانش‌آموزان */
export function useManagerTicketsQuery(filters = {}, { enabled = true } = {}) {
  const params = {};
  if (filters.search) params.search = filters.search;
  if (filters.grade) params.grade = filters.grade;
  if (filters.status) params.status = filters.status;

  return useQuery({
    queryKey: MANAGER_QUERY_KEYS.tickets(params),
    queryFn: () => managerAPI.getTickets(params).then((r) => r.data),
    enabled: isLoggedIn() && enabled,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchInterval: 30_000,
  });
}

/** پاسخ به پیام دانش‌آموز */
export function useReplyToTicketMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ ticketId, reply }) =>
      managerAPI.replyToTicket(ticketId, reply).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manager', 'tickets'] });
    },
  });
}

/** تنظیمات عمومی مدرسه */
export function useManagerSchoolSettingsQuery({ enabled = true } = {}) {
  return useQuery({
    queryKey: MANAGER_QUERY_KEYS.schoolSettings(),
    queryFn: () => managerAPI.getSchoolSettings().then((r) => r.data),
    enabled: isLoggedIn() && enabled,
    staleTime: 0,
    refetchOnMount: 'always',
  });
}

/** به‌روزرسانی اطلاعات مدرسه */
export function useUpdateManagerSchoolMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => managerAPI.updateSchoolSettings(data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MANAGER_QUERY_KEYS.schoolSettings() });
    },
  });
}

/** تغییر رمز عبور مدیر */
export function useManagerChangePasswordMutation() {
  return useMutation({
    mutationFn: (data) => managerAPI.changePassword(data).then((r) => r.data),
  });
}

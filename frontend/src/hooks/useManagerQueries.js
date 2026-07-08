/**
 * TanStack Query hooks for manager panel API.
 *
 * الگوی مشابه useDataQueries.js:
 *  - queryKey ثابت و قابل invalidate
 *  - staleTime پیش‌فرض از queryClient
 *  - mutationها بعد از موفقیت cache را invalidate می‌کنند
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { managerAPI } from '../api/client';

const isLoggedIn = () => !!localStorage.getItem('isLoggedIn');

export const MANAGER_QUERY_KEYS = {
  classes: (filters = {}) => ['manager', 'classes', filters],
  classStudents: (classId) => ['manager', 'classes', classId, 'students'],
  students: (filters = {}) => ['manager', 'students', filters],
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

/** لیست کلاس‌های مدرسه */
export function useManagerClassesQuery(filters) {
  return useQuery({
    queryKey: MANAGER_QUERY_KEYS.classes(filters),
    queryFn: () => managerAPI.getClasses(buildClassParams(filters)).then((r) => r.data),
    enabled: isLoggedIn(),
  });
}

/** لیست دانش‌آموزان مدرسه (برای افزودن به کلاس) */
export function useManagerStudentsQuery(filters, { enabled = true } = {}) {
  return useQuery({
    queryKey: MANAGER_QUERY_KEYS.students(filters),
    queryFn: () => managerAPI.getStudentList(filters).then((r) => r.data),
    enabled: isLoggedIn() && enabled,
  });
}

/** دانش‌آموزان یک کلاس */
export function useClassStudentsQuery(classId, { enabled = true } = {}) {
  return useQuery({
    queryKey: MANAGER_QUERY_KEYS.classStudents(classId),
    queryFn: () => managerAPI.getClassStudents(classId).then((r) => r.data),
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
      queryClient.invalidateQueries({ queryKey: MANAGER_QUERY_KEYS.classStudents(classId) });
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
      queryClient.invalidateQueries({ queryKey: MANAGER_QUERY_KEYS.classStudents(classId) });
    },
  });
}

/** invalidate دستی cache کلاس‌ها */
export function useInvalidateManagerClasses() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['manager', 'classes'] });
}

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
  classStudents: (classId, filters = {}) => ['manager', 'classes', classId, 'students', filters],
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

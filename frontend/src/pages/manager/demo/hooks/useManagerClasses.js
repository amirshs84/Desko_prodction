import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  useManagerClassesQuery,
  useCreateClassMutation,
  useUpdateClassMutation,
  useDeleteClassMutation,
  extractManagerClassError,
} from '../../../../hooks/useManagerQueries';

const PAGE_SIZE = 6;

const INITIAL_FILTERS = {
  search: '',
  grade: '',
  is_active: '',
};

export function useManagerClasses() {
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(filters.search.trim()), 350);
    return () => clearTimeout(timer);
  }, [filters.search]);

  const queryFilters = useMemo(
    () => ({
      search: debouncedSearch,
      grade: filters.grade,
      is_active: filters.is_active,
    }),
    [debouncedSearch, filters.grade, filters.is_active],
  );

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useManagerClassesQuery(queryFilters);

  const createMutation = useCreateClassMutation();
  const updateMutation = useUpdateClassMutation();
  const deleteMutation = useDeleteClassMutation();

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filters.grade, filters.is_active]);

  const classes = data?.classes ?? [];
  const meta = {
    count: data?.count ?? 0,
    active_count: data?.active_count ?? 0,
    total_students: data?.total_students ?? 0,
  };

  const errorMessage = isError
    ? (error?.response?.data?.error
      || (error?.response?.status === 403 ? 'دسترسی به پنل مدیریت ندارید' : 'خطا در بارگذاری کلاس‌ها'))
    : null;

  const totalPages = Math.max(1, Math.ceil(classes.length / PAGE_SIZE));
  const paginatedClasses = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return classes.slice(start, start + PAGE_SIZE);
  }, [classes, page]);

  const updateFilter = useCallback((key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const createClass = useCallback(async (formData) => {
    try {
      await createMutation.mutateAsync(formData);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: extractManagerClassError(err, 'خطا در ایجاد کلاس') };
    }
  }, [createMutation]);

  const updateClass = useCallback(async (classId, formData) => {
    try {
      await updateMutation.mutateAsync({ classId, data: formData });
      return { ok: true };
    } catch (err) {
      return { ok: false, error: extractManagerClassError(err, 'خطا در ویرایش کلاس') };
    }
  }, [updateMutation]);

  const deleteClass = useCallback(async (classId) => {
    try {
      await deleteMutation.mutateAsync(classId);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: extractManagerClassError(err, 'خطا در حذف کلاس') };
    }
  }, [deleteMutation]);

  const goToPage = useCallback((nextPage) => {
    setPage((p) => Math.min(Math.max(1, nextPage), totalPages));
  }, [totalPages]);

  const actionLoading = createMutation.isPending
    || updateMutation.isPending
    || deleteMutation.isPending;

  return {
    classes,
    paginatedClasses,
    meta,
    filters,
    updateFilter,
    page,
    totalPages,
    pageSize: PAGE_SIZE,
    goToPage,
    loading: isLoading,
    error: errorMessage,
    actionLoading,
    createClass,
    updateClass,
    deleteClass,
    refresh: refetch,
  };
}

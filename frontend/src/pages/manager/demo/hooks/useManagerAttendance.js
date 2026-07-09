import { useState, useEffect, useMemo, useCallback } from 'react';
import { useManagerAttendanceQuery } from '../../../../hooks/useManagerQueries';
import { transformAttendanceData } from '../utils/attendanceDataTransformers';

export function useManagerAttendance() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [classId, setClassId] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, classId]);

  const filters = useMemo(
    () => ({
      search: debouncedSearch,
      class_id: classId || undefined,
      page,
      page_size: 20,
    }),
    [debouncedSearch, classId, page],
  );

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useManagerAttendanceQuery(filters);

  const transformed = useMemo(() => transformAttendanceData(data), [data]);

  const errorMessage = isError
    ? (error?.response?.data?.error
      || (error?.response?.status === 403 ? 'دسترسی به پنل مدیریت ندارید' : 'خطا در بارگذاری حضور و غیاب'))
    : null;

  const goToPage = useCallback((nextPage) => {
    setPage((p) => Math.min(Math.max(1, nextPage), transformed.tableMeta.totalPages || 1));
  }, [transformed.tableMeta.totalPages]);

  return {
    ...transformed,
    search,
    setSearch,
    classId,
    setClassId,
    page,
    goToPage,
    loading: isLoading,
    error: errorMessage,
    refresh: refetch,
  };
}

import { useMemo } from 'react';
import { useManagerDashboardQuery } from '../../../../hooks/useManagerQueries';
import { transformDashboardData } from '../utils/dashboardDataTransformers';

export function useManagerDashboardData() {
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useManagerDashboardQuery();

  const dashboard = useMemo(() => transformDashboardData(data), [data]);

  const errorMessage = isError
    ? (error?.response?.data?.error
      || (error?.response?.status === 403 ? 'دسترسی به پنل مدیریت ندارید' : 'خطا در بارگذاری داشبورد'))
    : null;

  return {
    ...dashboard,
    loading: isLoading,
    error: errorMessage,
    refresh: refetch,
  };
}

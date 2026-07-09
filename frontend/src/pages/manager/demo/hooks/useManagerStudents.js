import { useMemo } from 'react';
import { useManagerStudentsQuery } from '../../../../hooks/useManagerQueries';
import {
  buildGradeAverageData,
  buildLowestGpaStudents,
  buildTopStudentsByGrade,
  buildMostActiveStudents,
  buildStudyTimeByGrade,
} from '../utils/studentDataTransformers';

export function useManagerStudents() {
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useManagerStudentsQuery({});

  const students = data?.students ?? [];

  const gradeAverageData = useMemo(() => buildGradeAverageData(), []);
  const lowestGpaStudents = useMemo(() => buildLowestGpaStudents(), []);
  const topStudentsByGrade = useMemo(
    () => buildTopStudentsByGrade(students),
    [students],
  );
  const mostActiveStudents = useMemo(
    () => buildMostActiveStudents(students),
    [students],
  );
  const studyTimeByGrade = useMemo(
    () => buildStudyTimeByGrade(students),
    [students],
  );

  const errorMessage = isError
    ? (error?.response?.data?.error
      || (error?.response?.status === 403 ? 'دسترسی به پنل مدیریت ندارید' : 'خطا در بارگذاری دانش‌آموزان'))
    : null;

  return {
    students,
    count: data?.count ?? 0,
    gradeAverageData,
    lowestGpaStudents,
    topStudentsByGrade,
    mostActiveStudents,
    studyTimeByGrade,
    loading: isLoading,
    error: errorMessage,
    refresh: refetch,
  };
}

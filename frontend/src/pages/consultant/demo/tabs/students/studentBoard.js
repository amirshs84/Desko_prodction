import { useEffect, useMemo, useState } from 'react';
import { useConsultantPreferences, useConsultantRoster } from '../../hooks/useConsultantQueries';
import { faNum } from '../../lib/format';
import { filterStudents } from './catalog';
import { GRADE_OPTIONS, PERIODS, formatDuration } from './rosterUtils';

const EMPTY = [];

function faDuration(seconds) {
  return faNum(formatDuration(seconds || 0));
}

function gradeText(grade) {
  const raw = String(grade ?? '').trim();
  if (!raw) return '—';
  if (raw.includes('پایه')) return raw;
  const found = GRADE_OPTIONS.find(([value]) => value === raw);
  return found ? `پایه ${found[1]}` : `پایه ${raw}`;
}

function bucketsFor(student, percent) {
  const buckets = ['all'];
  if (percent < 40) buckets.push('attention');
  if (percent >= 75) buckets.push('tops', 'top');
  if ((student.session_count || 0) > 0 || percent >= 50) buckets.push('active', 'recent');
  return buckets;
}

function liveCard(student, rank) {
  const percent = Math.round((Number(student.performance) || 0) * 100);
  const classes = (student.class_names || []).filter(Boolean);
  return {
    id: String(student.user_id),
    userId: student.user_id,
    name: (student.full_name || '').trim() || 'بدون نام',
    grade: gradeText(student.grade),
    gradeValue: String(student.grade ?? ''),
    track: classes.join('، ') || student.olympiad_field || '—',
    phone: student.phone_number || '',
    percent,
    daysAgo: null,
    status: percent < 40 ? 'attention' : 'active',
    rank,
    buckets: bucketsFor(student, percent),
    tags: student.tags || [],
    memberships: (student.groups || []).map((group) => group.name).filter(Boolean),
    studyHours: (Number(student.study_seconds) || 0) / 3600,
    studyLabel: faDuration(student.study_seconds),
    sessionsLabel: faNum(student.session_count ?? 0),
    testsLabel: student.test_count == null ? '—' : faNum(student.test_count),
    examLabel: student.last_exam_status || '—',
    live: true,
    lastSession: { date: '—', time: 'در پروفایل' },
    nextSession: { date: '—', time: 'در پروفایل' },
    note: 'جلسات، توضیحات و پیام‌ها در پروفایل همین دانش‌آموز است.',
  };
}

function catalogTags(student) {
  const tags = [...(student.tags || [])];
  const track = (student.track || '').trim();
  if (track && track !== '—') {
    const label = track.startsWith('#') ? track : `#${track}`;
    if (!tags.includes(label)) tags.push(label);
  }
  if (/یازدهم|دوازدهم/.test(student.grade || '') && !tags.includes('#کنکوری')) tags.push('#کنکوری');
  return tags;
}

function catalogCard(student) {
  const tags = catalogTags(student);
  return {
    ...student,
    userId: student.id,
    phone: student.phone || '',
    buckets: student.groups || ['all'],
    tags,
    memberships: student.memberships || [],
    studyHours: student.studyHours ?? null,
    studyLabel: student.studyHours == null ? '—' : `${faNum(student.studyHours)} ساعت`,
    sessionsLabel: '—',
    testsLabel: '—',
    examLabel: '—',
    live: false,
  };
}

function matchesGrade(student, grade) {
  if (!grade) return true;
  const label = GRADE_OPTIONS.find(([value]) => value === grade)?.[1] || grade;
  return student.gradeValue === grade || String(student.grade || '').includes(label);
}

function matchesText(student, search) {
  const query = search.trim();
  if (!query) return true;
  const haystack = `${student.name} ${student.grade} ${student.track} ${student.phone || ''} ${student.tags.join(' ')}`;
  return haystack.includes(query);
}

function matchesTag(student, tag) {
  const needle = tag.trim().replace(/^#/, '');
  if (!needle) return true;
  return student.tags.some((item) => item.replace(/^#/, '').includes(needle));
}

export function useStudentBoard(catalog, initialChip = 'all') {
  const [search, setSearch] = useState('');
  const [grade, setGrade] = useState('');
  const [tag, setTag] = useState('');
  const [minHours, setMinHours] = useState('');
  const [period, setPeriod] = useState('weekly');
  const [chip, setChip] = useState(initialChip);
  const [selected, setSelected] = useState(() => new Set());
  const [showCreate, setShowCreate] = useState(false);

  const filters = useMemo(() => {
    const next = { period };
    if (search.trim()) next.search = search.trim();
    if (grade) next.grade = grade;
    if (tag.trim()) next.tag = tag.trim();
    if (minHours !== '' && !Number.isNaN(Number(minHours))) next.min_study_hours = Number(minHours);
    return next;
  }, [grade, minHours, period, search, tag]);

  const baseline = useConsultantRoster({ period: 'weekly' });
  const roster = useConsultantRoster(filters);
  const { data: prefs } = useConsultantPreferences();
  const liveMode = (baseline.data?.students?.length || 0) > 0;
  const baselinePending = baseline.isLoading && !baseline.isFetched;
  const narrowed = Boolean(search.trim() || grade || tag.trim() || minHours !== '');

  const source = useMemo(() => {
    if (baselinePending) return EMPTY;
    if (liveMode) {
      const rows = roster.data?.students ?? EMPTY;
      const ranked = [...rows].sort((a, b) => (Number(b.performance) || 0) - (Number(a.performance) || 0));
      return ranked.map((student, index) => {
        const percent = Math.round((Number(student.performance) || 0) * 100);
        return liveCard(student, percent >= 75 ? index + 1 : null);
      });
    }
    return catalog.map(catalogCard).filter((student) => (
      matchesText(student, search)
      && matchesGrade(student, grade)
      && matchesTag(student, tag)
      && (minHours === '' || (student.studyHours != null && student.studyHours >= Number(minHours)))
    ));
  }, [baselinePending, catalog, grade, liveMode, minHours, roster.data, search, tag]);

  const students = useMemo(
    () => filterStudents(source.map((student) => ({ ...student, groups: student.buckets })), chip, ''),
    [chip, source],
  );

  useEffect(() => {
    setSelected(new Set());
    setShowCreate(false);
  }, [search, grade, tag, minHours, period, chip]);

  const toggleOne = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allSelected = students.length > 0 && students.every((student) => selected.has(student.id));
  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(students.map((student) => student.id)));
  };

  const visibleKeys = prefs?.visible_roster_columns;
  const showColumn = (key) => !visibleKeys?.length || visibleKeys.includes(key);

  const counts = useMemo(() => {
    const count = (id) => source.filter((student) => student.buckets.includes(id)).length;
    return {
      all: source.length,
      recent: count('recent'),
      tops: count('tops'),
      active: count('active'),
      attention: count('attention'),
      top: count('top'),
    };
  }, [source]);

  const selectedStudents = students.filter((student) => selected.has(student.id));
  const waiting = baselinePending || (liveMode && roster.isLoading && !roster.isFetched);
  const failed = liveMode ? roster.isError : (narrowed && roster.isError && !students.length);
  const errorMessage = (roster.error || baseline.error)?.response?.data?.error?.message || 'خطا در دریافت فهرست';

  return {
    search,
    setSearch,
    grade,
    setGrade,
    tag,
    setTag,
    minHours,
    setMinHours,
    period,
    setPeriod,
    chip,
    setChip,
    students,
    counts,
    liveMode,
    waiting,
    failed,
    errorMessage,
    refetch: roster.refetch,
    periodLabel: PERIODS.find((item) => item.id === period)?.label || '',
    selected,
    toggleOne,
    toggleAll,
    allSelected,
    clearSelected: () => setSelected(new Set()),
    showCreate,
    openCreate: () => setShowCreate(true),
    closeCreate: () => setShowCreate(false),
    selectedStudents,
    showColumn,
  };
}

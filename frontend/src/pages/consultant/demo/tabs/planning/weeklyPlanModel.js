import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { planningAPI } from '../../../../../api/client';
import {
  addDays,
  startOfPersianWeek,
  todayJalali,
  jalaliWeekDay,
} from '../../../../../calendar/lib/jalaliUtils';
import { JALALI_MONTHS, WEEKDAY_FULL } from '../../../../../calendar/lib/labels';
import { useConsultant } from '../../context/ConsultantContext';
import {
  CONSULTANT_KEYS,
  useConsultantGroups,
  useConsultantRoster,
  useConsultantStudents,
} from '../../hooks/useConsultantQueries';
import { faNum } from '../../lib/format';

export const GROUPS = [
  { id: 'exp-a', name: 'گروه کنکوری تجربی A', count: 15 },
  { id: 'math-b', name: 'گروه کنکوری ریاضی B', count: 12 },
  { id: 'human-10', name: 'گروه دهم انسانی', count: 9 },
];

export const PARTS = [1, 2, 3];

export const EXCEPTION_STUDENTS = ['سحر محمدی', 'پارسا محمدی', 'فاطمه رضایی', 'علی حسینی'];

export const EXTRA_SUBJECTS = ['ادبیات', 'عربی', 'زبان انگلیسی', 'دین و زندگی'];

export const TEST_CHIPS = [100, 50, 20];
export const HOUR_CHIPS = [3, 1.5, 1];

export const PRIORITY_HINT = ['حذف‌شدنی', 'مرور جزئی', 'عادی', 'مهم', 'آزمون/جمع‌بندی'];
export const MOVABILITY_HINT = ['میخ‌شده', 'کم', 'متوسط', 'زیاد', 'آزاد'];

export const ACTIVITIES = [
  { id: 'study', label: 'مطالعه' },
  { id: 'test', label: 'تست‌زنی' },
  { id: 'review', label: 'مرور' },
  { id: 'solve', label: 'حل سوال' },
];

export const INTENSITIES = [
  { id: 'light', label: 'سبک', hint: '۶۰ دقیقه + ۱۵ استراحت' },
  { id: 'normal', label: 'عادی', hint: '۹۰ دقیقه + ۱۵ استراحت' },
  { id: 'heavy', label: 'سنگین', hint: '۱۲۰ دقیقه + ۱۰ استراحت' },
];

export const SUBJECT_TONES = {
  'زیست‌شناسی': { bg: '#E8F6EE', border: '#C6E8D4', ink: '#1B6B43' },
  'شیمی': { bg: '#FFF4E8', border: '#F3D4B0', ink: '#9A5B16' },
  'ریاضی': { bg: '#E7F7EF', border: '#C3E6D4', ink: '#1B6B43' },
  'فیزیک': { bg: '#FDECEC', border: '#F4CACA', ink: '#A33B3B' },
  'ادبیات': { bg: '#EEF4FF', border: '#C9D8F5', ink: '#2C4C8A' },
  'عربی': { bg: '#F4EEFF', border: '#D9C9F5', ink: '#5B3A8A' },
  'زبان انگلیسی': { bg: '#EAF8FB', border: '#C3E4EC', ink: '#1E6674' },
  'دین و زندگی': { bg: '#F8F3E8', border: '#E6D7B8', ink: '#7A5A22' },
};

const DEFAULT_SUBJECTS = [
  { id: 'bio', name: 'زیست‌شناسی', amount: 150, unit: 'test', priority: 4, movability: 2, activity: 'test' },
  { id: 'chem', name: 'شیمی', amount: 4.5, unit: 'hour', priority: 3, movability: 2, activity: 'study' },
  { id: 'math', name: 'ریاضی', amount: 60, unit: 'test', priority: 3, movability: 1, activity: 'test' },
];

const MAX_RANGE_DAYS = 42;
let blockSeq = 1;

function pad(value) {
  return String(value).padStart(2, '0');
}

export function jalaliStr(date) {
  return `${date.jy}-${pad(date.jm)}-${pad(date.jd)}`;
}

export function dateKey(date) {
  return `${date.jy}${pad(date.jm)}${pad(date.jd)}`;
}

export function parseDateKey(id) {
  return {
    jy: Number(String(id).slice(0, 4)),
    jm: Number(String(id).slice(4, 6)),
    jd: Number(String(id).slice(6, 8)),
  };
}

export function cmpDate(a, b) {
  return (a.jy - b.jy) || (a.jm - b.jm) || (a.jd - b.jd);
}

export function datesInRange(start, end, max = MAX_RANGE_DAYS) {
  const [from, to] = cmpDate(start, end) <= 0 ? [start, end] : [end, start];
  const days = [];
  let cursor = from;
  for (let index = 0; index < max; index += 1) {
    days.push(cursor);
    if (jalaliStr(cursor) === jalaliStr(to)) return { days, clipped: false };
    cursor = addDays(cursor.jy, cursor.jm, cursor.jd, 1);
  }
  return { days, clipped: jalaliStr(days[days.length - 1]) !== jalaliStr(to) };
}

export function rangeLabel(start, end) {
  const [from, to] = cmpDate(start, end) <= 0 ? [start, end] : [end, start];
  if (from.jy === to.jy && from.jm === to.jm) {
    return `${faNum(from.jd)} تا ${faNum(to.jd)} ${JALALI_MONTHS[from.jm - 1]} ${faNum(from.jy)}`;
  }
  return `${faNum(from.jd)} ${JALALI_MONTHS[from.jm - 1]} تا ${faNum(to.jd)} ${JALALI_MONTHS[to.jm - 1]} ${faNum(to.jy)}`;
}

export function dayMeta(date) {
  const weekday = jalaliWeekDay(date.jy, date.jm, date.jd);
  return {
    id: dateKey(date),
    label: WEEKDAY_FULL[weekday],
    sub: faNum(date.jd),
    date,
  };
}

function currentWeekDays() {
  const today = todayJalali();
  const start = startOfPersianWeek(today.jy, today.jm, today.jd);
  const end = addDays(start.jy, start.jm, start.jd, 6);
  return datesInRange(start, end).days;
}

export function cellKey(dayId, part) {
  return `${dayId}-${part}`;
}

export function groupLabel(group) {
  return `${group.name} (${faNum(group.count)} نفر)`;
}

export function subjectTone(name) {
  return SUBJECT_TONES[name] || { bg: '#F4F7F5', border: '#D5E0DB', ink: '#17352C' };
}

export function formatAmount(amount, unit) {
  const value = Number(amount);
  const shown = Number.isInteger(value) ? String(value) : String(value);
  return unit === 'hour' ? `${faNum(shown)} ساعت` : `${faNum(shown)} تست`;
}

export function parseAmount(value) {
  const latin = String(value)
    .replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
    .replace(/[^\d.]/g, '');
  const amount = Number(latin);
  return Number.isFinite(amount) ? amount : 0;
}

export function stepAmount(amount, unit, direction) {
  if (unit === 'hour') {
    return Math.max(0.5, Math.round((Number(amount) + direction * 0.5) * 10) / 10);
  }
  return Math.max(10, Number(amount) + direction * 10);
}

function makeBlock(subject, amount, unit) {
  blockSeq += 1;
  return { id: `block-${blockSeq}`, subject, amount, unit };
}

function blankCells(dayIds) {
  const cells = {};
  dayIds.forEach((dayId) => {
    PARTS.forEach((part) => {
      cells[cellKey(dayId, part)] = null;
    });
  });
  return cells;
}

export function layoutFromSubjects(subjects, dayIds, offset = 0) {
  const cells = blankCells(dayIds);
  const slots = [];
  dayIds.forEach((dayId) => PARTS.forEach((part) => slots.push(cellKey(dayId, part))));
  if (!subjects.length || !slots.length) return cells;
  let cursor = offset % slots.length;
  const placeNext = (block) => {
    for (let step = 0; step < slots.length; step += 1) {
      const slot = slots[(cursor + step) % slots.length];
      if (!cells[slot]) {
        cells[slot] = block;
        cursor = (cursor + step + 1) % slots.length;
        return;
      }
    }
  };
  const ranked = [...subjects].sort(
    (a, b) => (Number(b.priority) || 0) - (Number(a.priority) || 0)
      || (Number(a.movability) || 0) - (Number(b.movability) || 0),
  );
  ranked.forEach((subject) => {
    const count = Math.min(3, Number(subject.priority) >= 4 ? 3 : Number(subject.priority) <= 2 ? 1 : 2);
    const share = subject.unit === 'hour'
      ? Math.max(0.5, Math.round((Number(subject.amount) / count) * 10) / 10)
      : Math.max(10, Math.round(Number(subject.amount) / count / 5) * 5);
    for (let index = 0; index < count; index += 1) {
      placeNext(makeBlock(subject.name, share, subject.unit));
    }
  });
  return cells;
}

function reshuffleCells(cells, dayIds) {
  const keys = dayIds.flatMap((dayId) => PARTS.map((part) => cellKey(dayId, part)));
  const blocks = keys.map((key) => cells[key]).filter(Boolean);
  for (let index = blocks.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [blocks[index], blocks[swap]] = [blocks[swap], blocks[index]];
  }
  const positions = [...keys];
  for (let index = positions.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [positions[index], positions[swap]] = [positions[swap], positions[index]];
  }
  const next = blankCells(dayIds);
  blocks.forEach((block, index) => {
    next[positions[index]] = block;
  });
  return next;
}

function newSubject(name, quick) {
  const unit = quick?.unit === 'hour' ? 'hour' : 'test';
  return {
    id: `extra-${name}-${Date.now()}`,
    name,
    amount: unit === 'hour' ? 2 : 40,
    unit,
    priority: 3,
    movability: 2,
    activity: unit === 'test' ? 'test' : 'study',
  };
}

function demandFromSubject(subject) {
  const unit = subject.unit === 'hour' ? 'minutes' : 'count';
  const amount = unit === 'minutes'
    ? Math.max(1, Math.round(Number(subject.amount) * 60))
    : Math.max(1, Math.round(Number(subject.amount)));
  return {
    subject: subject.name.trim(),
    amount,
    unit,
    activity: unit === 'count' ? 'test' : (subject.activity || 'study'),
    priority: Number(subject.priority) || 3,
    movability: Number(subject.movability) || 0,
  };
}

function interventionScore(members, rosterById) {
  if (!members?.length) return 1;
  const scores = members.map((member) => {
    const row = rosterById[member.user_id];
    return row?.performance != null ? 1 - Number(row.performance) : 0.5;
  });
  return scores.reduce((sum, value) => sum + value, 0) / scores.length;
}

function avgExecutionPercent(members, rosterById) {
  if (!members?.length) return null;
  const values = members
    .map((member) => rosterById[member.user_id]?.performance)
    .filter((value) => value != null)
    .map(Number);
  if (!values.length) return null;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 100);
}

export function buildInsights(groups, rosterById) {
  const insights = [];
  for (const group of groups.slice(0, 8)) {
    const members = group.members || [];
    if (!members.length) continue;
    const avg = avgExecutionPercent(members, rosterById);
    const weak = members
      .map((member) => ({ member, score: rosterById[member.user_id]?.performance ?? 0 }))
      .filter((item) => item.score < 0.35)
      .sort((a, b) => a.score - b.score);
    if (avg != null && avg < 45) {
      insights.push({
        id: `low-${group.id}`,
        groupId: group.id,
        text: `گروه «${group.name}» میانگین اجرای حدود ${faNum(avg)}٪ دارد؛ پیشنهاد می‌شود این هفته زمان جبرانی به برنامه اضافه شود.`,
        actionLabel: 'اعمال روی این گروه',
      });
    } else if (weak.length >= 2) {
      insights.push({
        id: `weak-${group.id}`,
        groupId: group.id,
        text: `در گروه «${group.name}» ${faNum(weak.length)} نفر عملکرد ضعیف دارند. اولویت مداخله با ${weak[0].member.full_name || 'اعضا'} است.`,
        actionLabel: 'انتخاب گروه',
      });
    }
  }
  if (!insights.length && groups.length) {
    insights.push({
      id: 'ok',
      groupId: groups[0].id,
      text: 'فعلاً افت شدید گروهی دیده نمی‌شود. می‌توانید یک الگوی سبک برای تثبیت برنامه اعمال کنید.',
      actionLabel: 'شروع با اولین گروه',
    });
  }
  return insights.slice(0, 3);
}

export function useWeeklyPlan() {
  const qc = useQueryClient();
  const { planningSeed, clearPlanningSeed, selectedGroupId, setSelectedGroupId, navigateToTab } = useConsultant();
  const groupsQuery = useConsultantGroups();
  const studentsQuery = useConsultantStudents();
  const rosterQuery = useConsultantRoster({ period: 'weekly' });
  const opening = currentWeekDays();

  const [audience, setAudience] = useState('group');
  const [groupId, setGroupId] = useState('');
  const [manualIds, setManualIds] = useState([]);
  const [range, setRangeState] = useState(() => ({
    start: opening[0],
    end: opening[opening.length - 1],
  }));
  const [intensity, setIntensity] = useState('normal');
  const [mode, setMode] = useState('suggested');
  const [goalMessage, setGoalMessage] = useState('');
  const [subjects, setSubjects] = useState(DEFAULT_SUBJECTS);
  const [draftName, setDraftName] = useState('');
  const [quick, setQuick] = useState({ unit: 'test', amount: 100 });
  const [dayIds, setDayIds] = useState(() => opening.map(dateKey));
  const [cells, setCells] = useState(() => layoutFromSubjects(DEFAULT_SUBJECTS, opening.map(dateKey)));
  const [excluded, setExcluded] = useState([]);
  const [excludedIds, setExcludedIds] = useState([]);
  const [committedIds, setCommittedIds] = useState([]);
  const [editingKey, setEditingKey] = useState(null);
  const [pickingKey, setPickingKey] = useState(null);
  const [notice, setNotice] = useState('');
  const [preview, setPreview] = useState(null);
  const [previewError, setPreviewError] = useState('');
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishResult, setPublishResult] = useState(null);
  const [publishError, setPublishError] = useState('');
  const [previewFilter, setPreviewFilter] = useState('all');
  const [previewSearch, setPreviewSearch] = useState('');
  const [calendarStudent, setCalendarStudent] = useState(null);
  const timer = useRef(null);
  const subjectsRef = useRef(subjects);
  subjectsRef.current = subjects;

  const liveGroups = useMemo(
    () => (Array.isArray(groupsQuery.data) ? groupsQuery.data : []),
    [groupsQuery.data],
  );
  const students = studentsQuery.data || [];
  const rosterById = useMemo(() => {
    const map = {};
    for (const row of rosterQuery.data?.students || []) map[row.user_id] = row;
    return map;
  }, [rosterQuery.data]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  useEffect(() => {
    if (!liveGroups.length) {
      if (groupsQuery.isFetched) {
        setGroupId((current) => current || GROUPS[0].id);
      }
      return;
    }
    setGroupId((current) => {
      const ids = liveGroups.map((group) => String(group.id));
      if (ids.includes(String(current))) return String(current);
      const seed = selectedGroupId != null ? String(selectedGroupId) : ids[0];
      return ids.includes(seed) ? seed : ids[0];
    });
  }, [liveGroups, groupsQuery.isFetched, selectedGroupId]);

  useEffect(() => {
    if (planningSeed?.groupId == null) return;
    setAudience('group');
    setGroupId(String(planningSeed.groupId));
    setSelectedGroupId(planningSeed.groupId);
    clearPlanningSeed();
  }, [planningSeed, clearPlanningSeed, setSelectedGroupId]);

  const flash = useCallback((message) => {
    setNotice(message);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setNotice(''), 3200);
  }, []);

  const days = useMemo(() => dayIds.map((id) => dayMeta(parseDateKey(id))), [dayIds]);

  const sortedGroups = useMemo(
    () => [...liveGroups].sort(
      (a, b) => interventionScore(b.members, rosterById) - interventionScore(a.members, rosterById),
    ),
    [liveGroups, rosterById],
  );

  const groupOptions = sortedGroups.length
    ? sortedGroups.map((group) => ({
      id: String(group.id),
      label: `${group.name} (${faNum(group.member_count ?? group.members?.length ?? 0)} نفر)`,
    }))
    : GROUPS.map((group) => ({ id: group.id, label: groupLabel(group) }));

  const usingSamples = groupsQuery.isFetched && liveGroups.length === 0;
  const groupValueLabel = groupOptions.find((option) => option.id === String(groupId))?.label
    || (groupsQuery.isFetched ? 'گروهی انتخاب نشده' : 'در حال دریافت گروه‌ها');

  const mutateCells = useCallback((updater) => {
    setPublishResult(null);
    setCells((prev) => (typeof updater === 'function' ? updater(prev) : updater));
  }, []);

  const setRange = useCallback((startDate, endDate) => {
    const { days: nextDays, clipped } = datesInRange(startDate, endDate);
    const ids = nextDays.map(dateKey);
    setRangeState({ start: nextDays[0], end: nextDays[nextDays.length - 1] });
    setDayIds(ids);
    setCells((prev) => {
      const next = blankCells(ids);
      let kept = false;
      ids.forEach((id) => {
        PARTS.forEach((part) => {
          const key = cellKey(id, part);
          if (prev[key]) {
            next[key] = prev[key];
            kept = true;
          }
        });
      });
      return kept ? next : layoutFromSubjects(subjectsRef.current, ids);
    });
    setEditingKey(null);
    setPickingKey(null);
    setPublishResult(null);
    if (clipped) flash(`بازه طولانی بود و روی ${faNum(MAX_RANGE_DAYS)} روز محدود شد`);
  }, [flash]);

  const chooseGroup = (id) => {
    setGroupId(String(id));
    const numeric = Number(id);
    if (Number.isFinite(numeric) && String(numeric) === String(id)) setSelectedGroupId(numeric);
  };

  const updateSubject = (id, patch) => {
    setSubjects((list) => list.map((subject) => (
      subject.id === id ? { ...subject, ...patch } : subject
    )));
  };

  const bumpSubject = (id, direction) => {
    setSubjects((list) => list.map((subject) => (
      subject.id === id
        ? { ...subject, amount: stepAmount(subject.amount, subject.unit, direction) }
        : subject
    )));
  };

  const applyChip = (id, value) => {
    setSubjects((list) => list.map((subject) => {
      if (subject.id !== id) return subject;
      if (subject.unit === 'hour') return { ...subject, amount: value };
      return { ...subject, amount: Number(subject.amount) + value };
    }));
  };

  const applyQuick = () => {
    const amount = Math.max(quick.unit === 'hour' ? 0.5 : 10, Number(quick.amount) || 0);
    setSubjects((list) => list.map((subject) => ({
      ...subject,
      unit: quick.unit,
      amount,
      activity: quick.unit === 'test' ? 'test' : (subject.activity === 'test' ? 'study' : subject.activity),
    })));
    flash(quick.unit === 'hour'
      ? `همه درس‌ها روی ${faNum(amount)} ساعت تنظیم شد`
      : `همه درس‌ها روی ${faNum(amount)} تست تنظیم شد`);
  };

  const addSubject = () => {
    const name = EXTRA_SUBJECTS.find((item) => !subjects.some((subject) => subject.name === item));
    if (!name) {
      flash('درس دیگری برای افزودن نمانده. نام درس را بنویسید.');
      return;
    }
    setSubjects((list) => [...list, newSubject(name, quick)]);
    flash(`${name} به فهرست درس‌ها اضافه شد`);
  };

  const addNamedSubject = () => {
    const name = draftName.trim();
    if (!name) {
      addSubject();
      return;
    }
    if (subjects.some((subject) => subject.name === name)) {
      flash('این درس در فهرست هست');
      return;
    }
    setSubjects((list) => [...list, newSubject(name, quick)]);
    setDraftName('');
    flash(`${name} به فهرست درس‌ها اضافه شد`);
  };

  const removeSubject = (id) => {
    if (subjects.length <= 1) {
      flash('حداقل یک درس باید بماند');
      return;
    }
    setSubjects((list) => list.filter((subject) => subject.id !== id));
  };

  const nameExcludedIds = (preview?.students || [])
    .filter((student) => excluded.includes(student.student_name))
    .map((student) => student.student_id);

  const buildBody = (overrides = {}) => {
    const dropIds = overrides.excludedIds ?? excludedIds;
    const doneIds = overrides.committedIds ?? committedIds;
    const removed = [...new Set([...dropIds, ...doneIds, ...nameExcludedIds])];
    const demands = subjects
      .filter((subject) => subject.name.trim() && Number(subject.amount) > 0)
      .map(demandFromSubject);
    if (!demands.length) return { error: 'حداقل یک درس با مقدار معتبر لازم است' };
    const body = {
      start: jalaliStr(range.start),
      end: jalaliStr(range.end),
      intensity,
      mode,
      demands,
    };
    if (audience === 'manual') {
      const ids = manualIds.filter((id) => !removed.includes(id));
      if (!ids.length) return { error: 'حداقل یک دانش‌آموز را برای انتخاب دستی مشخص کنید' };
      body.student_ids = ids;
      return { body };
    }
    if (!liveGroups.length) {
      return { error: 'گروه واقعی در دسترس نیست. انتخاب دستی را امتحان کنید یا اتصال را بررسی کنید.' };
    }
    if (!removed.length) {
      const numeric = Number(groupId);
      if (!Number.isFinite(numeric)) return { error: 'یک گروه واقعی انتخاب کنید' };
      body.group_id = numeric;
      return { body };
    }
    const group = liveGroups.find((item) => String(item.id) === String(groupId));
    const fromPreview = (preview?.students || [])
      .map((student) => student.student_id)
      .filter((id) => !removed.includes(id));
    const fromGroup = (group?.members || [])
      .map((member) => member.user_id)
      .filter((id) => !removed.includes(id));
    const ids = fromPreview.length ? fromPreview : fromGroup;
    if (!ids.length) return { error: 'کسی برای این انتشار نمانده است' };
    body.student_ids = ids;
    return { body };
  };

  const previewMutation = useMutation({
    mutationFn: (data) => planningAPI.previewPlan(data).then((response) => response.data),
    onSuccess: (data) => {
      setPreview(data);
      setPublishResult(null);
      setPreviewError('');
      flash('پیش‌نمایش گروهی آماده است');
    },
    onError: (err) => {
      const message = err?.response?.data?.error?.message || 'خطا در پیش‌نمایش';
      setPreviewError(message);
      flash('چیدمان محلی ساخته شد؛ پیش‌نمایش گروهی انجام نشد');
    },
  });

  const publishMutation = useMutation({
    mutationFn: (data) => planningAPI.publishPlan(data).then((response) => response.data),
    onSuccess: (data) => {
      setPublishResult(data);
      setPublishError('');
      flash(data?.mode === 'forced' ? 'برنامه به‌صورت قطعی منتشر شد' : 'برنامه به‌صورت پیشنهادی منتشر شد');
      qc.invalidateQueries({ queryKey: CONSULTANT_KEYS.plans() });
      qc.invalidateQueries({ queryKey: ['consultant', 'snapshots'] });
      qc.invalidateQueries({ queryKey: ['calendar_events'] });
    },
    onError: (err) => {
      setPublishError(err?.response?.data?.error?.message || 'خطا در انتشار');
    },
  });

  const generate = () => {
    if (!subjects.length || previewMutation.isPending) return;
    setEditingKey(null);
    setPickingKey(null);
    setExcludedIds([]);
    setCommittedIds([]);
    setCells(layoutFromSubjects(subjects, dayIds));
    const built = buildBody({ excludedIds: [], committedIds: [] });
    if (built.error) {
      setPreview(null);
      setPreviewError(built.error);
      flash('چیدمان محلی ساخته شد');
      return;
    }
    setPreviewError('');
    previewMutation.mutate(built.body);
  };

  const retryPreview = () => {
    const built = buildBody();
    if (built.error) {
      setPreviewError(built.error);
      return;
    }
    setPreviewError('');
    previewMutation.mutate(built.body);
  };

  const publish = () => {
    const built = buildBody();
    if (built.error) {
      setPublishError(built.error);
      return;
    }
    setPublishError('');
    publishMutation.mutate({
      ...built.body,
      mode,
      goal_message: goalMessage.trim(),
    });
  };

  const reshuffle = () => {
    setEditingKey(null);
    mutateCells((prev) => reshuffleCells(prev, dayIds));
    flash('کارت‌ها دوباره چیده شد');
  };

  const moveCell = (from, to) => {
    if (!from || !to || from === to) return;
    mutateCells((prev) => {
      const next = { ...prev };
      const source = next[from];
      next[from] = next[to];
      next[to] = source;
      return next;
    });
  };

  const updateCell = (key, patch) => {
    mutateCells((prev) => {
      if (!prev[key]) return prev;
      return { ...prev, [key]: { ...prev[key], ...patch } };
    });
  };

  const clearCell = (key) => {
    mutateCells((prev) => ({ ...prev, [key]: null }));
    setEditingKey(null);
  };

  const placeCell = (key, name) => {
    const subject = subjects.find((item) => item.name === name);
    const unit = subject?.unit || 'test';
    const amount = unit === 'hour' ? 1.5 : 30;
    mutateCells((prev) => ({ ...prev, [key]: makeBlock(name, amount, unit) }));
    setPickingKey(null);
    flash(`${name} در این خانه قرار گرفت`);
  };

  const openEdit = (key) => {
    setPickingKey(null);
    setEditingKey((current) => (current === key ? null : key));
  };

  const openPick = (key) => {
    setEditingKey(null);
    setPickingKey((current) => (current === key ? null : key));
  };

  const beginAddToGrid = () => {
    const key = dayIds
      .flatMap((dayId) => PARTS.map((part) => cellKey(dayId, part)))
      .find((slot) => !cells[slot]);
    if (!key) {
      flash('خانه خالی نمانده. یک کارت را حذف کنید یا چیدمان را عوض کنید.');
      return;
    }
    setEditingKey(null);
    setPickingKey(key);
  };

  const reorderDays = (fromId, toId) => {
    if (!fromId || !toId || fromId === toId) return;
    setDayIds((ids) => {
      const next = [...ids];
      const from = next.indexOf(fromId);
      const to = next.indexOf(toId);
      if (from < 0 || to < 0) return ids;
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  };

  const toggleExcluded = (name) => {
    setExcluded((list) => (
      list.includes(name) ? list.filter((item) => item !== name) : [...list, name]
    ));
  };

  const toggleManual = (id) => {
    setManualIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const toggleBatchExcluded = (id) => {
    setExcludedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const previewStudents = useMemo(() => {
    let list = (preview?.students || []).filter((student) => !committedIds.includes(student.student_id));
    if (previewFilter === 'ok') {
      list = list.filter((student) => !student.has_deadlock && !student.shortfall_minutes);
    }
    if (previewFilter === 'conflict') {
      list = list.filter((student) => student.has_deadlock || student.shortfall_minutes > 0);
    }
    const query = previewSearch.trim().toLowerCase();
    if (query) {
      list = list.filter((student) => (
        `${student.student_name || ''} ${student.student_id}`.toLowerCase().includes(query)
      ));
    }
    return list;
  }, [preview, committedIds, previewFilter, previewSearch]);

  const onIndividualCommitted = (studentId) => {
    setCommittedIds((prev) => [...prev, studentId]);
    setCalendarStudent(null);
    setPreview((prev) => {
      if (!prev) return prev;
      const studentsLeft = (prev.students || []).filter((student) => student.student_id !== studentId);
      return {
        ...prev,
        students: studentsLeft,
        total_blocks: studentsLeft.reduce((sum, student) => sum + (student.blocks?.length || 0), 0),
      };
    });
  };

  const selectedLiveGroup = liveGroups.find((group) => String(group.id) === String(groupId)) || null;

  return {
    audience,
    setAudience,
    groupId,
    setGroupId: chooseGroup,
    groupOptions,
    groupValueLabel,
    usingSamples,
    liveGroups: sortedGroups,
    selectedLiveGroup,
    rosterById,
    students,
    manualIds,
    toggleManual,
    range,
    setRange,
    intensity,
    setIntensity,
    mode,
    setMode,
    goalMessage,
    setGoalMessage,
    subjects,
    draftName,
    setDraftName,
    quick,
    setQuick,
    cells,
    days,
    dayIds,
    excluded,
    editingKey,
    pickingKey,
    notice,
    busy: previewMutation.isPending,
    publishing: publishMutation.isPending,
    preview,
    previewError,
    previewStudents,
    previewFilter,
    setPreviewFilter,
    previewSearch,
    setPreviewSearch,
    excludedIds,
    committedIds,
    toggleBatchExcluded,
    calendarStudent,
    setCalendarStudent,
    onIndividualCommitted,
    publishOpen,
    setPublishOpen,
    publishResult,
    publishError,
    updateSubject,
    bumpSubject,
    applyChip,
    applyQuick,
    addSubject,
    addNamedSubject,
    removeSubject,
    generate,
    retryPreview,
    publish,
    reshuffle,
    moveCell,
    updateCell,
    clearCell,
    placeCell,
    openEdit,
    openPick,
    beginAddToGrid,
    reorderDays,
    toggleExcluded,
    setEditingKey,
    setPickingKey,
    navigateToTab,
    resetPublish: () => {
      setPublishResult(null);
      setPublishError('');
      setPreview(null);
      setExcludedIds([]);
      setCommittedIds([]);
      setPublishOpen(false);
    },
  };
}

export function usePointerDrag(onDrop, { attr = 'data-cell', ignoreInteractive = true } = {}) {
  const drag = useRef(null);
  const [activeKey, setActiveKey] = useState(null);
  const [overKey, setOverKey] = useState(null);

  const start = (key) => ({
    onPointerDown: (event) => {
      if (event.button != null && event.button !== 0) return;
      if (ignoreInteractive && event.target.closest('button, input, select, textarea, [data-plan-popover], [data-no-drag]')) return;
      drag.current = { key, x: event.clientX, y: event.clientY, moved: false };
      setActiveKey(key);
      event.currentTarget.setPointerCapture?.(event.pointerId);
    },
    onPointerMove: (event) => {
      const current = drag.current;
      if (!current || current.key !== key) return;
      if (Math.hypot(event.clientX - current.x, event.clientY - current.y) > 8) current.moved = true;
      const element = document.elementFromPoint(event.clientX, event.clientY);
      setOverKey(element?.closest?.(`[${attr}]`)?.getAttribute(attr) || null);
    },
    onPointerUp: (event) => {
      const current = drag.current;
      drag.current = null;
      setActiveKey(null);
      setOverKey(null);
      if (!current?.moved) return;
      const element = document.elementFromPoint(event.clientX, event.clientY);
      const target = element?.closest?.(`[${attr}]`)?.getAttribute(attr);
      if (target && target !== current.key) onDrop(current.key, target);
    },
    onPointerCancel: () => {
      drag.current = null;
      setActiveKey(null);
      setOverKey(null);
    },
  });

  return { start, activeKey, overKey };
}

export function usePlanChrome(plan) {
  const [menu, setMenu] = useState(null);
  const planRef = useRef(plan);
  planRef.current = plan;

  useEffect(() => {
    const onPointer = (event) => {
      if (event.target.closest('[data-plan-popover], [data-cell], [data-no-drag]')) return;
      setMenu(null);
      planRef.current.setEditingKey(null);
      planRef.current.setPickingKey(null);
    };
    window.addEventListener('pointerdown', onPointer);
    return () => window.removeEventListener('pointerdown', onPointer);
  }, []);

  return [menu, setMenu];
}

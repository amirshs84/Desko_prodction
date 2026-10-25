import { useEffect, useRef, useState } from 'react';
import { ticketAPI } from '../../../../../api/client';
import {
  useConsultantPreferences,
  usePreferencesMutation,
  useSubjectCatalog,
  useSubjectCatalogMutations,
} from '../../hooks/useConsultantQueries';
import { faNum } from '../../lib/format';
import { FALLBACK_COLUMNS } from '../students/rosterUtils';

export const WORK_DAYS = [
  { id: 'sat', label: 'شنبه' },
  { id: 'sun', label: 'یکشنبه' },
  { id: 'mon', label: 'دوشنبه' },
  { id: 'tue', label: 'سه‌شنبه' },
  { id: 'wed', label: 'چهارشنبه' },
  { id: 'thu', label: 'پنجشنبه' },
  { id: 'fri', label: 'جمعه' },
];

export const HOUR_OPTIONS = [
  { id: '08-16', label: '۰۸:۰۰ تا ۱۶:۰۰', start: '08:00', end: '16:00' },
  { id: '09-17', label: '۰۹:۰۰ تا ۱۷:۰۰', start: '09:00', end: '17:00' },
  { id: '10-18', label: '۱۰:۰۰ تا ۱۸:۰۰', start: '10:00', end: '18:00' },
  { id: '08-14', label: '۰۸:۰۰ تا ۱۴:۰۰', start: '08:00', end: '14:00' },
];

export const RESERVE_OPTIONS = [1, 2, 3, 4];

export const NOTIFICATION_OPTIONS = [
  { id: 'direct_messages', label: 'پیام‌های دانش‌آموزان', hint: 'وقتی دانش‌آموز مستقیم پیام می‌فرستد' },
  { id: 'plan_responses', label: 'پاسخ به پیشنهاد برنامه', hint: 'قبول یا رد برنامه پیشنهادی' },
  { id: 'dashboard_alerts', label: 'هشدارهای پیشخوان', hint: 'هشدارهای وضعیت دانش‌آموزان' },
];

export const SUBJECT_TAGS = [
  { value: 'general', label: 'عمومی' },
  { value: 'specialized', label: 'اختصاصی' },
  { value: 'analytical', label: 'تحلیلی' },
  { value: 'memorization', label: 'حفظی' },
];

const DEFAULT_NOTIFICATIONS = {
  direct_messages: true,
  plan_responses: true,
  dashboard_alerts: true,
};

const DEFAULT_COLUMNS = FALLBACK_COLUMNS
  .map((column) => column.key)
  .filter((key) => key !== 'full_name');

const INITIAL_REPLIES = [
  { id: 'r1', emoji: '👍', title: '', text: 'گزارش امروزت عالی بود' },
  { id: 'r2', emoji: '💡', title: '', text: 'لطفا برنامه فردا رو چک کن' },
  { id: 'r3', emoji: '⚠️', title: '', text: 'چرا گزارش دیشب رو ثبت نکردی؟' },
];

function initialDays() {
  return {
    sat: true, sun: true, mon: true, tue: true, wed: true, thu: true, fri: false,
  };
}

let replySeq = 3;

export function hourLabel(id) {
  return HOUR_OPTIONS.find((item) => item.id === id)?.label || 'ساعت دلخواه';
}

export function matchHourId(start, end) {
  return HOUR_OPTIONS.find((item) => item.start === start && item.end === end)?.id || 'custom';
}

export function slotsFromRange(start, end, count) {
  const toMinutes = (value) => {
    const [hour, minute] = String(value || '').split(':').map(Number);
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
    return hour * 60 + minute;
  };
  const from = toMinutes(start);
  const to = toMinutes(end);
  if (from == null || to == null || to <= from) return [];
  const total = Math.max(1, Number(count) || 1);
  const step = Math.max(30, Math.floor((to - from) / total));
  const slots = [];
  for (let cursor = from; cursor < to && slots.length < total; cursor += step) {
    const hour = String(Math.floor(cursor / 60)).padStart(2, '0');
    const minute = String(cursor % 60).padStart(2, '0');
    slots.push(faNum(`${hour}:${minute}`));
  }
  return slots;
}

function replyFromApi(item, index) {
  const title = String(item?.title || '').trim();
  const body = String(item?.body || '').trim();
  const emoji = /^\p{Extended_Pictographic}/u.test(title) ? Array.from(title)[0] : '💬';
  const named = !title || title === emoji || title === 'پاسخ' ? '' : title;
  return {
    id: item?.id || `loaded-${index}`,
    emoji,
    title: named,
    text: body || title,
  };
}

export function useConsultantProfile() {
  const prefs = useConsultantPreferences();
  const { updatePrefs } = usePreferencesMutation();
  const [onLeave, setOnLeaveState] = useState(false);
  const [savingLeave, setSavingLeave] = useState(false);
  const [rules, setRules] = useState({ report: true, study: true });
  const [threshold, setThreshold] = useState(20);
  const [replies, setReplies] = useState(INITIAL_REPLIES);
  const [emoji, setEmoji] = useState('👍');
  const [draft, setDraft] = useState('');
  const [composing, setComposing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [days, setDays] = useState(initialDays);
  const [hourId, setHourIdState] = useState('08-16');
  const [start, setStartState] = useState('08:00');
  const [end, setEndState] = useState('16:00');
  const [reserve, setReserveState] = useState(3);
  const [columns, setColumns] = useState(DEFAULT_COLUMNS);
  const [availableColumns, setAvailableColumns] = useState(
    FALLBACK_COLUMNS.filter((column) => column.key !== 'full_name'),
  );
  const [notifications, setNotifications] = useState(DEFAULT_NOTIFICATIONS);
  const [identity, setIdentity] = useState({ fullName: '', phone: '', school: '' });
  const [supportNote, setSupportNote] = useState('پیام شما برای پشتیبانی محصول ارسال می‌شود.');
  const [notice, setNotice] = useState('');
  const [noticeTone, setNoticeTone] = useState('ok');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const timer = useRef(null);
  const dirty = useRef(false);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  useEffect(() => {
    if (!prefs.data || dirty.current) return;
    const hours = prefs.data.working_hours || {};
    const nextStart = hours.start || '09:00';
    const nextEnd = hours.end || '18:00';
    const active = new Set(hours.days || ['sat', 'sun', 'mon', 'tue', 'wed']);
    setDays(Object.fromEntries(WORK_DAYS.map((day) => [day.id, active.has(day.id)])));
    setStartState(nextStart);
    setEndState(nextEnd);
    setHourIdState(matchHourId(nextStart, nextEnd));
    setColumns(
      prefs.data.visible_roster_columns?.length
        ? prefs.data.visible_roster_columns
        : DEFAULT_COLUMNS,
    );
    setAvailableColumns(
      prefs.data.available_roster_columns?.length
        ? prefs.data.available_roster_columns
        : FALLBACK_COLUMNS.filter((column) => column.key !== 'full_name'),
    );
    setNotifications({ ...DEFAULT_NOTIFICATIONS, ...(prefs.data.notifications || {}) });
    setOnLeaveState(Boolean(prefs.data.on_leave));
    setReserveState(prefs.data.reserve_slots || 3);
    setRules({
      report: prefs.data.smart_alerts?.missed_report !== false,
      study: prefs.data.smart_alerts?.study_drop !== false,
    });
    setThreshold(Number(prefs.data.smart_alerts?.study_drop_percent) || 20);
    setReplies((prefs.data.quick_replies || []).map(replyFromApi));
    setIdentity({
      fullName: prefs.data.identity?.full_name || '',
      phone: prefs.data.identity?.phone_number || '',
      school: prefs.data.identity?.school_name || '',
    });
    if (prefs.data.support?.note) setSupportNote(prefs.data.support.note);
  }, [prefs.data]);

  const flash = (message, tone = 'ok') => {
    setNotice(message);
    setNoticeTone(tone);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setNotice(''), 3200);
  };

  const markDirty = () => {
    dirty.current = true;
    setSaved(false);
  };

  const toggleDay = (id) => {
    const active = WORK_DAYS.filter((day) => days[day.id]);
    if (days[id] && active.length <= 1) {
      flash('حداقل یک روز کاری لازم است', 'err');
      return;
    }
    markDirty();
    setDays((current) => ({ ...current, [id]: !current[id] }));
  };

  const setHourId = (id) => {
    const preset = HOUR_OPTIONS.find((item) => item.id === id);
    if (!preset) return;
    markDirty();
    setHourIdState(id);
    setStartState(preset.start);
    setEndState(preset.end);
  };

  const setStart = (value) => {
    markDirty();
    setStartState(value);
    setHourIdState(matchHourId(value, end));
  };

  const setEnd = (value) => {
    markDirty();
    setEndState(value);
    setHourIdState(matchHourId(start, value));
  };

  const toggleRule = (key) => {
    markDirty();
    setRules((current) => ({ ...current, [key]: !current[key] }));
  };

  const changeThreshold = (next) => {
    markDirty();
    setThreshold(Math.min(50, Math.max(5, next)));
  };

  const pickEmoji = (next) => {
    setEmoji(next);
    if (!editingId) return;
    markDirty();
    setReplies((list) => list.map((item) => (
      item.id === editingId ? { ...item, emoji: next } : item
    )));
  };

  const startEdit = (id) => {
    setComposing(false);
    setEditingId((current) => (current === id ? null : id));
    const reply = replies.find((item) => item.id === id);
    if (reply) setEmoji(reply.emoji);
  };

  const updateReply = (id, patch) => {
    markDirty();
    setReplies((list) => list.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const removeReply = (id) => {
    markDirty();
    setReplies((list) => list.filter((item) => item.id !== id));
    if (editingId === id) setEditingId(null);
  };

  const beginCompose = () => {
    if (replies.length >= 12) {
      flash('حداکثر ۱۲ پاسخ سریع مجاز است', 'err');
      return;
    }
    setEditingId(null);
    setComposing(true);
  };

  const commitDraft = () => {
    const text = draft.trim();
    if (!text) {
      flash('متن پاسخ آماده را بنویسید', 'err');
      setComposing(true);
      return;
    }
    if (replies.length >= 12) {
      flash('حداکثر ۱۲ پاسخ سریع مجاز است', 'err');
      return;
    }
    replySeq += 1;
    setReplies((list) => [...list, { id: `local-${replySeq}`, emoji, title: '', text }]);
    setDraft('');
    setComposing(false);
    markDirty();
    flash('پاسخ آماده اضافه شد');
  };

  const toggleColumn = (key) => {
    if (columns.includes(key) && columns.length <= 1) {
      flash('حداقل یک ستون باید انتخاب شود', 'err');
      return;
    }
    markDirty();
    setColumns((current) => (
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key]
    ));
  };

  const toggleNotification = (key) => {
    markDirty();
    setNotifications((current) => ({ ...current, [key]: !current[key] }));
  };

  const save = async () => {
    const activeDays = WORK_DAYS.filter((day) => days[day.id]).map((day) => day.id);
    if (!activeDays.length) {
      flash('حداقل یک روز کاری را فعال کنید', 'err');
      return;
    }
    if (replies.some((item) => !item.text.trim())) {
      flash('متن پاسخ سریع نمی‌تواند خالی باشد', 'err');
      return;
    }
    if (replies.some((item) => item.text.trim().length > 500)) {
      flash('متن پاسخ سریع نباید بیش از ۵۰۰ نویسه باشد', 'err');
      return;
    }
    setSaving(true);
    try {
      await updatePrefs.mutateAsync({
        quick_replies: replies.map((item) => ({
          id: item.id,
          title: (item.title || item.emoji || 'پاسخ').slice(0, 40),
          body: item.text.trim(),
        })),
        visible_roster_columns: columns,
        notifications,
        working_hours: {
          timezone: 'Asia/Tehran',
          start,
          end,
          days: activeDays,
        },
        on_leave: onLeave,
        reserve_slots: Number(reserve),
        smart_alerts: {
          missed_report: rules.report,
          study_drop: rules.study,
          study_drop_percent: threshold,
        },
      });
      dirty.current = false;
      setSaved(true);
      flash('تغییرات ذخیره شد');
    } catch (err) {
      setSaved(false);
      flash(
        err?.response?.data?.error?.message
          || err?.response?.data?.detail
          || 'ذخیره تغییرات ناموفق بود',
        'err',
      );
    } finally {
      setSaving(false);
    }
  };

  return {
    onLeave,
    savingLeave,
    setOnLeave: async (value) => {
      if (savingLeave) return;
      const previous = onLeave;
      setOnLeaveState(value);
      setSavingLeave(true);
      try {
        await updatePrefs.mutateAsync({ on_leave: value });
        flash(value ? 'وضعیت مرخصی ذخیره شد' : 'وضعیت فعال ذخیره شد');
      } catch (err) {
        setOnLeaveState(previous);
        flash(
          err?.response?.data?.error?.message || 'تغییر وضعیت مرخصی ناموفق بود',
          'err',
        );
      } finally {
        setSavingLeave(false);
      }
    },
    rules,
    toggleRule,
    threshold,
    changeThreshold,
    replies,
    emoji,
    pickEmoji,
    draft,
    setDraft,
    composing,
    beginCompose,
    commitDraft,
    editingId,
    startEdit,
    updateReply,
    removeReply,
    days,
    toggleDay,
    hourId,
    setHourId,
    start,
    setStart,
    end,
    setEnd,
    reserve,
    setReserve: (count) => {
      markDirty();
      setReserveState(Number(count));
    },
    columns,
    availableColumns,
    toggleColumn,
    notifications,
    toggleNotification,
    identity,
    supportNote,
    notice,
    noticeTone,
    saved,
    saving,
    save,
    loading: prefs.isLoading && !prefs.isFetched,
    loadError: prefs.isError && !prefs.data,
    refetch: prefs.refetch,
    slots: slotsFromRange(start, end, reserve),
    hourText: hourId === 'custom' ? `${faNum(start)} تا ${faNum(end)}` : hourLabel(hourId),
    thresholdLabel: faNum(threshold),
  };
}

export function useSubjectCatalogForm() {
  const catalog = useSubjectCatalog();
  const { upsert, remove } = useSubjectCatalogMutations();
  const [name, setName] = useState('');
  const [tags, setTags] = useState(['specialized', 'analytical']);
  const [priority, setPriority] = useState(3);
  const [error, setError] = useState('');

  const toggleTag = (value) => {
    setTags((current) => (
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value]
    ));
  };

  const saveSubject = async () => {
    setError('');
    try {
      await upsert.mutateAsync({
        name: name.trim(),
        tags,
        default_priority: Number(priority),
      });
      setName('');
    } catch (err) {
      setError(err?.response?.data?.error?.message || 'ذخیره درس ناموفق بود');
    }
  };

  const removeSubject = async (subjectName) => {
    setError('');
    try {
      await remove.mutateAsync(subjectName);
    } catch (err) {
      setError(err?.response?.data?.error?.message || 'حذف درس ناموفق بود');
    }
  };

  return {
    subjects: catalog.data?.subjects || [],
    loading: catalog.isLoading && !catalog.isFetched,
    failed: catalog.isError && !catalog.data,
    refetch: catalog.refetch,
    name,
    setName,
    tags,
    toggleTag,
    priority,
    setPriority,
    error,
    saving: upsert.isPending,
    saveSubject,
    removeSubject,
  };
}

export function useSupportMessage(fallbackNote) {
  const [message, setMessage] = useState('');
  const [state, setState] = useState({ status: 'idle', text: '' });

  const send = async () => {
    if (!message.trim()) return;
    setState({ status: 'sending', text: 'در حال ارسال…' });
    try {
      await ticketAPI.sendTicket({
        ticket_type: 'support',
        message: message.trim(),
      });
      setMessage('');
      setState({ status: 'ok', text: 'پیام پشتیبانی ارسال شد' });
    } catch (err) {
      setState({
        status: 'err',
        text: err?.response?.data?.detail || err?.response?.data?.error?.message || 'ارسال پیام ناموفق بود',
      });
    }
  };

  return {
    note: fallbackNote,
    message,
    setMessage,
    state,
    send,
  };
}

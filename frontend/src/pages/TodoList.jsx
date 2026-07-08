import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence, useSpring, useMotionValue } from 'framer-motion';
import BottomNav from '../components/BottomNav';

/* ── ثابت‌ها ──────────────────────────────────────────────────── */
const STORAGE_KEY = 'desko_todos_v2';
const EVENTS_KEY  = 'desko_events_v2';
const SOUND_KEY   = 'desko_todo_sound';

const PRIORITY = {
  low:    { label: 'پایین', color: '#22C55E', bg: 'bg-green-500/15',  border: 'border-green-500/30',  text: 'text-green-400' },
  medium: { label: 'متوسط', color: '#F59E0B', bg: 'bg-amber-500/15',  border: 'border-amber-500/30',  text: 'text-amber-400' },
  high:   { label: 'بالا',  color: '#EF4444', bg: 'bg-red-500/15',    border: 'border-red-500/30',    text: 'text-red-400'   },
};

const TODAY_JALALI = new Intl.DateTimeFormat('fa-IR', {
  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
}).format(new Date());

/* ── صدای pop ─────────────────────────────────────────────────── */
function playPop() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.22);
  } catch { /* silent */ }
}

/* ── ذرات confetti ───────────────────────────────────────────── */
function Particle({ x, y, color }) {
  const angle = Math.random() * Math.PI * 2;
  const dist  = 28 + Math.random() * 22;
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{ width: 5, height: 5, backgroundColor: color, left: x, top: y, zIndex: 50 }}
      initial={{ scale: 1, x: 0, y: 0, opacity: 1 }}
      animate={{ scale: 0, x: Math.cos(angle) * dist, y: Math.sin(angle) * dist, opacity: 0 }}
      transition={{ duration: 0.55, ease: 'easeOut' }}
    />
  );
}

/* ── چک‌باکس انیمیشنی ──────────────────────────────────────── */
function AnimatedCheckbox({ checked, onChange, priority }) {
  const [particles, setParticles] = useState([]);
  const ref = useRef();

  const handleChange = useCallback(() => {
    if (!checked) {
      const rect = ref.current?.getBoundingClientRect();
      const colors = ['#6366F1','#22C55E','#F59E0B','#EC4899','#38BDF8'];
      setParticles(Array.from({ length: 8 }, (_, i) => ({
        id: Date.now() + i,
        color: colors[i % colors.length],
        x: 10, y: 10,
      })));
      setTimeout(() => setParticles([]), 600);
    }
    onChange();
  }, [checked, onChange]);

  return (
    <div ref={ref} className="relative shrink-0 w-6 h-6 cursor-pointer" onClick={handleChange}>
      <motion.div
        animate={checked ? { scale: [1, 0.9, 1.1, 1] } : { scale: 1 }}
        transition={{ type: 'spring', stiffness: 600, damping: 20 }}
        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors duration-300
          ${checked ? 'bg-indigo-500 border-indigo-500' : 'border-slate-500 bg-slate-800/60'}`}
      >
        <AnimatePresence>
          {checked && (
            <motion.svg
              key="check"
              viewBox="0 0 12 10"
              className="w-3 h-3 text-white overflow-visible"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              exit={{ pathLength: 0 }}
              transition={{ duration: 0.3 }}
            >
              <motion.path
                d="M1 5L4.5 8.5L11 1"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              />
            </motion.svg>
          )}
        </AnimatePresence>
      </motion.div>
      {particles.map(p => <Particle key={p.id} x={p.x} y={p.y} color={p.color} />)}
    </div>
  );
}

/* ── کارت تسک ─────────────────────────────────────────────────── */
function TaskCard({ task, onToggle, onEdit, onDelete, isDragging }) {
  const p = PRIORITY[task.priority] || PRIORITY.medium;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: task.completed ? 0.6 : 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, y: -10 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      whileHover={{ y: -2, boxShadow: '0 8px 32px rgba(99,102,241,0.18)' }}
      className={`relative rounded-2xl border bg-[#1E293B] border-white/8
                  p-4 cursor-default group transition-shadow
                  ${isDragging ? 'ring-2 ring-indigo-500/50 shadow-2xl' : ''}`}
    >
      <div className="flex items-start gap-3">
        <AnimatedCheckbox
          checked={task.completed}
          onChange={() => onToggle(task.id)}
          priority={task.priority}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <motion.p
              animate={{ opacity: task.completed ? 0.55 : 1 }}
              className={`text-sm font-semibold text-slate-100 leading-snug flex-1 min-w-0
                ${task.completed ? 'line-through text-slate-400' : ''}`}
              style={task.completed ? {
                textDecoration: 'line-through',
                textDecorationColor: '#6366F1',
              } : {}}
            >
              {task.title}
            </motion.p>
            <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border
                              ${p.bg} ${p.border} ${p.text}`}>
              {p.label}
            </span>
          </div>
          {task.description && (
            <p className="text-xs text-slate-400 mt-1 leading-relaxed line-clamp-2">
              {task.description}
            </p>
          )}
          {task.dueDate && (
            <p className="text-[11px] text-indigo-400 mt-1.5 flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path strokeLinecap="round" d="M16 2v4M8 2v4M3 10h18" />
              </svg>
              {task.dueDate}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onEdit(task)}
            className="p-1.5 rounded-lg hover:bg-indigo-500/20 text-slate-400 hover:text-indigo-400 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={() => onDelete(task.id)}
            className="p-1.5 rounded-lg hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </motion.div>
  );
}

/* ── ویجت آمار ─────────────────────────────────────────────────── */
function StatsWidget({ total, completed, remaining }) {
  const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
  const stats = [
    { label: 'کل', value: total, color: '#6366F1' },
    { label: 'انجام شده', value: completed, color: '#22C55E' },
    { label: 'باقی‌مانده', value: remaining, color: '#F59E0B' },
    { label: 'درصد', value: `${rate}%`, color: '#38BDF8' },
  ];
  return (
    <div className="grid grid-cols-4 gap-2">
      {stats.map((s) => (
        <motion.div
          key={s.label}
          whileHover={{ scale: 1.04 }}
          className="rounded-2xl bg-[#1E293B]/80 border border-white/8 p-3 text-center
                     backdrop-blur-sm"
        >
          <p className="text-lg font-bold" style={{ color: s.color }}>{s.value}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">{s.label}</p>
        </motion.div>
      ))}
    </div>
  );
}

/* ── Empty State ─────────────────────────────────────────────── */
function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      className="flex flex-col items-center justify-center py-16 text-center"
    >
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
        className="text-6xl mb-5"
      >
        🌟
      </motion.div>
      <h3 className="text-lg font-bold text-slate-200 mb-2">روزت خالیه</h3>
      <p className="text-sm text-slate-400 max-w-xs leading-relaxed">
        اولین کارت رو اضافه کن و شروع به پیشرفت کن!
      </p>
    </motion.div>
  );
}

/* ── مودال افزودن/ویرایش تسک ─────────────────────────────────── */
function TaskModal({ task, onSave, onClose }) {
  const [title, setTitle]       = useState(task?.title || '');
  const [desc, setDesc]         = useState(task?.description || '');
  const [due, setDue]           = useState(task?.dueDate || '');
  const [priority, setPriority] = useState(task?.priority || 'medium');

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center px-0 md:px-4"
      style={{ background: 'rgba(0,0,0,0.7)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        className="bg-[#1E293B] rounded-t-3xl md:rounded-2xl w-full max-w-lg p-5 md:p-6
                   border border-white/10 shadow-2xl"
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 32 }}
      >
        <h3 className="text-base font-bold text-slate-100 mb-4">
          {task ? 'ویرایش کار' : 'کار جدید'}
        </h3>

        <div className="space-y-3">
          <input
            autoFocus
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="عنوان کار..."
            className="w-full bg-slate-800/80 border border-white/10 rounded-xl px-4 py-3
                       text-sm text-slate-100 placeholder-slate-500
                       focus:outline-none focus:border-indigo-500/60 focus:ring-2
                       focus:ring-indigo-500/20 transition-all"
          />
          <textarea
            value={desc}
            onChange={e => setDesc(e.target.value)}
            placeholder="توضیحات (اختیاری)..."
            rows={2}
            className="w-full bg-slate-800/80 border border-white/10 rounded-xl px-4 py-3
                       text-sm text-slate-100 placeholder-slate-500 resize-none
                       focus:outline-none focus:border-indigo-500/60 focus:ring-2
                       focus:ring-indigo-500/20 transition-all"
          />
          <input
            type="date"
            value={due}
            onChange={e => setDue(e.target.value)}
            className="w-full bg-slate-800/80 border border-white/10 rounded-xl px-4 py-3
                       text-sm text-slate-100
                       focus:outline-none focus:border-indigo-500/60 focus:ring-2
                       focus:ring-indigo-500/20 transition-all"
          />
          <div className="flex gap-2">
            {Object.entries(PRIORITY).map(([key, p]) => (
              <button
                key={key}
                type="button"
                onClick={() => setPriority(key)}
                className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all
                  ${priority === key
                    ? `${p.bg} ${p.border} ${p.text} ring-2 ring-offset-1 ring-offset-[#1E293B]`
                    : 'bg-slate-800/60 border-white/8 text-slate-400 hover:bg-slate-700/60'
                  }`}
                style={priority === key ? { ringColor: p.color } : {}}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3 mt-5">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-slate-700/60 text-slate-300
                       hover:bg-slate-600/60 text-sm font-semibold transition-colors"
          >
            لغو
          </button>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              if (!title.trim()) return;
              onSave({ title: title.trim(), description: desc, dueDate: due, priority });
            }}
            className="flex-1 py-3 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white
                       text-sm font-bold shadow-lg shadow-indigo-500/30 transition-colors"
          >
            {task ? 'ذخیره' : 'افزودن'}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── مودال رویداد ─────────────────────────────────────────────── */
function EventModal({ event, onSave, onClose }) {
  const [title, setTitle] = useState(event?.title || '');
  const [date, setDate]   = useState(event?.date || '');
  const [time, setTime]   = useState(event?.time || '');
  const [note, setNote]   = useState(event?.note || '');

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center px-0 md:px-4"
      style={{ background: 'rgba(0,0,0,0.7)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        className="bg-[#1E293B] rounded-t-3xl md:rounded-2xl w-full max-w-lg p-5 md:p-6
                   border border-white/10 shadow-2xl"
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 32 }}
      >
        <h3 className="text-base font-bold text-slate-100 mb-4">
          {event ? 'ویرایش رویداد' : 'رویداد جدید'}
        </h3>
        <div className="space-y-3">
          <input
            autoFocus
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="عنوان رویداد..."
            className="w-full bg-slate-800/80 border border-white/10 rounded-xl px-4 py-3
                       text-sm text-slate-100 placeholder-slate-500
                       focus:outline-none focus:border-indigo-500/60 focus:ring-2
                       focus:ring-indigo-500/20 transition-all"
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full bg-slate-800/80 border border-white/10 rounded-xl px-4 py-3
                         text-sm text-slate-100
                         focus:outline-none focus:border-indigo-500/60 transition-all"
            />
            <input
              type="time"
              value={time}
              onChange={e => setTime(e.target.value)}
              className="w-full bg-slate-800/80 border border-white/10 rounded-xl px-4 py-3
                         text-sm text-slate-100
                         focus:outline-none focus:border-indigo-500/60 transition-all"
            />
          </div>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="یادداشت (اختیاری)..."
            rows={2}
            className="w-full bg-slate-800/80 border border-white/10 rounded-xl px-4 py-3
                       text-sm text-slate-100 placeholder-slate-500 resize-none
                       focus:outline-none focus:border-indigo-500/60 focus:ring-2
                       focus:ring-indigo-500/20 transition-all"
          />
        </div>
        <div className="flex gap-3 mt-5">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-slate-700/60 text-slate-300
                       hover:bg-slate-600/60 text-sm font-semibold transition-colors"
          >
            لغو
          </button>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              if (!title.trim()) return;
              onSave({ title: title.trim(), date, time, note });
            }}
            className="flex-1 py-3 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white
                       text-sm font-bold shadow-lg shadow-indigo-500/30 transition-colors"
          >
            {event ? 'ذخیره' : 'افزودن رویداد'}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── کارت رویداد ─────────────────────────────────────────────── */
function EventCard({ event, onDelete }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      className="flex items-center gap-3 rounded-xl bg-slate-800/60 border border-white/8
                 px-4 py-3 group hover:border-indigo-500/30 transition-colors"
    >
      <div className="w-1.5 h-8 rounded-full bg-gradient-to-b from-indigo-400 to-purple-500 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-100 truncate">{event.title}</p>
        <p className="text-[11px] text-indigo-400 mt-0.5">
          {event.date && event.date}{event.time && ` — ${event.time}`}
        </p>
        {event.note && <p className="text-[11px] text-slate-500 mt-0.5 truncate">{event.note}</p>}
      </div>
      <button
        onClick={() => onDelete(event.id)}
        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg
                   hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-all"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </motion.div>
  );
}

/* ── Progress Bar ─────────────────────────────────────────────── */
function ProgressBar({ value }) {
  return (
    <div className="w-full bg-slate-700/60 rounded-full h-2 overflow-hidden">
      <motion.div
        className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500"
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ type: 'spring', stiffness: 80, damping: 20 }}
      />
    </div>
  );
}

/* ── کامپوننت اصلی ────────────────────────────────────────────── */
const TodoList = () => {
  const navigate = useNavigate();

  /* ── state ── */
  const [tasks,        setTasks]        = useState([]);
  const [events,       setEvents]       = useState([]);
  const [quickInput,   setQuickInput]   = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showModal,    setShowModal]    = useState(false);
  const [editTask,     setEditTask]     = useState(null);
  const [showEventModal,  setShowEventModal]  = useState(false);
  const [editEvent,       setEditEvent]       = useState(null);
  const [completedOpen,   setCompletedOpen]   = useState(false);
  const [eventsOpen,      setEventsOpen]      = useState(true);
  const [tab,             setTab]             = useState('tasks');

  /* ── load from localStorage ── */
  useEffect(() => {
    if (!localStorage.getItem('isLoggedIn')) { navigate('/login'); return; }
    try {
      const t = localStorage.getItem(STORAGE_KEY);
      if (t) setTasks(JSON.parse(t));
    } catch { /* silent */ }
    try {
      const e = localStorage.getItem(EVENTS_KEY);
      if (e) setEvents(JSON.parse(e));
    } catch { /* silent */ }
    const s = localStorage.getItem(SOUND_KEY);
    setSoundEnabled(s === null ? true : s === 'true');
  }, [navigate]);

  /* ── persist ── */
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }, [tasks]);
  useEffect(() => {
    localStorage.setItem(EVENTS_KEY, JSON.stringify(events));
  }, [events]);

  /* ── computed ── */
  const activeTasks    = tasks.filter(t => !t.completed);
  const completedTasks = tasks.filter(t => t.completed);
  const total     = tasks.length;
  const completed = completedTasks.length;
  const remaining = activeTasks.length;
  const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'صبح بخیر 🌅';
    if (h < 17) return 'بعد از ظهر بخیر ☀️';
    return 'شب بخیر 🌙';
  })();

  /* ── اضافه کردن سریع ── */
  const handleQuickAdd = (e) => {
    e?.preventDefault();
    const val = quickInput.trim();
    if (!val) return;
    const newTask = {
      id: Date.now().toString(),
      title: val,
      description: '',
      dueDate: '',
      priority: 'medium',
      completed: false,
      createdAt: new Date().toISOString(),
    };
    setTasks(prev => [newTask, ...prev]);
    setQuickInput('');
  };

  /* ── toggle ── */
  const handleToggle = useCallback((id) => {
    setTasks(prev => prev.map(t => {
      if (t.id !== id) return t;
      const nowCompleted = !t.completed;
      if (nowCompleted) {
        if (soundEnabled) playPop();
        if (navigator.vibrate) navigator.vibrate(30);
      }
      return { ...t, completed: nowCompleted };
    }));
  }, [soundEnabled]);

  /* ── حذف ── */
  const handleDelete = useCallback((id) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  }, []);

  /* ── ذخیره/ویرایش ── */
  const handleSaveTask = useCallback((data) => {
    if (editTask) {
      setTasks(prev => prev.map(t => t.id === editTask.id ? { ...t, ...data } : t));
    } else {
      setTasks(prev => [{
        id: Date.now().toString(),
        ...data,
        completed: false,
        createdAt: new Date().toISOString(),
      }, ...prev]);
    }
    setShowModal(false);
    setEditTask(null);
  }, [editTask]);

  const openEdit = useCallback((task) => {
    setEditTask(task);
    setShowModal(true);
  }, []);

  /* ── رویدادها ── */
  const handleSaveEvent = useCallback((data) => {
    if (editEvent) {
      setEvents(prev => prev.map(e => e.id === editEvent.id ? { ...e, ...data } : e));
    } else {
      setEvents(prev => [{ id: Date.now().toString(), ...data }, ...prev]);
    }
    setShowEventModal(false);
    setEditEvent(null);
  }, [editEvent]);

  const handleDeleteEvent = useCallback((id) => {
    setEvents(prev => prev.filter(e => e.id !== id));
  }, []);

  /* ────── JSX ────── */
  return (
    <div
      className="h-full flex flex-col overflow-hidden"
      style={{ background: '#0F172A', color: '#F1F5F9' }}
    >
      {/* پترن پس‌زمینه */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.04]"
        style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, #6366F1 1px, transparent 0)`,
          backgroundSize: '32px 32px',
        }}
      />

      {/* ── هدر ── */}
      <div
        className="shrink-0 px-4 pt-safe relative z-10"
        style={{ paddingTop: 'calc(1rem + env(safe-area-inset-top,0px))' }}
      >
        {/* نوار بالا */}
        <div className="flex items-center justify-between mb-4">
          <Link
            to="/timer"
            className="flex items-center gap-1.5 text-xs font-semibold text-indigo-400
                       hover:text-indigo-300 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            بازگشت
          </Link>

          <h1 className="text-base font-bold text-slate-100">کارها</h1>

          <button
            onClick={() => {
              const next = !soundEnabled;
              setSoundEnabled(next);
              localStorage.setItem(SOUND_KEY, String(next));
            }}
            title={soundEnabled ? 'خاموش کردن صدا' : 'روشن کردن صدا'}
            className="p-2 rounded-xl bg-slate-800/60 border border-white/8
                       text-slate-400 hover:text-slate-200 transition-colors"
          >
            {soundEnabled ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" d="M15.536 8.464a5 5 0 010 7.072M12 6v12m-3.536-9.536a5 5 0 000 7.072" />
                <path strokeLinecap="round" d="M9 9H4.5a.5.5 0 00-.5.5v5a.5.5 0 00.5.5H9l4 4V5L9 9z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" d="M9 9H4.5a.5.5 0 00-.5.5v5a.5.5 0 00.5.5H9l4 4V5L9 9z" />
                <line x1="23" y1="9" x2="17" y2="15" strokeLinecap="round" />
                <line x1="17" y1="9" x2="23" y2="15" strokeLinecap="round" />
              </svg>
            )}
          </button>
        </div>

        {/* کارت خوشامدگویی */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-gradient-to-br from-indigo-500/15 via-purple-500/10 to-transparent
                     border border-indigo-500/20 p-4 mb-3"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-base font-bold text-slate-100">{greeting}</p>
              <p className="text-xs text-slate-400 mt-0.5">{TODAY_JALALI}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-2xl font-black text-indigo-400">{rate}%</p>
              <p className="text-[10px] text-slate-400">انجام شده</p>
            </div>
          </div>
          <div className="mt-3">
            <ProgressBar value={rate} />
          </div>
        </motion.div>

        {/* آمار */}
        <div className="mb-3">
          <StatsWidget total={total} completed={completed} remaining={remaining} />
        </div>

        {/* تب‌ها */}
        <div className="flex gap-2 mb-3">
          {[
            { id: 'tasks',  label: 'کارها',   count: activeTasks.length },
            { id: 'events', label: 'رویدادها', count: events.length      },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all border
                ${tab === t.id
                  ? 'bg-indigo-500 border-indigo-500 text-white shadow-lg shadow-indigo-500/25'
                  : 'bg-slate-800/60 border-white/8 text-slate-400 hover:text-slate-200'}`}
            >
              {t.label}
              {t.count > 0 && (
                <span className={`mr-1.5 text-[10px] px-1.5 py-0.5 rounded-full
                  ${tab === t.id ? 'bg-white/20 text-white' : 'bg-slate-700 text-slate-400'}`}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── محتوا ── */}
      <div
        className="flex-1 overflow-y-auto px-4 relative z-10"
        style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom,0px))' }}
      >
        <AnimatePresence mode="wait">

          {/* ─── تب کارها ─── */}
          {tab === 'tasks' && (
            <motion.div
              key="tasks"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ duration: 0.2 }}
            >
              {/* افزودن سریع */}
              <form onSubmit={handleQuickAdd} className="flex gap-2 mb-4">
                <input
                  value={quickInput}
                  onChange={e => setQuickInput(e.target.value)}
                  placeholder="کار جدید اضافه کن..."
                  className="flex-1 bg-[#1E293B] border border-white/10 rounded-xl px-4 py-3
                             text-sm text-slate-100 placeholder-slate-500
                             focus:outline-none focus:border-indigo-500/60 focus:ring-2
                             focus:ring-indigo-500/20 transition-all"
                />
                <motion.button
                  type="submit"
                  whileTap={{ scale: 0.93 }}
                  className="px-4 py-3 rounded-xl bg-indigo-500 hover:bg-indigo-600
                             text-white text-sm font-bold shadow-lg shadow-indigo-500/25
                             transition-colors shrink-0"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" d="M12 5v14M5 12h14" />
                  </svg>
                </motion.button>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.93 }}
                  onClick={() => { setEditTask(null); setShowModal(true); }}
                  className="px-3 py-3 rounded-xl bg-slate-700/80 border border-white/8
                             text-slate-300 hover:text-slate-100 hover:bg-slate-600/80
                             transition-colors shrink-0"
                  title="افزودن با جزئیات"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                  </svg>
                </motion.button>
              </form>

              {/* کارهای فعال */}
              <AnimatePresence>
                {activeTasks.length === 0 && completedTasks.length === 0 && <EmptyState />}
                {activeTasks.length === 0 && completedTasks.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-8"
                  >
                    <div className="text-4xl mb-3">🎉</div>
                    <p className="text-sm font-semibold text-green-400">همه کارها انجام شد!</p>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-2.5 mb-4">
                <AnimatePresence>
                  {activeTasks.map(task => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onToggle={handleToggle}
                      onEdit={openEdit}
                      onDelete={handleDelete}
                    />
                  ))}
                </AnimatePresence>
              </div>

              {/* بخش کارهای انجام‌شده */}
              {completedTasks.length > 0 && (
                <motion.div layout className="mt-2">
                  <button
                    onClick={() => setCompletedOpen(v => !v)}
                    className="w-full flex items-center justify-between px-4 py-3
                               rounded-xl bg-slate-800/40 border border-white/6
                               text-sm font-semibold text-slate-400 hover:text-slate-200
                               transition-colors mb-2"
                  >
                    <span>انجام شده ({completedTasks.length})</span>
                    <motion.svg
                      animate={{ rotate: completedOpen ? 180 : 0 }}
                      className="w-4 h-4"
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                    >
                      <path strokeLinecap="round" d="M19 9l-7 7-7-7" />
                    </motion.svg>
                  </button>
                  <AnimatePresence>
                    {completedOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden space-y-2"
                      >
                        <AnimatePresence>
                          {completedTasks.map(task => (
                            <TaskCard
                              key={task.id}
                              task={task}
                              onToggle={handleToggle}
                              onEdit={openEdit}
                              onDelete={handleDelete}
                            />
                          ))}
                        </AnimatePresence>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* ─── تب رویدادها ─── */}
          {tab === 'events' && (
            <motion.div
              key="events"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.2 }}
            >
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => { setEditEvent(null); setShowEventModal(true); }}
                className="w-full py-3 rounded-xl bg-indigo-500/15 border border-indigo-500/30
                           text-indigo-400 text-sm font-semibold hover:bg-indigo-500/25
                           transition-colors mb-4 flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" d="M12 5v14M5 12h14" />
                </svg>
                رویداد جدید
              </motion.button>

              {events.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center py-16 text-center"
                >
                  <motion.div
                    animate={{ y: [0, -6, 0] }}
                    transition={{ repeat: Infinity, duration: 2.5 }}
                    className="text-5xl mb-4"
                  >
                    📅
                  </motion.div>
                  <p className="text-sm font-semibold text-slate-300 mb-1">رویدادی ثبت نشده</p>
                  <p className="text-xs text-slate-500">اولین رویدادت رو اضافه کن!</p>
                </motion.div>
              ) : (
                <div className="space-y-2">
                  <AnimatePresence>
                    {events.map(ev => (
                      <EventCard key={ev.id} event={ev} onDelete={handleDeleteEvent} />
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── دکمه FAB موبایل ── */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        whileHover={{ scale: 1.08 }}
        onClick={() => {
          if (tab === 'tasks') { setEditTask(null); setShowModal(true); }
          else { setEditEvent(null); setShowEventModal(true); }
        }}
        className="fixed bottom-24 left-4 w-13 h-13 rounded-full
                   bg-gradient-to-br from-indigo-500 to-purple-600
                   shadow-[0_8px_32px_rgba(99,102,241,0.45)]
                   flex items-center justify-center z-30 md:hidden"
        style={{ width: 52, height: 52 }}
        aria-label="افزودن"
      >
        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" d="M12 5v14M5 12h14" />
        </svg>
      </motion.button>

      {/* ── مودال تسک ── */}
      <AnimatePresence>
        {showModal && (
          <TaskModal
            task={editTask}
            onSave={handleSaveTask}
            onClose={() => { setShowModal(false); setEditTask(null); }}
          />
        )}
      </AnimatePresence>

      {/* ── مودال رویداد ── */}
      <AnimatePresence>
        {showEventModal && (
          <EventModal
            event={editEvent}
            onSave={handleSaveEvent}
            onClose={() => { setShowEventModal(false); setEditEvent(null); }}
          />
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
};

export default TodoList;

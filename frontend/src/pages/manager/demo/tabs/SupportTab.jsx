import { useState } from 'react';
import {
  Headphones, MessageSquare, Phone, Mail, Smartphone, MapPin,
  Send, ChevronDown, MoreVertical, Clock, Loader, CheckCircle2,
  List,
} from 'lucide-react';
import { DesktopPageShell, MobilePageShell } from '../components/PageShells';
import { CARD_STYLE } from '../components/DemoUi';
import {
  SUPPORT_CONTACT,
  SUBJECT_OPTIONS,
  CATEGORY_OPTIONS,
  RECENT_QUESTIONS,
  STATUS_CONFIG,
} from '../data/supportMockData';

function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status];
  const Icon = status === 'waiting' ? Clock
    : status === 'review' ? Loader
      : CheckCircle2;

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap"
      style={{ background: config.bg, color: config.color }}
    >
      <Icon size={12} />
      {config.label}
    </span>
  );
}

function ContactInfoCard() {
  const sections = [
    {
      key: 'phone',
      icon: Phone,
      color: '#10B981',
      bg: '#D1FAE5',
      title: SUPPORT_CONTACT.phone.title,
      lines: SUPPORT_CONTACT.phone.numbers,
      note: SUPPORT_CONTACT.phone.note,
      ltr: true,
    },
    {
      key: 'email',
      icon: Mail,
      color: '#3B82F6',
      bg: '#DBEAFE',
      title: SUPPORT_CONTACT.email.title,
      lines: [SUPPORT_CONTACT.email.address],
      note: SUPPORT_CONTACT.email.note,
      ltr: true,
    },
    {
      key: 'technical',
      icon: Smartphone,
      color: '#8B5CF6',
      bg: '#EDE9FE',
      title: SUPPORT_CONTACT.technical.title,
      lines: [SUPPORT_CONTACT.technical.number],
      note: SUPPORT_CONTACT.technical.note,
      ltr: true,
    },
    {
      key: 'address',
      icon: MapPin,
      color: '#F59E0B',
      bg: '#FEF3C7',
      title: SUPPORT_CONTACT.address.title,
      lines: [SUPPORT_CONTACT.address.text],
      ltr: false,
    },
  ];

  return (
    <div className="rounded-3xl p-5 h-fit" style={CARD_STYLE}>
      <div className="flex items-center gap-2 mb-1">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: '#D1FAE5' }}
        >
          <Headphones size={18} color="#10B981" />
        </div>
        <h3 className="font-bold text-gray-900 text-sm">اطلاعات تماس پشتیبانی</h3>
      </div>
      <p className="text-xs text-gray-500 mb-5 mr-11">راه‌های ارتباطی با تیم پشتیبانی</p>

      <div className="flex flex-col gap-5">
        {sections.map(({ key, icon: Icon, color, bg, title, lines, note, ltr }) => (
          <div key={key} className="flex gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: bg }}
            >
              <Icon size={18} color={color} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900">{title}</p>
              {lines.map((line) => (
                <p
                  key={line}
                  className={`text-sm text-gray-700 mt-0.5 ${ltr ? 'dir-ltr text-right' : 'leading-relaxed'}`}
                >
                  {line}
                </p>
              ))}
              {note && <p className="text-xs text-gray-400 mt-1">{note}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FormSelect({ label, options }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1.5">{label}</label>
      <div className="relative">
        <select
          className="w-full appearance-none px-4 py-3 rounded-2xl text-sm text-gray-700 outline-none"
          style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}
          defaultValue={options[0]}
        >
          {options.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
        <ChevronDown size={16} color="#9CA3AF" className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
      </div>
    </div>
  );
}

function SubmitQuestionForm() {
  const [description, setDescription] = useState('');
  const maxLen = 1000;

  return (
    <div className="rounded-3xl p-5" style={CARD_STYLE}>
      <div className="flex items-center gap-2 mb-1">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: '#DBEAFE' }}
        >
          <MessageSquare size={18} color="#3B82F6" />
        </div>
        <h3 className="font-bold text-gray-900 text-sm">ثبت سوال جدید</h3>
      </div>
      <p className="text-xs text-gray-500 mb-5 mr-11">
        سوال یا مشکل خود را ثبت کنید تا در اسرع وقت پاسخ داده شود
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <FormSelect label="موضوع سوال" options={SUBJECT_OPTIONS} />
        <FormSelect label="دسته‌بندی" options={CATEGORY_OPTIONS} />
      </div>

      <div className="mb-4">
        <label className="block text-xs font-medium text-gray-600 mb-1.5">شماره تماس</label>
        <div className="relative">
          <Phone size={16} color="#9CA3AF" className="absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="tel"
            placeholder="شماره تماس خود را وارد کنید"
            className="w-full pr-10 pl-4 py-3 rounded-2xl text-sm text-gray-700 outline-none placeholder:text-gray-400"
            style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}
          />
        </div>
      </div>

      <div className="mb-5">
        <label className="block text-xs font-medium text-gray-600 mb-1.5">شرح سوال</label>
        <div className="relative">
          <MessageSquare size={16} color="#9CA3AF" className="absolute right-3 top-3" />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, maxLen))}
            placeholder="لطفاً سوال یا مشکل خود را به طور کامل توضیح دهید..."
            rows={5}
            className="w-full pr-10 pl-4 pt-3 pb-8 rounded-2xl text-sm text-gray-700 outline-none resize-none placeholder:text-gray-400"
            style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}
          />
          <span className="absolute left-3 bottom-3 text-xs text-gray-400">
            {description.length}/{maxLen}
          </span>
        </div>
      </div>

      <button
        className="flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-semibold text-white"
        style={{ background: '#10B981' }}
      >
        <Send size={16} />
        <span>ارسال سوال</span>
      </button>
    </div>
  );
}

function RecentQuestionsTable({ compact }) {
  return (
    <div className="rounded-3xl p-5" style={CARD_STYLE}>
      <div className="flex items-center gap-2 mb-1">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: '#EDE9FE' }}
        >
          <List size={18} color="#8B5CF6" />
        </div>
        <h3 className="font-bold text-gray-900 text-sm">آخرین سوالات شما</h3>
      </div>
      <p className="text-xs text-gray-500 mb-5 mr-11">پیگیری وضعیت سوالات ثبت‌شده</p>

      <div className={compact ? 'overflow-x-auto' : ''}>
        <table className="w-full min-w-[600px]">
          <thead>
            <tr className="border-b border-gray-100">
              {['موضوع', 'تاریخ ثبت', 'وضعیت', 'دسته‌بندی', ''].map((col, i) => (
                <th
                  key={i}
                  className="text-xs text-gray-400 font-medium text-right pb-3 px-2 first:pr-0 last:pl-0"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {RECENT_QUESTIONS.map((row) => (
              <tr key={row.id} className="border-b border-gray-50 last:border-0">
                <td className="py-3.5 px-2 first:pr-0 text-sm font-medium text-gray-900 max-w-[200px]">
                  {row.subject}
                </td>
                <td className="py-3.5 px-2 text-xs text-gray-600 whitespace-nowrap">{row.date}</td>
                <td className="py-3.5 px-2">
                  <StatusBadge status={row.status} />
                </td>
                <td className="py-3.5 px-2 text-sm text-gray-600">{row.category}</td>
                <td className="py-3.5 px-2 last:pl-0">
                  <button className="p-1.5 rounded-lg hover:bg-gray-100">
                    <MoreVertical size={16} color="#9CA3AF" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SupportBody({ compact }) {
  const padding = compact ? 'px-5 py-5' : 'px-8 py-6';

  return (
    <div className={padding}>
      <div className={`grid gap-6 ${compact ? 'grid-cols-1' : 'grid-cols-12'}`}>
        <div className={compact ? '' : 'col-span-4'}>
          <ContactInfoCard />
        </div>
        <div className={`space-y-6 ${compact ? '' : 'col-span-8'}`}>
          <SubmitQuestionForm />
          <RecentQuestionsTable compact={compact} />
        </div>
      </div>
      {!compact && <div className="h-6" />}
    </div>
  );
}

export function SupportDesktop() {
  return (
    <DesktopPageShell>
      <SupportBody />
    </DesktopPageShell>
  );
}

export function SupportMobile({ onMenuClick }) {
  return (
    <MobilePageShell onMenuClick={onMenuClick}>
      <SupportBody compact />
    </MobilePageShell>
  );
}

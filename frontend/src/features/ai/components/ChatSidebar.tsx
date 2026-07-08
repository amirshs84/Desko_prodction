import { Gem, Menu, Pin, Search, Sparkles, Star } from 'lucide-react';
import type { Conversation } from '../api/types';

interface ChatSidebarProps {
  open: boolean;
  conversations: Conversation[];
  activeId: string | null;
  search: string;
  isLoading: boolean;
  hasMore: boolean;
  isFetchingMore: boolean;
  onClose: () => void;
  onSearchChange: (value: string) => void;
  onSelect: (conversation: Conversation) => void;
  onNewChat: () => void;
  onLoadMore: () => void;
  onGoHome: () => void;
}

function ConversationIcon({ conv }: { conv: Conversation }) {
  if (conv.is_pinned) {
    return (
      <div className="grid size-8 shrink-0 place-items-center rounded-full bg-amber-600/80">
        <Pin className="size-3.5 text-white" />
      </div>
    );
  }
  if (conv.is_favorite) {
    return (
      <div className="grid size-8 shrink-0 place-items-center rounded-full bg-violet-600/90">
        <Star className="size-3.5 text-white" />
      </div>
    );
  }
  return (
    <div className="grid size-8 shrink-0 place-items-center rounded-full bg-sky-600/80">
      <Gem className="size-4 text-white" />
    </div>
  );
}

export function ChatSidebar({
  open,
  conversations,
  activeId,
  search,
  isLoading,
  hasMore,
  isFetchingMore,
  onClose,
  onSearchChange,
  onSelect,
  onNewChat,
  onLoadMore,
  onGoHome,
}: ChatSidebarProps) {
  if (!open) return null;

  return (
    <div className="absolute inset-0 z-50">
      <div className="absolute inset-0 bg-black/55" onClick={onClose} aria-hidden />
      <aside
        className="absolute bottom-0 right-0 top-0 flex w-[min(88vw,320px)] flex-col border-l border-white/10 bg-[#171717] shadow-2xl"
        dir="rtl"
      >
        <div className="flex items-center justify-between gap-2 border-b border-white/10 px-3 py-3">
          <button
            type="button"
            onClick={onClose}
            className="grid size-10 place-items-center rounded-full hover:bg-white/10"
            aria-label="بستن منو"
          >
            <Menu size={22} />
          </button>
          <button
            type="button"
            onClick={onNewChat}
            className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-sm font-semibold hover:bg-white/15"
          >
            <Sparkles size={16} />
            گفت‌وگو جدید
          </button>
        </div>

        <div className="px-2 pb-2 pt-2">
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/35 px-3 py-2">
            <Search className="size-4 shrink-0 text-white/40" aria-hidden />
            <input
              type="search"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="جستجو در گفت‌وگوها…"
              className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/35"
              dir="rtl"
              autoComplete="off"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
          <p className="mb-2 px-2 text-xs font-semibold text-white/45">گفت‌وگوها</p>

          {isLoading && (
            <div className="space-y-2 px-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 animate-pulse rounded-xl bg-white/5" />
              ))}
            </div>
          )}

          {!isLoading && conversations.length === 0 && (
            <p className="px-2 py-8 text-center text-sm text-white/45">
              {search.trim() ? 'موردی پیدا نشد.' : 'هنوز گفت‌وگویی ندارید.'}
            </p>
          )}

          <ul className="space-y-0.5">
            {conversations.map((conv) => (
              <li key={conv.id}>
                <button
                  type="button"
                  onClick={() => onSelect(conv)}
                  className={`flex w-full items-start gap-2 rounded-xl px-2 py-2.5 text-right transition-colors hover:bg-white/5 ${
                    activeId === conv.id ? 'bg-white/10' : ''
                  }`}
                >
                  <p className="min-w-0 flex-1 text-[13px] font-medium leading-snug text-white/90 line-clamp-2">
                    {conv.title || 'گفت‌وگوی بدون عنوان'}
                  </p>
                  <ConversationIcon conv={conv} />
                </button>
              </li>
            ))}
          </ul>

          {hasMore && (
            <button
              type="button"
              onClick={onLoadMore}
              disabled={isFetchingMore}
              className="mt-3 w-full rounded-xl py-2 text-center text-xs text-white/50 hover:bg-white/5 disabled:opacity-50"
            >
              {isFetchingMore ? 'در حال بارگذاری…' : 'نمایش بیشتر'}
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={onGoHome}
          className="m-2 rounded-xl border border-white/10 py-2.5 text-center text-sm text-white/60 hover:bg-white/5"
        >
          بازگشت به میزکار
        </button>
      </aside>
    </div>
  );
}

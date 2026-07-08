import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { fetchConversations, fetchMessages, fetchModels } from '../api/client';
import type { ConversationFilters } from '../api/types';
import { aiQueryKeys } from '../lib/utils';

const isLoggedIn = () => !!localStorage.getItem('isLoggedIn');

export function useAiModels() {
  return useQuery({
    queryKey: aiQueryKeys.models(),
    queryFn: fetchModels,
    enabled: isLoggedIn(),
    staleTime: 10 * 60 * 1000,
  });
}

export function useAiConversations(filters: ConversationFilters = {}) {
  const filterKey = {
    search: filters.search ?? '',
    pinned: filters.pinned ?? false,
    favorite: filters.favorite ?? false,
    archived: filters.archived ?? false,
  };

  return useInfiniteQuery({
    queryKey: aiQueryKeys.conversations(filterKey),
    queryFn: ({ pageParam }) => fetchConversations(filterKey, pageParam as string | null),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => (last.page.has_more ? last.page.next_cursor : undefined),
    enabled: isLoggedIn(),
  });
}

export function useAiMessages(conversationId: string | null) {
  return useInfiniteQuery({
    queryKey: aiQueryKeys.messages(conversationId),
    queryFn: ({ pageParam }) =>
      fetchMessages(conversationId!, pageParam as string | null),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => (last.page.has_more ? last.page.next_cursor : undefined),
    enabled: isLoggedIn() && !!conversationId,
  });
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { planningAPI } from '../../../../api/client';

export const CONSULTANT_KEYS = {
  students: (filters = {}) => ['consultant', 'students', filters],
  groups: () => ['consultant', 'groups'],
  group: (id) => ['consultant', 'groups', id],
  progress: (userId) => ['consultant', 'progress', userId],
  templates: () => ['consultant', 'block-templates'],
  events: (userId, range = {}) => ['consultant', 'events', userId, range],
  availability: (userId, date) => ['consultant', 'availability', userId, date],
  snapshots: (userId) => ['consultant', 'snapshots', userId],
  plans: () => ['consultant', 'plans'],
  plan: (id) => ['consultant', 'plans', id],
  notes: (userId) => ['consultant', 'notes', userId],
  messages: (userId) => ['consultant', 'messages', userId],
};

function normalizeRosterPayload(data) {
  if (Array.isArray(data)) {
    return { period: 'weekly', columns: [], students: data };
  }
  return {
    period: data?.period || 'weekly',
    columns: data?.columns || [],
    students: data?.students || [],
  };
}

/** فهرست دانش‌آموزان — همیشه آرایه برمی‌گرداند (سازگار با گروه‌ها/داشبورد). */
export function useConsultantStudents(filters = {}) {
  return useQuery({
    queryKey: CONSULTANT_KEYS.students(filters),
    queryFn: () =>
      planningAPI.getStudents(filters).then((r) => normalizeRosterPayload(r.data).students),
  });
}

/** Roster غنی با ستون‌های پویا و متریک بازه زمانی. */
export function useConsultantRoster(filters = {}) {
  return useQuery({
    queryKey: CONSULTANT_KEYS.students({ ...filters, _roster: true }),
    queryFn: () =>
      planningAPI.getStudents(filters).then((r) => normalizeRosterPayload(r.data)),
  });
}

export function useConsultantGroups() {
  return useQuery({
    queryKey: CONSULTANT_KEYS.groups(),
    queryFn: () => planningAPI.getGroups().then((r) => r.data),
  });
}

export function useStudentProgress(userId) {
  return useQuery({
    queryKey: CONSULTANT_KEYS.progress(userId),
    queryFn: () => planningAPI.getProgress({ user: userId }).then((r) => r.data),
    enabled: !!userId,
  });
}

export function useBlockTemplates() {
  return useQuery({
    queryKey: CONSULTANT_KEYS.templates(),
    queryFn: () => planningAPI.getBlockTemplates().then((r) => r.data),
  });
}

export function useBlockTemplateMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: CONSULTANT_KEYS.templates() });

  const createTemplate = useMutation({
    mutationFn: (data) => planningAPI.createBlockTemplate(data).then((r) => r.data),
    onSuccess: invalidate,
  });
  const updateTemplate = useMutation({
    mutationFn: ({ key, data }) =>
      planningAPI.updateBlockTemplate(key, data).then((r) => r.data),
    onSuccess: invalidate,
  });
  const deleteTemplate = useMutation({
    mutationFn: (key) => planningAPI.deleteBlockTemplate(key),
    onSuccess: invalidate,
  });

  return { createTemplate, updateTemplate, deleteTemplate };
}

export function useStudentSnapshots(userId) {
  return useQuery({
    queryKey: CONSULTANT_KEYS.snapshots(userId),
    queryFn: () => planningAPI.getSnapshots({ user: userId }).then((r) => r.data),
    enabled: !!userId,
  });
}

export function usePlanRuns() {
  return useQuery({
    queryKey: CONSULTANT_KEYS.plans(),
    queryFn: () => planningAPI.getPlanRuns().then((r) => r.data),
  });
}

export function usePlanRun(runId) {
  return useQuery({
    queryKey: CONSULTANT_KEYS.plan(runId),
    queryFn: () => planningAPI.getPlanRun(runId).then((r) => r.data),
    enabled: !!runId,
  });
}

export function useGroupMutations() {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['consultant', 'groups'] });
    qc.invalidateQueries({ queryKey: ['consultant', 'students'] });
  };

  const createGroup = useMutation({
    mutationFn: (data) => planningAPI.createGroup(data).then((r) => r.data),
    onSuccess: invalidate,
  });
  const updateGroup = useMutation({
    mutationFn: ({ groupId, data }) => planningAPI.updateGroup(groupId, data).then((r) => r.data),
    onSuccess: invalidate,
  });
  const deleteGroup = useMutation({
    mutationFn: (groupId) => planningAPI.deleteGroup(groupId),
    onSuccess: invalidate,
  });
  const changeMembers = useMutation({
    mutationFn: ({ groupId, data }) => planningAPI.changeMembers(groupId, data).then((r) => r.data),
    onSuccess: invalidate,
  });

  return { createGroup, updateGroup, deleteGroup, changeMembers };
}

export function useCalendarBlockMutations(userId) {
  const qc = useQueryClient();
  const params = userId != null ? { user: userId } : undefined;

  const invalidateCalendar = () => {
    qc.invalidateQueries({ queryKey: ['calendar_events'] });
    qc.invalidateQueries({ queryKey: ['consultant', 'availability'] });
  };

  const placeBlock = useMutation({
    mutationFn: (data) => planningAPI.placeBlock(data, params).then((r) => r.data),
    onSuccess: invalidateCalendar,
  });

  const moveBlock = useMutation({
    mutationFn: ({ clientId, data }) =>
      planningAPI.moveBlock(clientId, data, params).then((r) => r.data),
    onSuccess: invalidateCalendar,
  });

  const restoreSnapshot = useMutation({
    mutationFn: (snapshotId) =>
      planningAPI.restoreSnapshot(snapshotId, params).then((r) => r.data),
    onSuccess: () => {
      invalidateCalendar();
      qc.invalidateQueries({ queryKey: CONSULTANT_KEYS.snapshots(userId) });
    },
  });

  return { placeBlock, moveBlock, restoreSnapshot };
}

export function useStudentNotes(userId) {
  return useQuery({
    queryKey: CONSULTANT_KEYS.notes(userId),
    queryFn: () => planningAPI.getStudentNotes(userId).then((r) => r.data),
    enabled: !!userId,
  });
}

export function useStudentNoteMutations(userId) {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: CONSULTANT_KEYS.notes(userId) });

  const createNote = useMutation({
    mutationFn: (data) => planningAPI.createStudentNote(userId, data).then((r) => r.data),
    onSuccess: invalidate,
  });
  const updateNote = useMutation({
    mutationFn: ({ noteId, body }) =>
      planningAPI.updateStudentNote(noteId, { body }).then((r) => r.data),
    onSuccess: invalidate,
  });
  const deleteNote = useMutation({
    mutationFn: (noteId) => planningAPI.deleteStudentNote(noteId),
    onSuccess: invalidate,
  });

  return { createNote, updateNote, deleteNote };
}

export function useStudentMessages(userId) {
  return useQuery({
    queryKey: CONSULTANT_KEYS.messages(userId),
    queryFn: () => planningAPI.getStudentMessages(userId).then((r) => r.data),
    enabled: !!userId,
    refetchInterval: 8_000,
    refetchOnWindowFocus: true,
  });
}

export function useStudentMessageMutations(userId) {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: CONSULTANT_KEYS.messages(userId) });

  const sendMessage = useMutation({
    mutationFn: (data) => planningAPI.sendStudentMessage(userId, data).then((r) => r.data),
    onSuccess: invalidate,
  });

  return { sendMessage };
}

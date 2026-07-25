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
};

export function useConsultantStudents(filters = {}) {
  return useQuery({
    queryKey: CONSULTANT_KEYS.students(filters),
    queryFn: () => planningAPI.getStudents(filters).then((r) => r.data),
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

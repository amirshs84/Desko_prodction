import { useMemo, useState } from 'react';
import { DesktopPageShell, MobilePageShell } from '../components/PageShells';
import {
  Card, EmptyState, PrimaryButton, SecondaryButton, DangerButton,
} from '../components/DemoUi';
import { useConsultant } from '../context/ConsultantContext';
import {
  useConsultantGroups, useConsultantStudents, useGroupMutations,
} from '../hooks/useConsultantQueries';

function GroupsBody() {
  const { navigateToTab } = useConsultant();
  const { data: groups = [], isLoading } = useConsultantGroups();
  const { data: students = [] } = useConsultantStudents();
  const { createGroup, updateGroup, deleteGroup, changeMembers } = useGroupMutations();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [memberEditorId, setMemberEditorId] = useState(null);
  const [memberDraft, setMemberDraft] = useState([]);
  const [error, setError] = useState('');

  const studentById = useMemo(
    () => Object.fromEntries(students.map((s) => [s.user_id, s])),
    [students],
  );

  const resetForm = () => {
    setName('');
    setDescription('');
    setSelectedMembers([]);
    setEditingId(null);
    setError('');
  };

  const toggleMember = (id, list, setList) => {
    setList((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const onCreate = async () => {
    setError('');
    try {
      if (editingId) {
        await updateGroup.mutateAsync({
          groupId: editingId,
          data: { name, description },
        });
      } else {
        await createGroup.mutateAsync({
          name,
          description,
          member_ids: selectedMembers,
        });
      }
      resetForm();
    } catch (err) {
      setError(err?.response?.data?.error?.message || 'خطا در ذخیره گروه');
    }
  };

  const startEdit = (group) => {
    setEditingId(group.id);
    setName(group.name);
    setDescription(group.description || '');
    setSelectedMembers([]);
  };

  const openMembers = (group) => {
    setMemberEditorId(group.id);
    setMemberDraft((group.members || []).map((m) => m.user_id));
  };

  const saveMembers = async () => {
    setError('');
    try {
      await changeMembers.mutateAsync({
        groupId: memberEditorId,
        data: { member_ids: memberDraft },
      });
      setMemberEditorId(null);
    } catch (err) {
      setError(err?.response?.data?.error?.message || 'خطا در به‌روزرسانی اعضا');
    }
  };

  return (
    <div className="px-4 md:px-8 py-6 max-w-6xl mx-auto flex flex-col gap-5">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">گروه‌ها</h2>
        <p className="text-sm text-gray-500 mt-1">دسته‌بندی دانش‌آموزان برای برنامه‌ریزی گروهی</p>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 text-red-600 text-sm px-4 py-3">{error}</div>
      )}

      <Card>
        <h3 className="font-bold text-sm text-gray-900 mb-3">
          {editingId ? 'ویرایش گروه' : 'ساخت گروه جدید'}
        </h3>
        <div className="flex flex-col gap-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="نام گروه"
            className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="توضیحات (اختیاری)"
            rows={2}
            className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
          />
          {!editingId && (
            <div className="max-h-40 overflow-y-auto border border-gray-100 rounded-xl p-2">
              {students.map((s) => (
                <label key={s.user_id} className="flex items-center gap-2 py-1.5 px-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedMembers.includes(s.user_id)}
                    onChange={() => toggleMember(s.user_id, selectedMembers, setSelectedMembers)}
                  />
                  <span>{s.full_name || s.phone_number}</span>
                </label>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <PrimaryButton onClick={onCreate} disabled={!name.trim() || createGroup.isPending}>
              {editingId ? 'ذخیره تغییرات' : 'ایجاد گروه'}
            </PrimaryButton>
            {editingId && <SecondaryButton onClick={resetForm}>انصراف</SecondaryButton>}
          </div>
        </div>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        {isLoading && <EmptyState message="در حال بارگذاری…" />}
        {!isLoading && groups.length === 0 && <EmptyState message="گروهی ندارید" />}
        {groups.map((group) => (
          <Card key={group.id}>
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <h3 className="font-bold text-gray-900">{group.name}</h3>
                <p className="text-xs text-gray-500 mt-1">{group.member_count} عضو</p>
              </div>
              <PrimaryButton
                className="!py-1.5 !px-3 !text-xs"
                onClick={() => navigateToTab('planning', { groupId: group.id })}
              >
                برنامه‌ریزی
              </PrimaryButton>
            </div>
            {group.description && (
              <p className="text-sm text-gray-600 mb-3">{group.description}</p>
            )}
            <div className="flex flex-wrap gap-1 mb-4">
              {(group.members || []).slice(0, 8).map((m) => (
                <span key={m.user_id} className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                  {m.full_name || studentById[m.user_id]?.full_name || m.user_id}
                </span>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <SecondaryButton className="!py-1.5 !text-xs" onClick={() => startEdit(group)}>
                ویرایش
              </SecondaryButton>
              <SecondaryButton className="!py-1.5 !text-xs" onClick={() => openMembers(group)}>
                اعضا
              </SecondaryButton>
              <DangerButton
                className="!py-1.5 !text-xs"
                onClick={async () => {
                  if (!window.confirm(`گروه «${group.name}» حذف شود؟`)) return;
                  await deleteGroup.mutateAsync(group.id);
                }}
              >
                حذف
              </DangerButton>
            </div>
          </Card>
        ))}
      </div>

      {memberEditorId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col">
            <h3 className="font-bold text-gray-900 mb-3">ویرایش اعضا</h3>
            <div className="flex-1 overflow-y-auto border border-gray-100 rounded-xl p-2 mb-4">
              {students.map((s) => (
                <label key={s.user_id} className="flex items-center gap-2 py-1.5 px-2 text-sm">
                  <input
                    type="checkbox"
                    checked={memberDraft.includes(s.user_id)}
                    onChange={() => toggleMember(s.user_id, memberDraft, setMemberDraft)}
                  />
                  <span>{s.full_name || s.phone_number}</span>
                </label>
              ))}
            </div>
            <div className="flex gap-2">
              <PrimaryButton onClick={saveMembers}>ذخیره</PrimaryButton>
              <SecondaryButton onClick={() => setMemberEditorId(null)}>بستن</SecondaryButton>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

export function GroupsDesktop() {
  return (
    <DesktopPageShell title="گروه‌ها">
      <GroupsBody />
    </DesktopPageShell>
  );
}

export function GroupsMobile({ onMenuClick }) {
  return (
    <MobilePageShell onMenuClick={onMenuClick}>
      <GroupsBody />
    </MobilePageShell>
  );
}

"""آزمون قواعد دامنه‌ی گروه دانش‌آموزی — بدون دیتابیس."""
from __future__ import annotations

from unittest import TestCase

from Planning.intervention.domain.entities.student_group import MAX_MEMBERS, StudentGroup
from Planning.shared.domain.errors import ValidationError


def make_group(**overrides) -> StudentGroup:
    params = {'school_id': 1, 'consultant_id': 2, 'name': 'کنکوری‌های ریاضی'}
    params.update(overrides)
    return StudentGroup.create(**params)


class StudentGroupTests(TestCase):
    def test_name_is_required_and_trimmed(self):
        self.assertEqual(make_group(name='  گروه الف  ').name, 'گروه الف')
        with self.assertRaises(ValidationError):
            make_group(name='   ')
        with self.assertRaises(ValidationError):
            make_group(name='x' * 101)

    def test_members_are_deduplicated(self):
        group = make_group(member_ids=[5, 5, 7])
        self.assertEqual(group.member_ids, {5, 7})
        self.assertEqual(group.member_count, 2)

    def test_add_and_remove_members(self):
        group = make_group(member_ids=[5])
        group.add_members([7, 9])
        self.assertEqual(group.member_ids, {5, 7, 9})
        group.remove_members([5, 404])  # حذف عضو ناموجود بی‌خطر است
        self.assertEqual(group.member_ids, {7, 9})
        self.assertTrue(group.has_member(7))

    def test_replace_members(self):
        group = make_group(member_ids=[1, 2, 3])
        group.replace_members([4])
        self.assertEqual(group.member_ids, {4})

    def test_member_limit_is_enforced(self):
        group = make_group()
        with self.assertRaises(ValidationError):
            group.replace_members(range(1, MAX_MEMBERS + 2))
        self.assertEqual(group.member_count, 0)

    def test_non_numeric_member_id_is_rejected(self):
        with self.assertRaises(ValidationError):
            make_group(member_ids=['abc'])

    def test_ownership_check(self):
        group = make_group(consultant_id=2)
        self.assertTrue(group.belongs_to(2))
        self.assertFalse(group.belongs_to(3))

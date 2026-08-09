"""پیاده‌سازی مخزن یادداشت خصوصی مشاور."""
from __future__ import annotations

from .....shared.domain.errors import NotFoundError
from ....domain.entities.consultant_note import ConsultantNote
from ....domain.repositories.consultant_note_repository import ConsultantNoteRepository
from .. import models as m
from ..mappers import ConsultantNoteMapper


class DjangoConsultantNoteRepository(ConsultantNoteRepository):
    def add(self, note: ConsultantNote) -> ConsultantNote:
        row = ConsultantNoteMapper.to_model(note)
        row.save()
        note.id = row.id
        note.created_at = row.created_at
        note.updated_at = row.updated_at
        return note

    def get(self, note_id: int, *, consultant_id: int) -> ConsultantNote:
        row = m.ConsultantStudentNoteModel.objects.filter(
            id=note_id, consultant_id=consultant_id,
        ).first()
        if row is None:
            raise NotFoundError('یادداشت مورد نظر یافت نشد.', meta={'note_id': note_id})
        return ConsultantNoteMapper.to_entity(row)

    def list_for_student(
        self, *, consultant_id: int, student_id: int,
    ) -> list[ConsultantNote]:
        rows = m.ConsultantStudentNoteModel.objects.filter(
            consultant_id=consultant_id, student_id=student_id,
        )
        return [ConsultantNoteMapper.to_entity(row) for row in rows]

    def save(self, note: ConsultantNote) -> None:
        updated = m.ConsultantStudentNoteModel.objects.filter(
            id=note.id, consultant_id=note.consultant_id,
        ).update(body=note.body)
        if updated == 0:
            raise NotFoundError('یادداشت مورد نظر یافت نشد.', meta={'note_id': note.id})

    def delete(self, note_id: int, *, consultant_id: int) -> None:
        deleted, _ = m.ConsultantStudentNoteModel.objects.filter(
            id=note_id, consultant_id=consultant_id,
        ).delete()
        if deleted == 0:
            raise NotFoundError('یادداشت مورد نظر یافت نشد.', meta={'note_id': note_id})

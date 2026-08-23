from typing import Annotated

from fastapi import Depends

from src.core.database import UoWDep
from src.modules.exam.service import CreateExamService


def get_create_exam_service(uow: UoWDep) -> CreateExamService:
    return CreateExamService(uow=uow)


CreateExamServiceDep = Annotated[
    CreateExamService,
    Depends(get_create_exam_service),
]

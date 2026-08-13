from enum import StrEnum

from pydantic import BaseModel

from modules.problem.database_schemas import SinglePDFSourceSchema

class RenderMode(StrEnum):
    SINGLE_PDF = "SINGLE_PDF"


class ExamConfigSchema(BaseModel):
    render_mode: RenderMode
    source: SinglePDFSourceSchema | None
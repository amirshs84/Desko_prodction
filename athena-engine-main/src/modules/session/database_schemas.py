from pydantic import BaseModel

class MCQResponseDataSchema(BaseModel):
    selected_option_id: int | None
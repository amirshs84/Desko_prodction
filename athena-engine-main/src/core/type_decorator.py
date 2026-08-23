from typing import Any

from pydantic import BaseModel
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.types import TypeDecorator


class PydanticJSONB(TypeDecorator[BaseModel]):
    impl = JSONB
    cache_ok = True

    def __init__(
        self,
        schema_type: type[BaseModel],
        *args: Any,
        **kwargs: Any,
    ) -> None:
        self.schema_type = schema_type
        super().__init__(*args, **kwargs)

    def process_bind_param(
        self,
        value: BaseModel | None,
        dialect: Any,
    ) -> dict[str, Any] | None:
        if value is None:
            return None

        if not isinstance(value, self.schema_type):
            raise TypeError(
                f"{self.schema_type.__name__} is expected, "
                f"got {type(value).__name__}"
            )

        return value.model_dump(mode="json")

    def process_result_value(
        self,
        value: dict[str, Any] | None,
        dialect: Any,
    ) -> BaseModel | None:
        if value is None:
            return None

        return self.schema_type.model_validate(value)

    def coerce_compared_value(self, op: Any, value: Any) -> Any:
        return self.impl.coerce_compared_value(op, value)

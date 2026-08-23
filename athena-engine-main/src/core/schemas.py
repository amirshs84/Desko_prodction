from typing import Callable

from pydantic import BaseModel, ConfigDict


class Page[T](BaseModel):
    model_config = ConfigDict(frozen=True)

    items: tuple[T, ...]
    total: int
    limit: int
    offset: int


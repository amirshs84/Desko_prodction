from fastapi import APIRouter

from src.api.v1.attempt import router as attempt_router
from src.api.v1.exam import router as exam_router
from src.api.v1.session import router as session_router

api_router = APIRouter()

api_router.include_router(exam_router)
api_router.include_router(session_router)
api_router.include_router(attempt_router)

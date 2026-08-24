from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import ValidationError as PydanticValidationError

from src.api.v1 import api_router
from src.api.v1.exception_handler import domain_error_handler
from src.core.config import settings
from src.core.exceptions import DomainError


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        debug=settings.DEBUG,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ALLOW_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(api_router, prefix=settings.API_V1_VERSION)

    app.add_exception_handler(DomainError, domain_error_handler)

    @app.exception_handler(PydanticValidationError)
    async def pydantic_error_handler(_request, exc: PydanticValidationError) -> JSONResponse:
        return JSONResponse(
            status_code=500,
            content={"code": "internal_server_error", "detail": exc.errors()},
        )

    @app.get("/health", tags=["Health"])
    async def health_check() -> dict[str, str]:
        return {"status": "ok"}

    return app


app = create_app()

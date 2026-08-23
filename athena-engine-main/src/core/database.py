from collections.abc import AsyncGenerator
from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import (
    AsyncAttrs,
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from src.core.config import settings


engine: AsyncEngine = create_async_engine(
    url=settings.POSTGRES_URL_OBJECT,
    echo=settings.DB_ECHO,
    pool_size=settings.DB_POOL_SIZE,
    max_overflow=settings.DB_MAX_OVERFLOW,
    pool_pre_ping=True,
)


AsyncSessionFactory: async_sessionmaker[AsyncSession] = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False,
)


class Base(AsyncAttrs, DeclarativeBase):
    pass


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionFactory() as session:
        try:
            yield session
        finally:
            await session.close()


DBSessionDep = Annotated[AsyncSession, Depends(get_db_session)]


class AsyncSqlAlchemyUoW():
    def __init__(self, session: AsyncSession):
        from src.modules.exam.repository import ExamRepository, ExamSessionRepository
        from src.modules.problem.repository import ProblemRepository
        from src.modules.session.repository import SessionAttemptRepository

        self.session = session
        self._commited = False

        self.problem = ProblemRepository(session)
        self.exam = ExamRepository(session)
        self.exam_session = ExamSessionRepository(session)
        self.attempt = SessionAttemptRepository(session)
        
    async def __aenter__(self):
        self._commited = False
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if exc_type is not None:
            await self.rollback()
        
        if not self._commited:
            """
            TODO: Add logging here to find where the commit was missed.
            """
            await self.rollback()

    async def commit(self):
        await self.session.commit()
        self._commited = True

    async def rollback(self):
        await self.session.rollback()


async def get_uow(session: DBSessionDep) -> AsyncSqlAlchemyUoW:
    return AsyncSqlAlchemyUoW(session=session)


UoWDep = Annotated[AsyncSqlAlchemyUoW, Depends(get_uow)]

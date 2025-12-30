"""SQLAlchemy base model shared across the project."""

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Declarative base class that all ORM models inherit from."""

    pass

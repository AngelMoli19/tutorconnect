# TutorConnect Backend

## Requisitos
- Python 3.11 o superior
- PostgreSQL 14+

## Instalación rápida
```bash
python -m venv .venv
. .venv/Scripts/activate  # Windows PowerShell
pip install --upgrade pip
pip install -e .[dev]
```

## Variables de entorno
Copiar `.env.example` a `.env` y ajustar los valores correspondientes.

```text
APP_NAME=TutorConnect
APP_ENV=development
DATABASE_URL=postgresql+psycopg://user:password@localhost:5432/tutorconnect
JWT_SECRET=change-me
JWT_EXPIRE_MINUTES=60
```

## Ejecutar el servidor
```bash
uvicorn app.main:app --reload
```

## Estructura prevista
- `app/core`: configuración, seguridad, constantes.
- `app/api`: routers agrupados por módulo.
- `app/models`: modelos SQLAlchemy.
- `app/schemas`: esquemas Pydantic.
- `app/services`: lógica de negocio.
- `app/db`: inicialización de la base de datos y sesión.

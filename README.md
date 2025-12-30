# TutorConnect

Plataforma web para la gestion integral del sistema de tutorias universitarias de la UNA Puno.

## Estructura del proyecto
- `backend/`: servicio FastAPI en Python para autenticacion, gestion de usuarios y APIs del administrador.
- `frontend/`: aplicacion Vite + React (TypeScript) que consumira las APIs expuestas por el backend.
- `docs/`: documentacion funcional y tecnica (plan del modulo administrador, arquitectura inicial, etc.).

## Estado actual
- Definicion de arquitectura inicial y alcances del modulo administrador (`docs/admin-module-plan.md`).
- Backend FastAPI inicializado con modelos, esquemas y endpoints para:
  - Autenticacion (`POST /api/auth/login`).
  - Gestion de tutores y tutorandos (`GET /api/admin/users`, `POST /api/admin/tutors`, `POST /api/admin/tutorandos`).
  - Actualizacion y baja logica de usuarios (`PUT /api/admin/tutors/{id}`, `PUT /api/admin/tutorandos/{id}`, `DELETE /api/admin/users/{id}`).
  - Asignacion de tutorandos a tutores (`POST /api/admin/assignments`, `GET /api/admin/assignments/{tutorId}`, `DELETE /api/admin/assignments/{assignmentId}`).
  - Metricas basicas del dashboard administrador (`GET /api/admin/dashboard`).
- Frontend Vite + React con modulos iniciales del administrador:
  - Pantalla de inicio de sesion conectada a `/api/auth/login`.
  - Dashboard que consume `/api/admin/dashboard`.
  - Listado de usuarios consumiendo `/api/admin/users` con filtros por rol.

## Primeros pasos para desarrollo local
1. **Instalar dependencias generales**
   ```bash
   npm install
   ```
2. **Backend**
   ```bash
   cd backend
   python -m venv .venv
   . .venv/Scripts/activate  # PowerShell
   pip install -e .[dev]
   cp .env.example .env  # Ajustar credenciales de PostgreSQL
   uvicorn app.main:app --reload
   ```
3. **Frontend**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

> También puedes lanzar ambos servicios en paralelo desde la raíz con `npm run dev` (usa la venv en `backend/.venv` y Vite en puerto 5173).

### Migraciones y seed inicial
1. Ajusta los valores `ADMIN_*` en `backend/.env` si deseas personalizar el administrador inicial.
2. Ejecuta las migraciones:
   ```bash
   cd backend
   . .venv/Scripts/activate  # PowerShell
   alembic upgrade head
   ```
3. Inicia el backend (`uvicorn app.main:app --reload`) y utiliza las credenciales configuradas para el administrador.

## Proximos pasos sugeridos
1. Implementar migraciones con Alembic y sembrar el usuario administrador inicial.
2. Ejecutar `alembic upgrade head` para crear el esquema y sembrar el administrador inicial (configurable mediante variables `ADMIN_*` en `.env`).
3. Anadir endpoints adicionales para reactivar usuarios y reforzar reglas de negocio de asignaciones.
4. Definir catalogo de Facultades/Escuelas en base de datos y exponer endpoints publicos.
5. Construir la interfaz del modulo administrador: login, dashboard, panel de usuarios y vistas de asignacion.
6. Configurar pruebas automatizadas (pytest y testing de frontend) para asegurar regresiones minimas.

## Pruebas sugeridas (backend)
- Ejecutar `pytest` para validar autenticacion, CRUD de usuarios y flujos de asignacion (casos felices y de error).
- Realizar solicitudes manuales con HTTPie o Thunder Client contra `/api/auth/login`, `/api/admin/users`, `/api/admin/assignments`.
- Verificar regeneracion de contrasenas al actualizar fechas de nacimiento y que las asignaciones se desactiven al desactivar usuarios o al usar `DELETE /api/admin/assignments/{assignmentId}`.

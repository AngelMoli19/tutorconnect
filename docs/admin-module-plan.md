# TutorConnect – Admin Module Blueprint

## 1. Contexto general del sistema
- **Tecnologías**: Backend en Python (FastAPI recomendado por su rendimiento y soporte async), frontend con Vite + React, base de datos relacional PostgreSQL.
- **Arquitectura**: Aplicación web dividida en frontend y backend REST. Comunicación mediante API seguras con autenticación basada en JWT. Despliegue en contenedores (Docker) previsto para entornos posteriores.
- **Gestión de roles**: Tres roles principales (Administrador, Tutor, Tutorando). El backend detecta el rol según credenciales y devuelve permisos específicos.

## 2. Objetivos de la primera iteración (módulo Administrador)
1. Implementar autenticación común (login) para todos los usuarios.
2. Construir el panel del administrador con métricas básicas.
3. Habilitar la gestión de usuarios (crear/editar/eliminar Tutores y Tutorandos).
4. Preparar endpoints para asignación de Tutorandos a Tutores.
5. Garantizar validaciones de unicidad (DNI, código de matrícula) y manejo seguro de contraseñas.

## 3. Modelo de datos inicial (PostgreSQL)
```text
users
  id (pk, uuid)
  dni (varchar(15), unique)
  password_hash (text)
  role (enum: ADMIN, TUTOR, TUTORANDO)
  created_at (timestamp)
  updated_at (timestamp)

profiles
  id (pk, uuid)
  user_id (fk -> users.id, unique)
  first_name
  last_name_father
  last_name_mother
  email
  gender (enum: M, F, O)
  phone (varchar(9))
  birthdate (date)
  address
  faculty (enum/lista)
  school
  department
  province
  district
  created_at
  updated_at

tutor_profiles
  id (pk, uuid)
  profile_id (fk -> profiles.id, unique)
  -- extensiones futuras (experiencia, disponibilidad, etc.)

tutorando_profiles
  id (pk, uuid)
  profile_id (fk -> profiles.id, unique)
  enrollment_code (varchar, unique)

tutor_assignments
  id (pk, uuid)
  tutor_id (fk -> users.id con role = TUTOR)
  tutorando_id (fk -> users.id con role = TUTORANDO)
  assigned_at (timestamp)
  active (bool)
```
> Nota: Las credenciales (dni, password) viven en `users`. Los datos visibles del perfil residen en `profiles` y tablas específicas según el rol. Esto garantiza que las contraseñas no se expongan en los perfiles.

## 4. Endpoints previstos (versión inicial)
- `POST /auth/login`: acepta `dni` + `password`; devuelve JWT + metadatos del usuario (rol, nombre, etc.).
- `GET /admin/dashboard`: métricas agregadas (cantidad tutores/tutorandos, sesiones programadas).
- `GET /admin/users`: lista de usuarios (paginada, filtrada por rol).
- `POST /admin/tutors`: registrar tutor con datos completos.
- `POST /admin/tutorandos`: registrar tutorando con datos completos.
- `PUT /admin/tutors/{id}` / `PUT /admin/tutorandos/{id}`: actualizar datos del perfil.
- `DELETE /admin/users/{id}`: desactivar/eliminar usuarios (soft delete en primera instancia).
- `POST /admin/assignments`: asignar tutorandos a un tutor.
- `GET /admin/assignments/{tutorId}`: ver asignaciones vigentes de un tutor (parametro `include_inactive` opcional).
- `DELETE /admin/assignments/{assignmentId}`: desactivar una asignacion tutor-tutorando.

## 5. Validaciones clave
- Contraseñas almacenadas con hash (bcrypt) y comparación segura.
- DNI y código de matrícula son únicos. Mensajes de error:
  - `El usuario con este DNI ya existe.`
  - `El usuario o código de matrícula ya existen en el sistema.`
- Teléfono: validar longitud exacta 9 dígitos.
- Facultad y escuela deben corresponder a la lista oficial (usar catálogos).
- Campos obligatorios según rol, con manejo consistente de errores en frontend.

## 6. Catálogo Maestro
Se definirá una tabla `catalog_faculties` y `catalog_schools` para almacenar la lista de la UNA PUNO. El backend expondrá un endpoint público autenticado (`GET /catalogs/faculties` y `GET /catalogs/schools`) para poblar selects en el frontend.

## 7. Flujo del Administrador (MVP)
1. Inicia sesión con credenciales únicas (seed inicial en base de datos).
2. Accede a un dashboard con conteos y tarjetas con métricas básicas.
3. Desde el módulo de usuarios:
   - Registra tutores o tutorandos mediante formularios multi-sección.
   - Edita perfiles existentes.
   - Elimina (desactiva) registros.
4. Asigna Tutorandos a Tutores mediante una vista de selección múltiple.
   - Permite desactivar asignaciones existentes cuando sea necesario.

## 8. Backend – primer sprint
- Configurar proyecto FastAPI con rutas modulares y autenticación JWT.
- Definir modelos Pydantic y modelos SQLAlchemy (o SQLModel) para las tablas mencionadas.
- Implementar servicios de creación y edición con transacciones y validaciones.
- Preparar pruebas unitarias básicas para autenticación y registro.

## 9. Frontend – primer sprint
- Inicializar proyecto Vite + React con Typescript.
- Configurar rutas protegidas y layout específico para administrador.
- Crear vistas:
  - Login común.
  - Dashboard admin con tarjetas y gráficas placeholder.
  - Gestión de usuarios (listar, crear, editar).
  - Asignación de tutorandos (UI inicial con checkboxes).
- Conectar a API mediante cliente reutilizable (axios u otro).

## 10. Próximos pasos sugeridos
1. Generar repositorio Git con ramas por módulo.
2. Sembrar datos base (admin) en migraciones iniciales (`alembic upgrade head`, variables `ADMIN_*`).
3. Configurar herramientas de desarrollo: entorno virtual, linters (ruff/black), testing (pytest), frontend ESLint/Prettier.
4. Automatizar scripts de levantamiento (`make`, `invoke`, o `npm scripts`) para backend y frontend.
5. Preparar pruebas automatizadas para autenticacion, CRUD y asignaciones (pytest + HTTPX) y definir escenarios de regresion en el frontend.

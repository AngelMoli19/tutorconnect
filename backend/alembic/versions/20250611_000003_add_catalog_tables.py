"""Add catalog tables for faculties and schools."""

from __future__ import annotations

import uuid

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql
from sqlalchemy.sql import column, table

# revision identifiers, used by Alembic.
revision = "20250611_000003"
down_revision = "20250611_000002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "faculties",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column("name", sa.String(length=200), nullable=False, unique=True),
    )
    op.create_table(
        "schools",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column("faculty_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("faculties.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.UniqueConstraint("faculty_id", "name", name="uq_school_name_per_faculty"),
    )

    # Seed UNA Puno catalog data
    faculties = [
        ("FACULTAD DE CIENCIAS AGRARIAS", ["Ingeniería Agronómica", "Ingeniería Agroindustrial", "Ingeniería Topográfica y Agrimensura"]),
        ("FACULTAD DE INGENIERÍA AGRÍCOLA", ["Ingeniería Agrícola"]),
        ("FACULTAD DE INGENIERÍA CIVIL Y ARQUITECTURA", ["Ingeniería Civil – Acred. ICACIT", "Arquitectura y Urbanismo"]),
        ("FACULTAD DE INGENIERÍA ECONÓMICA", ["Ingeniería Económica"]),
        ("FACULTAD DE INGENIERÍA ESTADÍSTICA E INFORMÁTICA", ["Ingeniería Estadística e Informática"]),
        ("FACULTAD DE INGENIERÍA GEOLÓGICA Y METALÚRGICA", ["Ingeniería Geológica", "Ingeniería Metalúrgica"]),
        ("FACULTAD DE INGENIERÍA MECÁNICA ELÉCTRICA, ELECTRÓNICA Y SISTEMAS", ["Ingeniería Electrónica", "Ingeniería Mecánica Eléctrica", "Ingeniería de Sistemas"]),
        ("FACULTAD DE INGENIERÍA DE MINAS", ["Ingeniería de Minas"]),
        ("FACULTAD DE INGENIERÍA QUÍMICA", ["Ingeniería Química"]),
        ("FACULTAD DE CIENCIAS BIOLÓGICAS", ["Ciencias Biológicas", "Ciencias Biológicas: Pesquería", "Ciencias Biológicas: Microbiología"]),
        ("FACULTAD DE CIENCIAS DE LA SALUD", ["Nutrición Humana", "Odontología"]),
        ("FACULTAD DE ENFERMERÍA", ["Enfermería"]),
        ("FACULTAD DE MEDICINA HUMANA", ["Medicina Humana"]),
        ("FACULTAD DE MEDICINA VETERINARIA Y ZOOTECNIA", ["Medicina Veterinaria y Zootecnia"]),
        ("FACULTAD DE CIENCIAS CONTABLES Y ADMINISTRATIVAS", ["Ciencias Contables"]),
        ("FACULTAD DE CIENCIAS DE LA EDUCACIÓN", ["Física", "Inicial", "Primaria", "Secundaria"]),
        ("FACULTAD DE CIENCIAS JURÍDICAS Y POLÍTICAS", ["Derecho"]),
        ("FACULTAD DE CIENCIAS SOCIALES", ["Antropología", "Arte", "Ciencias de la Comunicación Social", "Sociología", "Turismo"]),
        ("FACULTAD DE TRABAJO SOCIAL", ["Trabajo Social"]),
        ("FACULTAD DE CIENCIAS ADMINISTRATIVAS Y HUMANAS", ["Administración"]),
    ]

    faculty_rows = []
    school_rows = []

    for faculty_name, school_list in faculties:
        faculty_id = uuid.uuid4()
        faculty_rows.append({"id": faculty_id, "name": faculty_name})
        for school_name in school_list:
            school_rows.append(
                {"id": uuid.uuid4(), "faculty_id": faculty_id, "name": school_name},
            )

    faculty_table = table(
        "faculties",
        column("id", postgresql.UUID(as_uuid=True)),
        column("name", sa.String(length=200)),
    )
    school_table = table(
        "schools",
        column("id", postgresql.UUID(as_uuid=True)),
        column("faculty_id", postgresql.UUID(as_uuid=True)),
        column("name", sa.String(length=200)),
    )

    op.bulk_insert(faculty_table, faculty_rows)
    op.bulk_insert(school_table, school_rows)


def downgrade() -> None:
    op.drop_table("schools")
    op.drop_table("faculties")

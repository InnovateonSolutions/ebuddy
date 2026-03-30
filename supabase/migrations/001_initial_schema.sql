-- ============================================================
-- ebuddy — Migración 001: Schema inicial
-- ============================================================

-- Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ENUMs
-- ============================================================

CREATE TYPE ticket_context AS ENUM ('NEGOCIO', 'PERSONAL');
CREATE TYPE ticket_priority AS ENUM ('ALTA', 'MEDIA', 'BAJA');
CREATE TYPE ticket_status AS ENUM ('PENDING', 'IN_PROGRESS', 'DONE');
CREATE TYPE calendar_provider AS ENUM ('GOOGLE', 'MICROSOFT');

-- ============================================================
-- TABLA: users (extiende auth.users de Supabase)
-- ============================================================

CREATE TABLE public.users (
  id            uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         text        NOT NULL UNIQUE,
  display_name  text        NOT NULL DEFAULT '',
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- TABLA: user_preferences
-- ============================================================

CREATE TABLE public.user_preferences (
  user_id     uuid  PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  timezone    text  NOT NULL DEFAULT 'America/Tijuana',
  work_start  time  NOT NULL DEFAULT '08:00',
  work_end    time  NOT NULL DEFAULT '19:00'
);

-- ============================================================
-- TABLA: tickets
-- ============================================================

CREATE TABLE public.tickets (
  id          uuid              PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     uuid              NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title       text              NOT NULL,
  context     ticket_context    NOT NULL,
  overview    text              NOT NULL DEFAULT '',
  what_to_do  text              NOT NULL DEFAULT '',
  next_steps  text[]            NOT NULL DEFAULT '{}',
  priority    ticket_priority   NOT NULL DEFAULT 'MEDIA',
  status      ticket_status     NOT NULL DEFAULT 'PENDING',
  due_date    date              NULL,
  raw_input   text              NOT NULL DEFAULT '',
  created_at  timestamptz       NOT NULL DEFAULT now(),
  updated_at  timestamptz       NOT NULL DEFAULT now()
);

-- Índices críticos para queries frecuentes
CREATE INDEX idx_tickets_user_date     ON public.tickets(user_id, due_date);
CREATE INDEX idx_tickets_user_status   ON public.tickets(user_id, status);
CREATE INDEX idx_tickets_user_context  ON public.tickets(user_id, context);
CREATE INDEX idx_tickets_created_at    ON public.tickets(user_id, created_at DESC);

-- Trigger para updated_at automático
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tickets_updated_at
  BEFORE UPDATE ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- TABLA: calendar_tokens
-- ============================================================

CREATE TABLE public.calendar_tokens (
  user_id       uuid               NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  provider      calendar_provider  NOT NULL,
  access_token  text               NOT NULL,
  refresh_token text               NOT NULL,
  expires_at    timestamptz        NOT NULL,
  created_at    timestamptz        NOT NULL DEFAULT now(),
  updated_at    timestamptz        NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, provider)
);

CREATE INDEX idx_calendar_tokens_user_provider
  ON public.calendar_tokens(user_id, provider);

CREATE TRIGGER calendar_tokens_updated_at
  BEFORE UPDATE ON public.calendar_tokens
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- FUNCIÓN: crear perfil de usuario al registrarse
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  );

  INSERT INTO public.user_preferences (user_id)
  VALUES (NEW.id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

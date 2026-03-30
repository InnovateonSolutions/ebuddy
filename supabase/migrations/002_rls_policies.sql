-- ============================================================
-- ebuddy — Migración 002: Row Level Security
-- ============================================================
-- RLS garantiza que un usuario NUNCA pueda leer ni escribir
-- datos de otro usuario, incluso si hay un bug en el código.
-- ============================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE public.users            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_tokens  ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- POLICIES: users
-- ============================================================

CREATE POLICY "users: ver solo perfil propio"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "users: actualizar solo perfil propio"
  ON public.users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ============================================================
-- POLICIES: user_preferences
-- ============================================================

CREATE POLICY "preferences: ver las propias"
  ON public.user_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "preferences: insertar las propias"
  ON public.user_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "preferences: actualizar las propias"
  ON public.user_preferences FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- POLICIES: tickets
-- ============================================================

CREATE POLICY "tickets: ver los propios"
  ON public.tickets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "tickets: crear propios"
  ON public.tickets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "tickets: actualizar propios"
  ON public.tickets FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "tickets: eliminar propios"
  ON public.tickets FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- POLICIES: calendar_tokens
-- ============================================================

CREATE POLICY "calendar_tokens: ver los propios"
  ON public.calendar_tokens FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "calendar_tokens: insertar los propios"
  ON public.calendar_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "calendar_tokens: actualizar los propios"
  ON public.calendar_tokens FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "calendar_tokens: eliminar los propios"
  ON public.calendar_tokens FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- Habilitar Realtime en tabla tickets
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.tickets;

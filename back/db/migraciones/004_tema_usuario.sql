-- back/db/migraciones/004_tema_usuario.sql
-- Guarda en la cuenta del usuario el tema visual que eligió en "Mi perfil":
--   SISTEMA -> sigue el modo claro/oscuro del dispositivo (valor por defecto)
--   CLARO   -> siempre claro
--   OSCURO  -> siempre oscuro
-- Así se ve igual en cualquier computadora donde inicie sesión.
--
-- No borra datos y se puede correr más de una vez.
--
-- Uso (desde la carpeta back):
--   node db/migrar.js db/migraciones/004_tema_usuario.sql

ALTER TABLE usuario
  ADD COLUMN IF NOT EXISTS tema TEXT NOT NULL DEFAULT 'SISTEMA'
  CHECK (tema IN ('SISTEMA', 'CLARO', 'OSCURO'));
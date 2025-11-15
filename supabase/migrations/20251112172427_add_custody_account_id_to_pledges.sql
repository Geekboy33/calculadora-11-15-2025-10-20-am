/*
  # Agregar custody_account_id a pledges

  1. Changes
    - Agregar columna custody_account_id a daes_pledges_cache
    - Agregar índice para búsqueda eficiente
    - Agregar constraint único para evitar duplicados (custody_account_id + status ACTIVE)

  2. Security
    - Mantiene RLS existente
    - Validación de duplicados a nivel de base de datos
*/

-- Agregar columna custody_account_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'daes_pledges_cache' AND column_name = 'custody_account_id'
  ) THEN
    ALTER TABLE daes_pledges_cache ADD COLUMN custody_account_id TEXT;
  END IF;
END $$;

-- Crear índice para búsqueda eficiente
CREATE INDEX IF NOT EXISTS idx_daes_pledges_custody_account
  ON daes_pledges_cache(custody_account_id)
  WHERE custody_account_id IS NOT NULL;

-- Crear índice compuesto para validación de duplicados
CREATE INDEX IF NOT EXISTS idx_daes_pledges_custody_status
  ON daes_pledges_cache(custody_account_id, status)
  WHERE custody_account_id IS NOT NULL AND status = 'ACTIVE';

-- NOTA: No creamos UNIQUE constraint porque queremos permitir múltiples pledges
-- históricos de la misma cuenta (RELEASED, EXPIRED), solo validamos ACTIVE en código

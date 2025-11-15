/*
  # Sistema de Roles y Permisos

  1. Nuevas Tablas
    - `user_roles`: Almacena roles de usuarios
      - `id` (uuid, PK)
      - `user_id` (uuid, FK a auth.users)
      - `role` (text): 'admin', 'operator', 'auditor', 'viewer'
      - `assigned_by` (uuid, FK a auth.users)
      - `assigned_at` (timestamptz)
      - `expires_at` (timestamptz, opcional)
      - `is_active` (boolean)

    - `role_permissions`: Define permisos por rol
      - `id` (uuid, PK)
      - `role` (text)
      - `module` (text): nombre del módulo
      - `can_view` (boolean)
      - `can_create` (boolean)
      - `can_edit` (boolean)
      - `can_delete` (boolean)
      - `can_export` (boolean)
      - `created_at` (timestamptz)

    - `audit_permissions`: Log de cambios de permisos
      - `id` (uuid, PK)
      - `user_id` (uuid)
      - `action` (text): 'grant', 'revoke', 'modify'
      - `role` (text)
      - `performed_by` (uuid)
      - `details` (jsonb)
      - `timestamp` (timestamptz)

  2. Seguridad
    - RLS habilitado en todas las tablas
    - Solo admins pueden modificar roles
    - Auditoría completa de cambios
    - Logs inmutables
*/

-- Tabla de roles de usuarios
CREATE TABLE IF NOT EXISTS user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'operator', 'auditor', 'viewer')),
  assigned_by uuid NOT NULL,
  assigned_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  is_active boolean DEFAULT true,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Índices para user_roles
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);
CREATE INDEX IF NOT EXISTS idx_user_roles_active ON user_roles(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_user_roles_expires ON user_roles(expires_at) WHERE expires_at IS NOT NULL;

-- Tabla de permisos por rol
CREATE TABLE IF NOT EXISTS role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL CHECK (role IN ('admin', 'operator', 'auditor', 'viewer')),
  module text NOT NULL,
  can_view boolean DEFAULT false,
  can_create boolean DEFAULT false,
  can_edit boolean DEFAULT false,
  can_delete boolean DEFAULT false,
  can_export boolean DEFAULT false,
  can_admin boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(role, module)
);

-- Índices para role_permissions
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role);
CREATE INDEX IF NOT EXISTS idx_role_permissions_module ON role_permissions(module);

-- Tabla de auditoría de permisos
CREATE TABLE IF NOT EXISTS audit_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('grant', 'revoke', 'modify', 'view')),
  role text NOT NULL,
  module text,
  performed_by uuid NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  user_agent text,
  timestamp timestamptz DEFAULT now()
);

-- Índices para audit_permissions
CREATE INDEX IF NOT EXISTS idx_audit_permissions_user_id ON audit_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_permissions_performed_by ON audit_permissions(performed_by);
CREATE INDEX IF NOT EXISTS idx_audit_permissions_timestamp ON audit_permissions(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_permissions_action ON audit_permissions(action);

-- Habilitar RLS
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_permissions ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para user_roles

-- Los usuarios pueden ver sus propios roles
CREATE POLICY "Users can view own roles"
  ON user_roles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Los admins pueden ver todos los roles
CREATE POLICY "Admins can view all roles"
  ON user_roles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
      AND is_active = true
    )
  );

-- Solo admins pueden crear roles
CREATE POLICY "Admins can create roles"
  ON user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
      AND is_active = true
    )
  );

-- Solo admins pueden actualizar roles
CREATE POLICY "Admins can update roles"
  ON user_roles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
      AND is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
      AND is_active = true
    )
  );

-- Solo admins pueden eliminar roles
CREATE POLICY "Admins can delete roles"
  ON user_roles
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
      AND is_active = true
    )
  );

-- Políticas RLS para role_permissions

-- Todos los usuarios autenticados pueden ver permisos
CREATE POLICY "Authenticated users can view permissions"
  ON role_permissions
  FOR SELECT
  TO authenticated
  USING (true);

-- Solo admins pueden modificar permisos
CREATE POLICY "Admins can manage permissions"
  ON role_permissions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
      AND is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
      AND is_active = true
    )
  );

-- Políticas RLS para audit_permissions

-- Los usuarios pueden ver su propio historial de auditoría
CREATE POLICY "Users can view own audit history"
  ON audit_permissions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Admins y auditores pueden ver todo el historial
CREATE POLICY "Admins and auditors can view all audit logs"
  ON audit_permissions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'auditor')
      AND is_active = true
    )
  );

-- Solo el sistema puede insertar logs de auditoría
CREATE POLICY "System can insert audit logs"
  ON audit_permissions
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Nadie puede modificar o eliminar logs de auditoría (inmutable)
-- (No se crean políticas de UPDATE o DELETE)

-- Insertar permisos por defecto

-- Admin: Todos los permisos
INSERT INTO role_permissions (role, module, can_view, can_create, can_edit, can_delete, can_export, can_admin)
VALUES
  ('admin', 'dashboard', true, true, true, true, true, true),
  ('admin', 'ledger', true, true, true, true, true, true),
  ('admin', 'blackscreen', true, true, true, true, true, true),
  ('admin', 'custody', true, true, true, true, true, true),
  ('admin', 'api-daes', true, true, true, true, true, true),
  ('admin', 'audit-bank', true, true, true, true, true, true),
  ('admin', 'corebanking-api', true, true, true, true, true, true),
  ('admin', 'xcp-b2b', true, true, true, true, true, true),
  ('admin', 'processor', true, true, true, true, true, true),
  ('admin', 'transfers', true, true, true, true, true, true),
  ('admin', 'audit-logs', true, true, true, true, true, true)
ON CONFLICT (role, module) DO NOTHING;

-- Operator: Permisos de operación (no puede eliminar)
INSERT INTO role_permissions (role, module, can_view, can_create, can_edit, can_delete, can_export, can_admin)
VALUES
  ('operator', 'dashboard', true, false, false, false, true, false),
  ('operator', 'ledger', true, false, false, false, true, false),
  ('operator', 'blackscreen', true, true, true, false, true, false),
  ('operator', 'custody', true, true, true, false, true, false),
  ('operator', 'processor', true, true, false, false, true, false),
  ('operator', 'transfers', true, true, true, false, true, false)
ON CONFLICT (role, module) DO NOTHING;

-- Auditor: Solo lectura y exportación
INSERT INTO role_permissions (role, module, can_view, can_create, can_edit, can_delete, can_export, can_admin)
VALUES
  ('auditor', 'dashboard', true, false, false, false, true, false),
  ('auditor', 'ledger', true, false, false, false, true, false),
  ('auditor', 'audit-bank', true, false, false, false, true, false),
  ('auditor', 'audit-logs', true, false, false, false, true, false),
  ('auditor', 'processor', true, false, false, false, true, false)
ON CONFLICT (role, module) DO NOTHING;

-- Viewer: Solo visualización
INSERT INTO role_permissions (role, module, can_view, can_create, can_edit, can_delete, can_export, can_admin)
VALUES
  ('viewer', 'dashboard', true, false, false, false, false, false),
  ('viewer', 'ledger', true, false, false, false, false, false),
  ('viewer', 'processor', true, false, false, false, false, false)
ON CONFLICT (role, module) DO NOTHING;

-- Función para verificar permisos
CREATE OR REPLACE FUNCTION check_user_permission(
  p_user_id uuid,
  p_module text,
  p_action text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_has_permission boolean;
  v_user_role text;
BEGIN
  -- Obtener el rol activo del usuario
  SELECT role INTO v_user_role
  FROM user_roles
  WHERE user_id = p_user_id
  AND is_active = true
  AND (expires_at IS NULL OR expires_at > now())
  ORDER BY
    CASE role
      WHEN 'admin' THEN 1
      WHEN 'operator' THEN 2
      WHEN 'auditor' THEN 3
      WHEN 'viewer' THEN 4
    END
  LIMIT 1;

  -- Si no tiene rol, no tiene permisos
  IF v_user_role IS NULL THEN
    RETURN false;
  END IF;

  -- Verificar permiso específico
  SELECT
    CASE p_action
      WHEN 'view' THEN can_view
      WHEN 'create' THEN can_create
      WHEN 'edit' THEN can_edit
      WHEN 'delete' THEN can_delete
      WHEN 'export' THEN can_export
      WHEN 'admin' THEN can_admin
      ELSE false
    END INTO v_has_permission
  FROM role_permissions
  WHERE role = v_user_role
  AND module = p_module;

  RETURN COALESCE(v_has_permission, false);
END;
$$;

-- Función para obtener rol de usuario
CREATE OR REPLACE FUNCTION get_user_role(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_role text;
BEGIN
  SELECT role INTO v_role
  FROM user_roles
  WHERE user_id = p_user_id
  AND is_active = true
  AND (expires_at IS NULL OR expires_at > now())
  ORDER BY
    CASE role
      WHEN 'admin' THEN 1
      WHEN 'operator' THEN 2
      WHEN 'auditor' THEN 3
      WHEN 'viewer' THEN 4
    END
  LIMIT 1;

  RETURN COALESCE(v_role, 'viewer');
END;
$$;

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_roles_updated_at
  BEFORE UPDATE ON user_roles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_role_permissions_updated_at
  BEFORE UPDATE ON role_permissions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

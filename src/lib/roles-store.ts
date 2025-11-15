/**
 * Roles & Permissions Store
 * Sistema de control de acceso basado en roles con RLS en Supabase
 */

import { getSupabaseClient } from './supabase-client';

const supabase = getSupabaseClient();

export type UserRole = 'admin' | 'operator' | 'auditor' | 'viewer';

export interface Permission {
  module: string;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canExport: boolean;
  canAdmin: boolean;
}

export interface UserRoleData {
  id: string;
  userId: string;
  role: UserRole;
  assignedBy: string;
  assignedAt: Date;
  expiresAt?: Date;
  isActive: boolean;
  metadata?: any;
}

const CACHE_KEY = 'user_role_cache';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

class RolesStore {
  private currentUserId: string | null = null;
  private roleCache: Map<string, { role: UserRole; timestamp: number }> = new Map();
  private permissionsCache: Map<string, Permission[]> = new Map();
  private listeners: Set<(role: UserRole | null) => void> = new Set();

  constructor() {
    this.initializeUser();
    this.loadCache();
  }

  private async initializeUser(): Promise<void> {
    if (!supabase) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      this.currentUserId = user?.id || null;

      if (this.currentUserId) {
        await this.getUserRole(this.currentUserId);
      }
    } catch (error) {
      console.error('[RolesStore] Error initializing user:', error);
    }
  }

  private loadCache(): void {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const data = JSON.parse(cached);
        Object.entries(data).forEach(([userId, cache]: [string, any]) => {
          this.roleCache.set(userId, cache);
        });
      }
    } catch (error) {
      console.error('[RolesStore] Error loading cache:', error);
    }
  }

  private saveCache(): void {
    try {
      const data: any = {};
      this.roleCache.forEach((cache, userId) => {
        data[userId] = cache;
      });
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('[RolesStore] Error saving cache:', error);
    }
  }

  /**
   * Get user's active role
   */
  async getUserRole(userId?: string): Promise<UserRole> {
    const targetUserId = userId || this.currentUserId;
    if (!targetUserId || !supabase) return 'viewer';

    // Check cache
    const cached = this.roleCache.get(targetUserId);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.role;
    }

    try {
      const { data, error } = await supabase.rpc('get_user_role', {
        p_user_id: targetUserId
      });

      if (error) throw error;

      const role = (data as UserRole) || 'viewer';

      // Update cache
      this.roleCache.set(targetUserId, {
        role,
        timestamp: Date.now()
      });
      this.saveCache();

      // Notify listeners
      if (targetUserId === this.currentUserId) {
        this.notifyListeners(role);
      }

      return role;
    } catch (error) {
      console.error('[RolesStore] Error getting user role:', error);
      return 'viewer';
    }
  }

  /**
   * Check if user has permission for action on module
   */
  async checkPermission(
    module: string,
    action: 'view' | 'create' | 'edit' | 'delete' | 'export' | 'admin'
  ): Promise<boolean> {
    if (!this.currentUserId || !supabase) return false;

    try {
      const { data, error } = await supabase.rpc('check_user_permission', {
        p_user_id: this.currentUserId,
        p_module: module,
        p_action: action
      });

      if (error) throw error;

      return data as boolean;
    } catch (error) {
      console.error('[RolesStore] Error checking permission:', error);
      return false;
    }
  }

  /**
   * Get all permissions for user's role
   */
  async getUserPermissions(): Promise<Permission[]> {
    if (!this.currentUserId) return [];

    const role = await this.getUserRole(this.currentUserId);

    // Check cache
    const cached = this.permissionsCache.get(role);
    if (cached) return cached;

    if (!supabase) return [];

    try {
      const { data, error } = await supabase
        .from('role_permissions')
        .select('*')
        .eq('role', role);

      if (error) throw error;

      const permissions: Permission[] = (data || []).map((p: any) => ({
        module: p.module,
        canView: p.can_view,
        canCreate: p.can_create,
        canEdit: p.can_edit,
        canDelete: p.can_delete,
        canExport: p.can_export,
        canAdmin: p.can_admin,
      }));

      // Cache permissions
      this.permissionsCache.set(role, permissions);

      return permissions;
    } catch (error) {
      console.error('[RolesStore] Error getting permissions:', error);
      return [];
    }
  }

  /**
   * Assign role to user (admin only)
   */
  async assignRole(
    userId: string,
    role: UserRole,
    expiresAt?: Date
  ): Promise<boolean> {
    if (!this.currentUserId || !supabase) return false;

    // Verify current user is admin
    const currentRole = await this.getUserRole(this.currentUserId);
    if (currentRole !== 'admin') {
      console.error('[RolesStore] Only admins can assign roles');
      return false;
    }

    try {
      const { error } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role,
          assigned_by: this.currentUserId,
          expires_at: expiresAt?.toISOString(),
          is_active: true
        });

      if (error) throw error;

      // Log audit
      await this.logAudit(userId, 'grant', role, {
        assigned_by: this.currentUserId,
        expires_at: expiresAt
      });

      // Clear cache
      this.roleCache.delete(userId);
      this.saveCache();

      console.log(`[RolesStore] Role ${role} assigned to user ${userId}`);
      return true;
    } catch (error) {
      console.error('[RolesStore] Error assigning role:', error);
      return false;
    }
  }

  /**
   * Revoke role from user (admin only)
   */
  async revokeRole(userId: string, role: UserRole): Promise<boolean> {
    if (!this.currentUserId || !supabase) return false;

    // Verify current user is admin
    const currentRole = await this.getUserRole(this.currentUserId);
    if (currentRole !== 'admin') {
      console.error('[RolesStore] Only admins can revoke roles');
      return false;
    }

    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ is_active: false })
        .eq('user_id', userId)
        .eq('role', role);

      if (error) throw error;

      // Log audit
      await this.logAudit(userId, 'revoke', role, {
        revoked_by: this.currentUserId
      });

      // Clear cache
      this.roleCache.delete(userId);
      this.saveCache();

      console.log(`[RolesStore] Role ${role} revoked from user ${userId}`);
      return true;
    } catch (error) {
      console.error('[RolesStore] Error revoking role:', error);
      return false;
    }
  }

  /**
   * Get all users with roles (admin only)
   */
  async getAllUserRoles(): Promise<UserRoleData[]> {
    if (!this.currentUserId || !supabase) return [];

    // Verify current user is admin
    const currentRole = await this.getUserRole(this.currentUserId);
    if (currentRole !== 'admin') {
      console.error('[RolesStore] Only admins can view all roles');
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .eq('is_active', true)
        .order('assigned_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((r: any) => ({
        id: r.id,
        userId: r.user_id,
        role: r.role,
        assignedBy: r.assigned_by,
        assignedAt: new Date(r.assigned_at),
        expiresAt: r.expires_at ? new Date(r.expires_at) : undefined,
        isActive: r.is_active,
        metadata: r.metadata
      }));
    } catch (error) {
      console.error('[RolesStore] Error getting all roles:', error);
      return [];
    }
  }

  /**
   * Log audit action
   */
  private async logAudit(
    userId: string,
    action: 'grant' | 'revoke' | 'modify' | 'view',
    role: UserRole,
    details: any
  ): Promise<void> {
    if (!supabase || !this.currentUserId) return;

    try {
      await supabase.from('audit_permissions').insert({
        user_id: userId,
        action,
        role,
        performed_by: this.currentUserId,
        details,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('[RolesStore] Error logging audit:', error);
    }
  }

  /**
   * Get audit logs (admin/auditor only)
   */
  async getAuditLogs(
    filters?: {
      userId?: string;
      action?: string;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<any[]> {
    if (!this.currentUserId || !supabase) return [];

    const currentRole = await this.getUserRole(this.currentUserId);
    if (currentRole !== 'admin' && currentRole !== 'auditor') {
      console.error('[RolesStore] Only admins/auditors can view audit logs');
      return [];
    }

    try {
      let query = supabase
        .from('audit_permissions')
        .select('*')
        .order('timestamp', { ascending: false });

      if (filters?.userId) {
        query = query.eq('user_id', filters.userId);
      }

      if (filters?.action) {
        query = query.eq('action', filters.action);
      }

      if (filters?.startDate) {
        query = query.gte('timestamp', filters.startDate.toISOString());
      }

      if (filters?.endDate) {
        query = query.lte('timestamp', filters.endDate.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('[RolesStore] Error getting audit logs:', error);
      return [];
    }
  }

  /**
   * Subscribe to role changes
   */
  subscribe(listener: (role: UserRole | null) => void): () => void {
    this.listeners.add(listener);

    // Immediately call with current role
    if (this.currentUserId) {
      this.getUserRole(this.currentUserId).then(listener);
    } else {
      listener(null);
    }

    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(role: UserRole | null): void {
    this.listeners.forEach(listener => {
      try {
        listener(role);
      } catch (error) {
        console.error('[RolesStore] Error in listener:', error);
      }
    });
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.roleCache.clear();
    this.permissionsCache.clear();
    localStorage.removeItem(CACHE_KEY);
    console.log('[RolesStore] Cache cleared');
  }

  /**
   * Check if user is admin
   */
  async isAdmin(): Promise<boolean> {
    if (!this.currentUserId) return false;
    const role = await this.getUserRole(this.currentUserId);
    return role === 'admin';
  }

  /**
   * Check if user has any role
   */
  async hasRole(role: UserRole): Promise<boolean> {
    if (!this.currentUserId) return false;
    const userRole = await this.getUserRole(this.currentUserId);
    return userRole === role;
  }
}

// Export singleton instance
export const rolesStore = new RolesStore();

// Helper function to get role display name
export function getRoleDisplayName(role: UserRole): string {
  const names: { [key in UserRole]: string } = {
    admin: 'Administrador',
    operator: 'Operador',
    auditor: 'Auditor',
    viewer: 'Visualizador'
  };
  return names[role];
}

// Helper function to get role color
export function getRoleColor(role: UserRole): string {
  const colors: { [key in UserRole]: string } = {
    admin: 'text-red-400 bg-red-900/30 border-red-700',
    operator: 'text-blue-400 bg-blue-900/30 border-blue-700',
    auditor: 'text-yellow-400 bg-yellow-900/30 border-yellow-700',
    viewer: 'text-gray-400 bg-gray-900/30 border-gray-700'
  };
  return colors[role];
}

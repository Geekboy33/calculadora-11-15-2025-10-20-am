/**
 * Notifications Store - Sistema de Notificaciones en Tiempo Real
 * Integrado con Supabase Realtime para notificaciones push
 */

import { getSupabaseClient } from './supabase-client';

const supabase = getSupabaseClient();

export type NotificationType = 'success' | 'warning' | 'error' | 'info';
export type NotificationPriority = 'low' | 'medium' | 'high' | 'critical';

export interface Notification {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
  metadata?: any;
  expiresAt?: Date;
}

interface NotificationsStoreData {
  notifications: Notification[];
  unreadCount: number;
}

const STORAGE_KEY = 'Digital Commercial Bank Ltd_notifications';
const MAX_NOTIFICATIONS = 100;

class NotificationsStore {
  private listeners: Set<(notifications: Notification[]) => void> = new Set();
  private unreadListeners: Set<(count: number) => void> = new Set();
  private realtimeChannel: any = null;

  constructor() {
    this.loadNotifications();
    this.setupRealtimeSubscription();
    this.cleanupExpiredNotifications();
  }

  /**
   * Setup Supabase Realtime subscription for push notifications
   */
  private setupRealtimeSubscription(): void {
    if (!supabase) return;

    try {
      this.realtimeChannel = supabase
        .channel('notifications')
        .on('broadcast', { event: 'notification' }, (payload) => {
          const notification = payload.payload as Notification;
          this.addNotification(notification);
        })
        .subscribe();

      console.log('[NotificationsStore] Realtime subscription active');
    } catch (error) {
      console.error('[NotificationsStore] Error setting up realtime:', error);
    }
  }

  /**
   * Broadcast notification to all connected clients
   */
  async broadcastNotification(notification: Omit<Notification, 'id' | 'timestamp' | 'read'>): Promise<void> {
    if (!supabase || !this.realtimeChannel) return;

    const fullNotification: Notification = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      read: false,
      ...notification,
    };

    try {
      await this.realtimeChannel.send({
        type: 'broadcast',
        event: 'notification',
        payload: fullNotification,
      });

      console.log('[NotificationsStore] Broadcasted notification:', fullNotification.title);
    } catch (error) {
      console.error('[NotificationsStore] Error broadcasting:', error);
    }
  }

  /**
   * Add notification locally
   */
  addNotification(notification: Notification): void {
    const notifications = this.getNotifications();

    notifications.unshift(notification);

    // Keep only last MAX_NOTIFICATIONS
    const trimmed = notifications.slice(0, MAX_NOTIFICATIONS);

    this.saveNotifications(trimmed);
    this.notifyListeners(trimmed);

    // Show toast for high priority
    if (notification.priority === 'high' || notification.priority === 'critical') {
      this.showToast(notification);
    }
  }

  /**
   * Create and add notification
   */
  notify(
    type: NotificationType,
    title: string,
    message: string,
    options?: {
      priority?: NotificationPriority;
      actionUrl?: string;
      metadata?: any;
      expiresInMinutes?: number;
    }
  ): void {
    const notification: Notification = {
      id: crypto.randomUUID(),
      type,
      priority: options?.priority || 'medium',
      title,
      message,
      timestamp: new Date(),
      read: false,
      actionUrl: options?.actionUrl,
      metadata: options?.metadata,
      expiresAt: options?.expiresInMinutes
        ? new Date(Date.now() + options.expiresInMinutes * 60000)
        : undefined,
    };

    this.addNotification(notification);
  }

  /**
   * Convenience methods
   */
  success(title: string, message: string, options?: any): void {
    this.notify('success', title, message, options);
  }

  error(title: string, message: string, options?: any): void {
    this.notify('error', title, message, { ...options, priority: 'high' });
  }

  warning(title: string, message: string, options?: any): void {
    this.notify('warning', title, message, options);
  }

  info(title: string, message: string, options?: any): void {
    this.notify('info', title, message, options);
  }

  /**
   * Mark notification as read
   */
  markAsRead(notificationId: string): void {
    const notifications = this.getNotifications();
    const notification = notifications.find(n => n.id === notificationId);

    if (notification && !notification.read) {
      notification.read = true;
      this.saveNotifications(notifications);
      this.notifyListeners(notifications);
    }
  }

  /**
   * Mark all as read
   */
  markAllAsRead(): void {
    const notifications = this.getNotifications();
    notifications.forEach(n => n.read = true);
    this.saveNotifications(notifications);
    this.notifyListeners(notifications);
  }

  /**
   * Delete notification
   */
  deleteNotification(notificationId: string): void {
    const notifications = this.getNotifications();
    const filtered = notifications.filter(n => n.id !== notificationId);
    this.saveNotifications(filtered);
    this.notifyListeners(filtered);
  }

  /**
   * Clear all notifications
   */
  clearAll(): void {
    this.saveNotifications([]);
    this.notifyListeners([]);
  }

  /**
   * Get all notifications
   */
  getNotifications(): Notification[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return [];

      const data: NotificationsStoreData = JSON.parse(stored);

      // Parse dates
      return data.notifications.map(n => ({
        ...n,
        timestamp: new Date(n.timestamp),
        expiresAt: n.expiresAt ? new Date(n.expiresAt) : undefined,
      }));
    } catch (error) {
      console.error('[NotificationsStore] Error loading notifications:', error);
      return [];
    }
  }

  /**
   * Get unread count
   */
  getUnreadCount(): number {
    return this.getNotifications().filter(n => !n.read).length;
  }

  /**
   * Get notifications by type
   */
  getByType(type: NotificationType): Notification[] {
    return this.getNotifications().filter(n => n.type === type);
  }

  /**
   * Get notifications by priority
   */
  getByPriority(priority: NotificationPriority): Notification[] {
    return this.getNotifications().filter(n => n.priority === priority);
  }

  /**
   * Save notifications to localStorage
   */
  private saveNotifications(notifications: Notification[]): void {
    try {
      const data: NotificationsStoreData = {
        notifications,
        unreadCount: notifications.filter(n => !n.read).length,
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

      // Notify unread listeners
      this.notifyUnreadListeners(data.unreadCount);
    } catch (error) {
      console.error('[NotificationsStore] Error saving notifications:', error);
    }
  }

  /**
   * Load notifications from localStorage
   */
  private loadNotifications(): void {
    const notifications = this.getNotifications();
    if (notifications.length > 0) {
      console.log(`[NotificationsStore] Loaded ${notifications.length} notifications`);
    }
  }

  /**
   * Clean up expired notifications
   */
  private cleanupExpiredNotifications(): void {
    const notifications = this.getNotifications();
    const now = new Date();

    const valid = notifications.filter(n => {
      if (!n.expiresAt) return true;
      return n.expiresAt > now;
    });

    if (valid.length < notifications.length) {
      this.saveNotifications(valid);
      console.log(`[NotificationsStore] Cleaned up ${notifications.length - valid.length} expired notifications`);
    }

    // Schedule next cleanup
    setTimeout(() => this.cleanupExpiredNotifications(), 60000); // Every minute
  }

  /**
   * Subscribe to notifications changes
   */
  subscribe(listener: (notifications: Notification[]) => void): () => void {
    this.listeners.add(listener);
    listener(this.getNotifications());

    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Subscribe to unread count changes
   */
  subscribeToUnreadCount(listener: (count: number) => void): () => void {
    this.unreadListeners.add(listener);
    listener(this.getUnreadCount());

    return () => {
      this.unreadListeners.delete(listener);
    };
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(notifications: Notification[]): void {
    this.listeners.forEach(listener => {
      try {
        listener(notifications);
      } catch (error) {
        console.error('[NotificationsStore] Error in listener:', error);
      }
    });
  }

  /**
   * Notify unread count listeners
   */
  private notifyUnreadListeners(count: number): void {
    this.unreadListeners.forEach(listener => {
      try {
        listener(count);
      } catch (error) {
        console.error('[NotificationsStore] Error in unread listener:', error);
      }
    });
  }

  /**
   * Show toast notification
   */
  private showToast(notification: Notification): void {
    // Dispatch custom event for toast component
    window.dispatchEvent(new CustomEvent('show-toast', {
      detail: notification
    }));
  }

  /**
   * Cleanup on destroy
   */
  destroy(): void {
    if (this.realtimeChannel) {
      supabase?.removeChannel(this.realtimeChannel);
      console.log('[NotificationsStore] Realtime subscription closed');
    }
  }
}

// Export singleton instance
export const notificationsStore = new NotificationsStore();

// Helper to format notification time
export function formatNotificationTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Ahora';
  if (minutes < 60) return `Hace ${minutes}m`;
  if (hours < 24) return `Hace ${hours}h`;
  if (days < 7) return `Hace ${days}d`;

  return date.toLocaleDateString();
}

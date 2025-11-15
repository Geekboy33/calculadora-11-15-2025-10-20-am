import { useState, useEffect } from 'react';
import { Bell, X, Check, CheckCheck, Trash2, AlertTriangle, Info, CheckCircle, XCircle } from 'lucide-react';
import { notificationsStore, Notification, formatNotificationTime } from '../lib/notifications-store';

export function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const unsubscribe = notificationsStore.subscribe(setNotifications);
    const unsubscribeUnread = notificationsStore.subscribeToUnreadCount(setUnreadCount);

    return () => {
      unsubscribe();
      unsubscribeUnread();
    };
  }, []);

  const handleMarkAsRead = (id: string) => {
    notificationsStore.markAsRead(id);
  };

  const handleMarkAllAsRead = () => {
    notificationsStore.markAllAsRead();
  };

  const handleDelete = (id: string) => {
    notificationsStore.deleteNotification(id);
  };

  const handleClearAll = () => {
    if (confirm('¿Borrar todas las notificaciones?')) {
      notificationsStore.clearAll();
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'info':
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getBackgroundColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-green-900/20 border-green-700/50';
      case 'error':
        return 'bg-red-900/20 border-red-700/50';
      case 'warning':
        return 'bg-yellow-900/20 border-yellow-700/50';
      case 'info':
      default:
        return 'bg-blue-900/20 border-blue-700/50';
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 hover:bg-[#1a1a1a] rounded-lg transition-colors"
        title="Notificaciones"
      >
        <Bell className="w-5 h-5 text-[#00ff88]" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          <div className="absolute right-0 mt-2 w-96 max-h-[600px] bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg shadow-2xl z-50 flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-[#1a1a1a]">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-[#00ff88]" />
                <h3 className="text-lg font-bold text-[#e0ffe0]">Notificaciones</h3>
                {unreadCount > 0 && (
                  <span className="bg-[#00ff88] text-black text-xs font-bold px-2 py-0.5 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </div>

              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-[#1a1a1a] rounded transition-colors"
              >
                <X className="w-5 h-5 text-[#4d7c4d]" />
              </button>
            </div>

            {notifications.length > 0 && (
              <div className="flex items-center gap-2 p-3 border-b border-[#1a1a1a] bg-[#0d0d0d]">
                <button
                  onClick={handleMarkAllAsRead}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs bg-[#1a1a1a] hover:bg-[#252525] text-[#00ff88] rounded transition-colors"
                  disabled={unreadCount === 0}
                >
                  <CheckCheck className="w-4 h-4" />
                  Marcar todas
                </button>

                <button
                  onClick={handleClearAll}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs bg-[#1a1a1a] hover:bg-red-900/20 text-red-400 rounded transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Limpiar todo
                </button>
              </div>
            )}

            <div className="flex-1 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Bell className="w-12 h-12 text-[#1a1a1a] mb-3" />
                  <p className="text-[#4d7c4d] font-medium">No hay notificaciones</p>
                  <p className="text-[#4d7c4d] text-sm mt-1">
                    Las notificaciones aparecerán aquí
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-[#1a1a1a]">
                  {notifications.map(notification => (
                    <div
                      key={notification.id}
                      className={`p-4 hover:bg-[#0d0d0d] transition-colors ${
                        !notification.read ? 'bg-[#0d0d0d]' : ''
                      }`}
                    >
                      <div className="flex gap-3">
                        <div className="flex-shrink-0 mt-1">
                          {getIcon(notification.type)}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-semibold text-[#e0ffe0] truncate">
                                {notification.title}
                              </h4>
                              <p className="text-xs text-[#80ff80] mt-1 line-clamp-2">
                                {notification.message}
                              </p>
                            </div>

                            <button
                              onClick={() => handleDelete(notification.id)}
                              className="flex-shrink-0 p-1 hover:bg-[#1a1a1a] rounded transition-colors"
                            >
                              <X className="w-4 h-4 text-[#4d7c4d]" />
                            </button>
                          </div>

                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-[#4d7c4d]">
                              {formatNotificationTime(notification.timestamp)}
                            </span>

                            {!notification.read && (
                              <button
                                onClick={() => handleMarkAsRead(notification.id)}
                                className="flex items-center gap-1 px-2 py-1 text-xs bg-[#00ff88]/10 hover:bg-[#00ff88]/20 text-[#00ff88] rounded transition-colors"
                              >
                                <Check className="w-3 h-3" />
                                Marcar leída
                              </button>
                            )}
                          </div>

                          {notification.priority === 'high' || notification.priority === 'critical' ? (
                            <div className="mt-2">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold rounded ${
                                notification.priority === 'critical'
                                  ? 'bg-red-900/30 text-red-400'
                                  : 'bg-yellow-900/30 text-yellow-400'
                              }`}>
                                <AlertTriangle className="w-3 h-3" />
                                {notification.priority === 'critical' ? 'CRÍTICO' : 'ALTA PRIORIDAD'}
                              </span>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

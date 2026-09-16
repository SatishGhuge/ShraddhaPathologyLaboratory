'use client';

import React, { useContext } from 'react';
import { NotificationContext, NotificationType } from '@/src/context/NotificationContext';
import { CheckCircle, AlertCircle, Info, X, AlertTriangle } from 'lucide-react';

const getNotificationStyles = (type: NotificationType) => {
  switch (type) {
    case 'success':
      return {
        container: 'bg-green-100 border border-green-300',
        titleText: 'text-green-800 font-semibold',
        messageText: 'text-green-700',
        icon: <CheckCircle size={32} className="text-green-600 flex-shrink-0" />,
      };
    case 'error':
      return {
        container: 'bg-red-100 border border-red-300',
        titleText: 'text-red-800 font-semibold',
        messageText: 'text-red-700',
        icon: <AlertCircle size={32} className="text-red-600 flex-shrink-0" />,
      };
    case 'warning':
      return {
        container: 'bg-yellow-100 border border-yellow-300',
        titleText: 'text-yellow-800 font-semibold',
        messageText: 'text-yellow-700',
        icon: <AlertTriangle size={32} className="text-yellow-600 flex-shrink-0" />,
      };
    case 'info':
    default:
      return {
        container: 'bg-cyan-100 border border-cyan-300',
        titleText: 'text-cyan-800 font-semibold',
        messageText: 'text-cyan-700',
        icon: <Info size={32} className="text-cyan-600 flex-shrink-0" />,
      };
  }
};

export default function NotificationDisplay() {
  const context = useContext(NotificationContext);

  if (!context) {
    console.warn('NotificationDisplay must be used within NotificationProvider');
    return null;
  }

  const { notifications, removeNotification } = context;

  if (notifications.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none">
      <div className="flex flex-col gap-4 max-w-md w-full mx-4 pointer-events-auto">
        {notifications.map((notification) => {
          const styles = getNotificationStyles(notification.type);
          const title = notification.type.charAt(0).toUpperCase() + notification.type.slice(1);

          return (
            <div
              key={notification.id}
              className={`${styles.container} rounded-lg px-6 py-4 flex items-start gap-4 shadow-lg animate-in fade-in zoom-in duration-300`}
              role="alert"
            >
              {/* Icon */}
              <div className="flex-shrink-0 mt-0.5">
                {styles.icon}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <h3 className={`${styles.titleText} text-base mb-1`}>{title}</h3>
                <p className={`${styles.messageText} text-sm leading-relaxed break-words`}>
                  {notification.message}
                </p>
              </div>

              {/* Close Button */}
              <button
                onClick={() => removeNotification(notification.id)}
                className="flex-shrink-0 p-1 hover:opacity-70 transition-opacity mt-0.5"
                aria-label="Close notification"
              >
                <X size={20} className="text-current" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

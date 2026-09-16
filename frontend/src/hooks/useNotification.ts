import { useContext } from 'react';
import { NotificationContext, NotificationType } from '@/src/context/NotificationContext';

/**
 * Custom hook to use notifications throughout the app
 * 
 * Usage:
 * const { success, error, warning, info } = useNotification();
 * 
 * success('Operation completed successfully');
 * error('An error occurred');
 * warning('Please be careful');
 * info('Here is some information');
 */
export function useNotification() {
  const context = useContext(NotificationContext);

  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider');
  }

  const { showNotification, removeNotification, clearAll } = context;

  return {
    /**
     * Show a success notification
     * @param message - The message to display
     * @param duration - How long to show (ms), default 5000 (5 seconds). Set to 0 for manual close
     */
    success: (message: string, duration?: number) =>
      showNotification(message, 'success', duration),

    /**
     * Show an error notification
     * @param message - The message to display
     * @param duration - How long to show (ms), default 5000 (5 seconds). Set to 0 for manual close
     */
    error: (message: string, duration?: number) =>
      showNotification(message, 'error', duration),

    /**
     * Show a warning notification
     * @param message - The message to display
     * @param duration - How long to show (ms), default 5000 (5 seconds). Set to 0 for manual close
     */
    warning: (message: string, duration?: number) =>
      showNotification(message, 'warning', duration),

    /**
     * Show an info notification
     * @param message - The message to display
     * @param duration - How long to show (ms), default 5000 (5 seconds). Set to 0 for manual close
     */
    info: (message: string, duration?: number) =>
      showNotification(message, 'info', duration),

    /**
     * Remove a notification by ID
     */
    remove: removeNotification,

    /**
     * Clear all notifications
     */
    clearAll,
  };
}

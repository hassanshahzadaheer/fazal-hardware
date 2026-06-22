import { useEffect, useRef } from 'react';
import { useAuthStore } from '../stores/authStore';

export function useIdleTimer(timeoutMinutes: number = 30) {
  const { user, logout } = useAuthStore();
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const resetTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    if (!user) return;

    const ms = timeoutMinutes * 60 * 1000;
    timerRef.current = setTimeout(() => {
      console.log(`Idle timeout of ${timeoutMinutes} minutes reached. Logging out.`);
      logout();
    }, ms);
  };

  useEffect(() => {
    if (!user) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      return;
    }

    // Set up event listeners
    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    
    // Initial set
    resetTimer();

    const handler = () => resetTimer();

    events.forEach(event => {
      window.addEventListener(event, handler);
    });

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      events.forEach(event => {
        window.removeEventListener(event, handler);
      });
    };
  }, [user, timeoutMinutes]);
}

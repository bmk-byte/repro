import hotToast from 'react-hot-toast';
import { getToastsEnabled } from './toastPreference';

/**
 * Thin wrapper around react-hot-toast that respects the user's "show pop-up
 * notifications" preference (Settings → Notifications). `dismiss` always
 * passes through since it only ever removes something already on screen —
 * every method that would show a new toast is gated.
 */
export const toast: typeof hotToast = new Proxy(hotToast, {
  apply(target, thisArg, args) {
    if (!getToastsEnabled()) return '';
    return Reflect.apply(target, thisArg, args);
  },
  get(target, prop, receiver) {
    if (prop === 'dismiss' || prop === 'remove') {
      return Reflect.get(target, prop, receiver);
    }
    const value = Reflect.get(target, prop, receiver);
    if (typeof value !== 'function') return value;
    return (...args: unknown[]) => {
      if (!getToastsEnabled()) return '';
      return value.apply(target, args);
    };
  },
});

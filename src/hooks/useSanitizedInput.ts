import { useState, useCallback } from 'react';
import { sanitizeText, sanitizeEmail, sanitizePhone, sanitizeURL } from '../lib/sanitize';

type SanitizerType = 'text' | 'email' | 'phone' | 'url';

/**
 * Hook for managing sanitized input state
 * Automatically sanitizes input based on the specified type
 */
export function useSanitizedInput(
  initialValue: string = '',
  type: SanitizerType = 'text'
) {
  const [value, setValue] = useState(initialValue);
  const [rawValue, setRawValue] = useState(initialValue);

  const sanitize = useCallback((input: string): string => {
    switch (type) {
      case 'email':
        return sanitizeEmail(input);
      case 'phone':
        return sanitizePhone(input);
      case 'url':
        return sanitizeURL(input);
      case 'text':
      default:
        return sanitizeText(input);
    }
  }, [type]);

  const handleChange = useCallback((
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const newValue = e.target.value;
    setRawValue(newValue);
    setValue(sanitize(newValue));
  }, [sanitize]);

  const reset = useCallback(() => {
    setValue(initialValue);
    setRawValue(initialValue);
  }, [initialValue]);

  return {
    value,
    rawValue,
    onChange: handleChange,
    reset,
    setValue: (newValue: string) => {
      setRawValue(newValue);
      setValue(sanitize(newValue));
    }
  };
}

/**
 * Hook for managing sanitized array input (like tags)
 */
export function useSanitizedArray(initialValue: string[] = []) {
  const [items, setItems] = useState<string[]>(initialValue);

  const addItem = useCallback((item: string) => {
    const sanitized = sanitizeText(item);
    if (sanitized && !items.includes(sanitized)) {
      setItems(prev => [...prev, sanitized]);
    }
  }, [items]);

  const removeItem = useCallback((index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  }, []);

  const reset = useCallback(() => {
    setItems(initialValue);
  }, [initialValue]);

  return {
    items,
    addItem,
    removeItem,
    reset,
    setItems
  };
}

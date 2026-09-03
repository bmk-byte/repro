/**
 * Input Sanitization Utilities
 * Provides functions to sanitize user inputs and prevent XSS attacks
 */

/**
 * Sanitize HTML by escaping special characters
 * Prevents XSS attacks by converting HTML special characters to entities
 */
export function sanitizeHTML(input: string): string {
  if (!input) return '';

  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };

  return input.replace(/[&<>"'/]/g, (char) => map[char]);
}

/**
 * Sanitize text input by trimming and removing control characters
 */
export function sanitizeText(input: string): string {
  if (!input) return '';

  return input
    .trim()
    // eslint-disable-next-line no-control-regex -- intentional: stripping control characters is the point of this function
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control characters
    .replace(/\s+/g, ' '); // Normalize whitespace
}

/**
 * Sanitize filename by removing dangerous characters
 */
export function sanitizeFilename(filename: string): string {
  if (!filename) return '';

  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_') // Only allow alphanumeric, dots, hyphens, underscores
    .replace(/\.{2,}/g, '.') // Prevent directory traversal
    .replace(/^\.+/, '') // Remove leading dots
    .slice(0, 255); // Limit length
}

/**
 * Sanitize URL to prevent javascript: and data: URIs
 */
export function sanitizeURL(url: string): string {
  if (!url) return '';

  const trimmed = url.trim();
  const lower = trimmed.toLowerCase();

  // Block dangerous protocols
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('data:') ||
    lower.startsWith('vbscript:') ||
    lower.startsWith('file:')
  ) {
    return '';
  }

  // Only allow http, https, and relative URLs
  if (
    lower.startsWith('http://') ||
    lower.startsWith('https://') ||
    lower.startsWith('/') ||
    lower.startsWith('./')
  ) {
    return trimmed;
  }

  // If no protocol, assume https
  if (!lower.includes('://')) {
    return trimmed;
  }

  return '';
}

/**
 * Sanitize email address
 */
export function sanitizeEmail(email: string): string {
  if (!email) return '';

  const sanitized = email.trim().toLowerCase();

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(sanitized)) {
    return '';
  }

  return sanitized;
}

/**
 * Sanitize search term for LIKE queries
 * Escapes special SQL LIKE characters
 */
export function sanitizeSearchTerm(term: string): string {
  if (!term) return '';

  return term
    .trim()
    .replace(/[%_\\]/g, '\\$&'); // Escape LIKE wildcards
}

/**
 * Sanitize a search term for use inside a PostgREST `.or()` filter string
 * (e.g. `col.ilike.%term%,col2.ilike.%term%`). `.or()` parses its argument
 * as a filter-expression DSL, so beyond LIKE-wildcard escaping, characters
 * that have meaning in that DSL (`,` separates conditions, `(` `)` group
 * them) must be stripped — not just escaped — since PostgREST does not
 * support escaping them within a value.
 */
export function sanitizeOrFilterTerm(term: string): string {
  if (!term) return '';

  return sanitizeSearchTerm(term).replace(/[,()]/g, '');
}

/**
 * Sanitize array of strings
 */
export function sanitizeArray(items: string[]): string[] {
  if (!Array.isArray(items)) return [];

  return items
    .filter(item => typeof item === 'string' && item.trim().length > 0)
    .map(item => sanitizeText(item));
}

/**
 * Validate and sanitize phone number
 */
export function sanitizePhone(phone: string): string {
  if (!phone) return '';

  // Remove all non-digit and non-plus characters
  return phone.replace(/[^\d+\s()-]/g, '').trim();
}

/**
 * Sanitize object keys and values
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  if (!obj || typeof obj !== 'object') return obj;

  const sanitized = {} as T;

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key as keyof T] = sanitizeText(value) as any;
    } else if (Array.isArray(value)) {
      sanitized[key as keyof T] = sanitizeArray(value) as any;
    } else {
      sanitized[key as keyof T] = value;
    }
  }

  return sanitized;
}

/**
 * Validate file type by extension and MIME type
 */
export function validateFileType(
  file: File,
  allowedExtensions: string[],
  allowedMimeTypes: string[]
): boolean {
  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  const mimeType = file.type.toLowerCase();

  return (
    allowedExtensions.includes(extension) &&
    allowedMimeTypes.includes(mimeType)
  );
}

/**
 * Extract a safe file extension for building generated storage keys
 * (`${Date.now()}-${Math.random()}.${ext}`). Client-side dropzone `accept`
 * filters normally guarantee a known extension, but a forged `File` object
 * (e.g. via devtools) could carry a `name` containing `/`, `..`, or other
 * path-breaking characters — this rejects anything that isn't a short
 * alphanumeric extension rather than trusting `name.split('.').pop()`
 * directly in a storage path.
 */
export function safeFileExtension(filename: string, fallback = 'bin'): string {
  const ext = (filename.split('.').pop() || '').toLowerCase();
  return /^[a-z0-9]{1,10}$/.test(ext) ? ext : fallback;
}

/**
 * Sanitize file size (in bytes)
 */
export function validateFileSize(file: File, maxSizeInMB: number): boolean {
  const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
  return file.size <= maxSizeInBytes;
}

/**
 * Create safe display name from filename
 */
export function createSafeDisplayName(filename: string, maxLength: number = 50): string {
  const sanitized = sanitizeFilename(filename);

  if (sanitized.length <= maxLength) {
    return sanitized;
  }

  const extension = sanitized.split('.').pop() || '';
  const nameWithoutExt = sanitized.slice(0, sanitized.length - extension.length - 1);
  const truncatedName = nameWithoutExt.slice(0, maxLength - extension.length - 4);

  return `${truncatedName}...${extension}`;
}

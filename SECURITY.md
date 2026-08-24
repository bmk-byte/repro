# Security Guidelines

## Input Sanitization

This application implements comprehensive input sanitization to prevent XSS attacks, SQL injection, and other security vulnerabilities.

### Sanitization Library

The `/src/lib/sanitize.ts` module provides utilities for sanitizing different types of user input:

#### Text Sanitization

```typescript
import { sanitizeText } from '../lib/sanitize';

const cleanText = sanitizeText(userInput);
```

- Trims whitespace
- Removes control characters
- Normalizes whitespace

#### HTML Sanitization

```typescript
import { sanitizeHTML } from '../lib/sanitize';

const safeHTML = sanitizeHTML(userInput);
```

- Escapes `&`, `<`, `>`, `"`, `'`, `/`
- Prevents XSS attacks

#### URL Sanitization

```typescript
import { sanitizeURL } from '../lib/sanitize';

const safeURL = sanitizeURL(url);
```

- Blocks `javascript:`, `data:`, `vbscript:`, `file:` protocols
- Only allows `http://`, `https://`, and relative URLs

#### Filename Sanitization

```typescript
import { sanitizeFilename, createSafeDisplayName } from '../lib/sanitize';

const safeFilename = sanitizeFilename(file.name);
const displayName = createSafeDisplayName(file.name, 50);
```

- Removes dangerous characters
- Prevents directory traversal attacks
- Limits filename length

#### Search Term Sanitization

```typescript
import { sanitizeSearchTerm } from '../lib/sanitize';

const safeTerm = sanitizeSearchTerm(searchInput);
```

- Escapes SQL LIKE wildcards (`%`, `_`, `\`)
- Prevents LIKE injection attacks

#### Email Sanitization

```typescript
import { sanitizeEmail } from '../lib/sanitize';

const safeEmail = sanitizeEmail(emailInput);
```

- Validates email format
- Converts to lowercase
- Trims whitespace

#### Phone Sanitization

```typescript
import { sanitizePhone } from '../lib/sanitize';

const safePhone = sanitizePhone(phoneInput);
```

- Removes non-digit characters (except `+`, `-`, `()`)
- Preserves formatting characters

#### Array Sanitization

```typescript
import { sanitizeArray } from '../lib/sanitize';

const safeTags = sanitizeArray(userTags);
```

- Filters out non-string values
- Trims and sanitizes each item

### React Hooks

Use the `useSanitizedInput` hook for automatic input sanitization:

```typescript
import { useSanitizedInput } from '../hooks/useSanitizedInput';

function MyComponent() {
  const email = useSanitizedInput('', 'email');
  const name = useSanitizedInput('', 'text');

  return (
    <>
      <input
        type="email"
        value={email.value}
        onChange={email.onChange}
      />
      <input
        type="text"
        value={name.value}
        onChange={name.onChange}
      />
    </>
  );
}
```

For array inputs like tags:

```typescript
import { useSanitizedArray } from '../hooks/useSanitizedInput';

function TagInput() {
  const { items, addItem, removeItem } = useSanitizedArray([]);

  return (
    <>
      {items.map((tag, i) => (
        <span key={i} onClick={() => removeItem(i)}>
          {tag}
        </span>
      ))}
      <button onClick={() => addItem(newTag)}>Add Tag</button>
    </>
  );
}
```

## Database Security

### Parameterized Queries

All database queries use Supabase's parameterized query API, which prevents SQL injection:

```typescript
// SAFE - Using parameterized queries
const { data } = await supabase
  .from('cases')
  .select('*')
  .eq('status', userInput);

// SAFE - Using sanitized search terms
const sanitized = sanitizeSearchTerm(searchTerm);
const { data } = await supabase
  .from('cases')
  .select('*')
  .ilike('case_filed', `%${sanitized}%`);
```

### Row Level Security (RLS)

All tables have RLS enabled with policies that:

- Check authentication via `auth.uid()`
- Verify ownership or organization membership
- Restrict access to authorized users only

See migration files for detailed RLS policies.

## File Upload Security

### File Validation

```typescript
import { validateFileType, validateFileSize } from '../lib/sanitize';

const isValid = validateFileType(
  file,
  ['pdf', 'doc', 'docx'],
  ['application/pdf', 'application/msword']
);

const isSizeValid = validateFileSize(file, 10); // 10MB max
```

### Filename Security

All uploaded files are:

1. Validated for type and size
2. Renamed with random timestamps to prevent collisions
3. Sanitized for display using `createSafeDisplayName()`

```typescript
const fileExt = file.name.split('.').pop();
const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
```

## Components with Sanitization

The following components have been updated with input sanitization:

### Forms

- `SubmitCaseForm.tsx` - All text inputs sanitized
- `SubmitJudgmentForm.tsx` - All text inputs sanitized
- `EditCaseModal.tsx` - Update inputs sanitized
- `ProfileSettingsForm.tsx` - Avatar URL sanitized
- `UploadLawModal.tsx` - Title, description, and filename sanitized
- `UploadResourceModal.tsx` - Title, description, tags, and filename sanitized

### Search & Filters

- `CasesPage.tsx` - Search terms escaped for LIKE queries
- `CasesTable.tsx` - Search terms escaped for LIKE queries
- `JudgmentsPage.tsx` - Search terms escaped for LIKE queries
- `ResourcesPage.tsx` - Client-side filtering with sanitization

### Display Components

All display components rely on React's built-in XSS protection through automatic HTML escaping in JSX. User-provided content is never rendered with `dangerouslySetInnerHTML`.

## Best Practices

### DO

- Always sanitize user input before storing or displaying
- Use parameterized queries for all database operations
- Validate file types and sizes before upload
- Sanitize URLs before using in `src`, `href`, or other attributes
- Escape search terms when using LIKE queries
- Use the provided sanitization utilities consistently

### DON'T

- Never use `dangerouslySetInnerHTML` with user content
- Never concatenate user input directly into SQL queries
- Never trust user-provided URLs without validation
- Never skip sanitization on "trusted" inputs
- Never use `eval()` or similar functions with user data

## Testing Sanitization

To verify sanitization is working:

1. Try entering special characters: `<script>alert('xss')</script>`
2. Test SQL characters in search: `'; DROP TABLE users; --`
3. Test LIKE wildcards in search: `%`, `_`, `\`
4. Test malicious URLs: `javascript:alert('xss')`
5. Test directory traversal in filenames: `../../etc/passwd`

All of these should be properly escaped or rejected.

## Reporting Security Issues

If you discover a security vulnerability, please email security@afyanahaki.org instead of using the issue tracker.

import { supabase } from './supabase';
import { reportError } from './errorReporting';

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

const SEND_EMAIL_TIMEOUT_MS = 15_000;

export class SendEmailTimeoutError extends Error {
  constructor() {
    super('send-email request timed out');
    this.name = 'SendEmailTimeoutError';
  }
}

/**
 * Sending an email is not safe to retry automatically — a timeout doesn't
 * tell us whether the message was already dispatched, so a blind retry
 * risks a duplicate notification landing in someone's inbox. This only
 * adds a timeout (with reporting) so a hung request fails within a bounded
 * time instead of leaving the caller waiting indefinitely; the caller
 * decides whether to surface a retry option to the user.
 */
export async function sendEmail({ to, subject, html }: SendEmailOptions) {
  const invokePromise = supabase.functions.invoke('send-email', {
    body: { to, subject, html },
  });

  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new SendEmailTimeoutError()), SEND_EMAIL_TIMEOUT_MS);
  });

  const { data, error } = await Promise.race([invokePromise, timeoutPromise]).catch(err => {
    if (err instanceof SendEmailTimeoutError) {
      reportError(err, { context: 'sendEmail', category: 'RELIABILITY' });
      throw err;
    }
    throw err;
  });

  if (error) {
    reportError(error, { context: 'sendEmail.invoke', category: 'RELIABILITY' });
    throw error;
  }
  return data;
}

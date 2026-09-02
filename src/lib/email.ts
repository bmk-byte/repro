import { supabase } from './supabase';

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailOptions) {
  const { data, error } = await supabase.functions.invoke('send-email', {
    body: { to, subject, html },
  });

  if (error) throw error;
  return data;
}

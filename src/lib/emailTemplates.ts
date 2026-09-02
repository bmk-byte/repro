interface RenderEmailOptions {
  heading: string;
  body: string;
  ctaLabel?: string;
  ctaUrl?: string;
}

/**
 * Minimal branded HTML wrapper (maroon header bar matching tailwind.config.js's
 * `primary` token) so every notification email looks consistent without each
 * call site hand-rolling its own markup.
 */
export function renderEmail({ heading, body, ctaLabel, ctaUrl }: RenderEmailOptions): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
      <div style="background: #9C1D20; padding: 20px 24px; border-radius: 8px 8px 0 0;">
        <span style="color: #fff; font-size: 18px; font-weight: 600;">ReproPulse</span>
      </div>
      <div style="border: 1px solid #E7E3DB; border-top: none; border-radius: 0 0 8px 8px; padding: 24px;">
        <h1 style="margin: 0 0 12px; font-size: 18px; color: #25211A;">${heading}</h1>
        <p style="margin: 0 0 20px; font-size: 14px; line-height: 1.6; color: #524A3C; white-space: pre-line;">${body}</p>
        ${
          ctaLabel && ctaUrl
            ? `<a href="${ctaUrl}" style="display: inline-block; background: #9C1D20; color: #fff; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-size: 14px; font-weight: 600;">${ctaLabel}</a>`
            : ''
        }
      </div>
    </div>
  `;
}

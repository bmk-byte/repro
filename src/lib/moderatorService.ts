const devLog = (...args: unknown[]) => {
  if (import.meta.env.DEV) console.log(...args);
};

interface ModeratorConfig {
  [organization: string]: string;
}

let moderatorConfigCache: ModeratorConfig | null = null;

const parseModeratorConfig = (): ModeratorConfig => {
  if (moderatorConfigCache) {
    return moderatorConfigCache;
  }

  const configString = import.meta.env.VITE_MODERATOR_CONFIG;

  if (!configString) {
    console.warn('VITE_MODERATOR_CONFIG environment variable is not set');
    moderatorConfigCache = {};
    return moderatorConfigCache;
  }

  try {
    const parsed = JSON.parse(configString);
    moderatorConfigCache = parsed;
    devLog('Moderator configuration loaded successfully with', Object.keys(parsed).length, 'organizations');
    return parsed;
  } catch (error) {
    console.error('Failed to parse VITE_MODERATOR_CONFIG:', error);
    moderatorConfigCache = {};
    return moderatorConfigCache;
  }
};

export const isAfyaNahakiDomainEmail = (email: string): boolean => {
  if (!email) return false;
  return email.toLowerCase().endsWith('@afyanahaki.org');
};

export const getModeratorOrganization = (email: string): string | null => {
  if (!email) return null;

  const config = parseModeratorConfig();
  const normalizedEmail = email.toLowerCase().trim();

  for (const [organization, configEmail] of Object.entries(config)) {
    if (configEmail.toLowerCase().trim() === normalizedEmail) {
      return organization;
    }
  }

  return null;
};

export const isConfiguredModerator = (email: string, organization?: string): boolean => {
  if (!email) {
    devLog('isConfiguredModerator: No email provided');
    return false;
  }

  const config = parseModeratorConfig();
  const normalizedEmail = email.toLowerCase().trim();

  const expectedOrganization = getModeratorOrganization(normalizedEmail);

  if (!expectedOrganization) {
    devLog('isConfiguredModerator: Email not found in configuration:', normalizedEmail);
    return false;
  }

  if (!organization) {
    devLog('isConfiguredModerator: Email found but no organization provided for validation:', normalizedEmail);
    return true;
  }

  const normalizedProvidedOrg = organization.trim().toLowerCase();
  const organizationMatches = normalizedProvidedOrg === expectedOrganization.toLowerCase();

  devLog('isConfiguredModerator: Email:', normalizedEmail,
              'Expected org:', expectedOrganization,
              'Provided org:', normalizedProvidedOrg,
              'Matches:', organizationMatches);

  return organizationMatches;
};

export const shouldBeModerator = (email: string, organization?: string): boolean => {
  if (!email) {
    devLog('shouldBeModerator: No email provided');
    return false;
  }

  if (isAfyaNahakiDomainEmail(email)) {
    devLog('shouldBeModerator: Email is @afyanahaki.org domain, granting moderator access');
    return true;
  }

  const isConfigured = isConfiguredModerator(email, organization);
  devLog('shouldBeModerator: Email:', email, 'Organization:', organization, 'Result:', isConfigured);

  return isConfigured;
};

export const validateModeratorOrganization = (email: string, organization: string): {
  isValid: boolean;
  expectedOrganization: string | null;
  message: string;
} => {
  if (!email) {
    return {
      isValid: false,
      expectedOrganization: null,
      message: 'Email is required'
    };
  }

  if (isAfyaNahakiDomainEmail(email)) {
    return {
      isValid: true,
      expectedOrganization: null,
      message: 'AfyaNahaki domain email'
    };
  }

  const expectedOrg = getModeratorOrganization(email);

  if (!expectedOrg) {
    return {
      isValid: true,
      expectedOrganization: null,
      message: 'Not a configured moderator email'
    };
  }

  if (!organization || organization.trim() === '') {
    return {
      isValid: false,
      expectedOrganization: expectedOrg,
      message: `This email is registered as a moderator for ${expectedOrg}. Please provide your organization.`
    };
  }

  const normalizedProvidedOrg = organization.trim().toLowerCase();
  const matches = normalizedProvidedOrg === expectedOrg.toLowerCase();

  if (!matches) {
    return {
      isValid: false,
      expectedOrganization: expectedOrg,
      message: `Organization mismatch. This email is registered for ${expectedOrg}.`
    };
  }

  return {
    isValid: true,
    expectedOrganization: expectedOrg,
    message: 'Organization validated successfully'
  };
};

export const getAllModeratorEmails = (): string[] => {
  const config = parseModeratorConfig();
  return Object.values(config).map(email => email.toLowerCase().trim());
};

export const getModeratorCount = (): number => {
  const config = parseModeratorConfig();
  return Object.keys(config).length;
};

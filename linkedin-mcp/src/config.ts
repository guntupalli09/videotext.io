export const config = {
  linkedin: {
    clientId: process.env.LINKEDIN_CLIENT_ID || '',
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET || '',
    accessToken: process.env.LINKEDIN_ACCESS_TOKEN || '',
    refreshToken: process.env.LINKEDIN_REFRESH_TOKEN || '',
    organizationId: process.env.LINKEDIN_ORGANIZATION_ID || '',
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
  },
  postSchedule: process.env.POST_SCHEDULE || '0 9 * * 1-5',
};

export const LINKEDIN_API_BASE = 'https://api.linkedin.com/v2';
export const LINKEDIN_REST_BASE = 'https://api.linkedin.com/rest';

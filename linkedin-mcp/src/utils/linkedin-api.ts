import { config, LINKEDIN_REST_BASE } from '../config.js';

async function linkedinFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const res = await fetch(`${LINKEDIN_REST_BASE}${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${config.linkedin.accessToken}`,
      'LinkedIn-Version': '202406',
      'X-Restli-Protocol-Version': '2.0.0',
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`LinkedIn API ${res.status}: ${body}`);
  }

  return res;
}

export async function refreshAccessToken(): Promise<string> {
  const res = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: config.linkedin.refreshToken,
      client_id: config.linkedin.clientId,
      client_secret: config.linkedin.clientSecret,
    }),
  });

  if (!res.ok) throw new Error(`Token refresh failed: ${await res.text()}`);
  const data = await res.json();
  config.linkedin.accessToken = data.access_token;
  if (data.refresh_token) config.linkedin.refreshToken = data.refresh_token;
  return data.access_token;
}

export async function createTextPost(text: string): Promise<string> {
  const orgUrn = `urn:li:organization:${config.linkedin.organizationId}`;

  const res = await linkedinFetch('/posts', {
    method: 'POST',
    body: JSON.stringify({
      author: orgUrn,
      commentary: text,
      visibility: 'PUBLIC',
      distribution: {
        feedDistribution: 'MAIN_FEED',
        targetEntities: [],
        thirdPartyDistributionChannels: [],
      },
      lifecycleState: 'PUBLISHED',
    }),
  });

  const postId = res.headers.get('x-restli-id') || 'unknown';
  return postId;
}

export async function createImagePost(text: string, imageBuffer: Buffer, altText: string): Promise<string> {
  const orgUrn = `urn:li:organization:${config.linkedin.organizationId}`;

  // Step 1: Initialize upload
  const initRes = await linkedinFetch('/images?action=initializeUpload', {
    method: 'POST',
    body: JSON.stringify({
      initializeUploadRequest: {
        owner: orgUrn,
      },
    }),
  });

  const initData = await initRes.json();
  const uploadUrl = initData.value.uploadUrl;
  const imageUrn = initData.value.image;

  // Step 2: Upload image binary
  await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${config.linkedin.accessToken}`,
      'Content-Type': 'image/png',
    },
    body: imageBuffer,
  });

  // Step 3: Create post with image
  const res = await linkedinFetch('/posts', {
    method: 'POST',
    body: JSON.stringify({
      author: orgUrn,
      commentary: text,
      visibility: 'PUBLIC',
      distribution: {
        feedDistribution: 'MAIN_FEED',
        targetEntities: [],
        thirdPartyDistributionChannels: [],
      },
      content: {
        media: {
          id: imageUrn,
          title: altText,
        },
      },
      lifecycleState: 'PUBLISHED',
    }),
  });

  return res.headers.get('x-restli-id') || 'unknown';
}

export async function getCompanyFollowers(): Promise<number> {
  const res = await linkedinFetch(
    `/organizationalEntityFollowerStatistics?q=organizationalEntity&organizationalEntity=urn:li:organization:${config.linkedin.organizationId}`
  );
  const data = await res.json();
  return data.elements?.[0]?.followerCounts?.organicFollowerCount || 0;
}

export async function getPostAnalytics(postUrn: string): Promise<Record<string, unknown>> {
  const res = await linkedinFetch(
    `/organizationalEntityShareStatistics?q=organizationalEntity&organizationalEntity=urn:li:organization:${config.linkedin.organizationId}&shares=List(${postUrn})`
  );
  return await res.json();
}

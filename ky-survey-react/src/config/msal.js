const CLIENT_ID = import.meta.env.VITE_AZURE_CLIENT_ID || '94dfbb8e-3e2e-40ed-b1e0-0e8f52df7d23';
const TENANT_ID = import.meta.env.VITE_AZURE_TENANT_ID || '676ac0b7-276a-4e65-82ad-f13e2c55cf8c';

export const msalConfig = {
  auth: {
    clientId: CLIENT_ID,
    authority: `https://login.microsoftonline.com/${TENANT_ID}`,
    redirectUri: window.location.origin + import.meta.env.BASE_URL,
  },
  cache: {
    cacheLocation: 'sessionStorage',
    storeAuthStateInCookie: false,
  },
};

export const loginRequest = {
  scopes: ['User.Read'],
};

export const msalConfig = {
  auth: {
    clientId: '94dfbb8e-3e2e-40ed-b1e0-0e8f52df7d23',
    authority: 'https://login.microsoftonline.com/676ac0b7-276a-4e65-82ad-f13e2c55cf8c',
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

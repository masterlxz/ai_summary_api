const CLIENT_ID = '91148707774-hmotj0d85i3kbnhateornlv9dkkgtuqq.apps.googleusercontent.com';

function base64urlEncode(array) {
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function generateCodeVerifier() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64urlEncode(array);
}

async function generateCodeChallenge(verifier) {
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return base64urlEncode(new Uint8Array(digest));
}

async function handleLogin() {
  const redirectUri = `https://${chrome.runtime.id}.chromiumapp.org/`;
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'openid email profile');
  authUrl.searchParams.set('code_challenge', codeChallenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');

  const redirectUrl = await new Promise((resolve, reject) => {
    chrome.identity.launchWebAuthFlow(
      { url: authUrl.toString(), interactive: true },
      (responseUrl) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(responseUrl);
        }
      }
    );
  });

  const url = new URL(redirectUrl);
  const code = url.searchParams.get('code');
  if (!code) throw new Error('Código de autorização não encontrado');

  const response = await fetch('http://localhost:3000/api/auth/google', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, code_verifier: codeVerifier, redirect_uri: redirectUri })
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Falha na autenticação');

  await chrome.storage.local.set({ authToken: data.token, userName: data.name });

  return { success: true, name: data.name };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'START_LOGIN') {
    handleLogin()
      .then(sendResponse)
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true; // mantém o canal aberto para a resposta assíncrona
  }
});

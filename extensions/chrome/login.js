document.getElementById('loginBtn').addEventListener('click', async () => {
  const btn = document.getElementById('loginBtn');
  const statusDiv = document.getElementById('status');

  btn.disabled = true;
  statusDiv.textContent = 'Autenticando...';
  statusDiv.className = '';

  try {
    // Passo 1: pedir o token do Google via Chrome
    const googleToken = await new Promise((resolve, reject) => {
      chrome.identity.getAuthToken({ interactive: true }, (token) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(token);
        }
      });
    });

    // Passo 2: enviar o token do Google para o Rails verificar
    const response = await fetch('http://localhost:3000/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: googleToken })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Falha na autenticação');
    }

    // Passo 3: salvar nosso token de sessão e o nome do usuário
    await chrome.storage.local.set({
      authToken: data.token,
      userName:  data.name
    });

    // Passo 4: ir para a tela principal
    window.location.href = 'popup.html';

  } catch (error) {
    statusDiv.textContent = `Erro: ${error.message}`;
    statusDiv.className = 'error';
    btn.disabled = false;
  }
});

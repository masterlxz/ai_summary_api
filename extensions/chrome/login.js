document.getElementById('loginBtn').addEventListener('click', async () => {
  const btn = document.getElementById('loginBtn');
  const statusDiv = document.getElementById('status');

  btn.disabled = true;
  statusDiv.textContent = 'Autenticando...';
  statusDiv.className = '';

  try {
    const result = await chrome.runtime.sendMessage({ type: 'START_LOGIN' });

    if (!result.success) {
      throw new Error(result.error);
    }

    window.location.href = 'popup.html';
  } catch (error) {
    statusDiv.textContent = `Erro: ${error.message}`;
    statusDiv.className = 'error';
    btn.disabled = false;
  }
});

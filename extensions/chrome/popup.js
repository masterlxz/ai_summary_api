function markdownToHtml(text) {
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^### (.+)$/gm, '<h4>$1</h4>')
    .replace(/^## (.+)$/gm, '<h3>$1</h3>')
    .replace(/^# (.+)$/gm, '<h3>$1</h3>')
    .replace(/^\* (.+)$/gm, '<li>$1</li>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
    .replace(/\n{2,}/g, '</p><p>')
    .replace(/\n/g, '<br>')
    .replace(/^(.+)$/, '<p>$1</p>');
}

// Guarda na entrada: verifica login ao abrir o popup
document.addEventListener('DOMContentLoaded', async () => {
  const { authToken, userName } = await chrome.storage.local.get(['authToken', 'userName']);

  if (!authToken) {
    window.location.href = 'login.html';
    return;
  }

  if (userName) {
    const greeting = document.getElementById('greeting');
    if (greeting) greeting.textContent = `Olá, ${userName.split(' ')[0]}`;
  }
});

document.getElementById('summarizeBtn').addEventListener('click', async () => {
  const resultDiv = document.getElementById('result');
  const btn = document.getElementById('summarizeBtn');

  const { authToken } = await chrome.storage.local.get('authToken');

  if (!authToken) {
    window.location.href = 'login.html';
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Analisando...';
  resultDiv.style.display = 'none';

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => document.body.innerText,
  });

  try {
    const response = await fetch('http://localhost:3000/api/summarize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ text: result })
    });

    if (response.status === 401) {
      await chrome.storage.local.remove(['authToken', 'userName']);
      window.location.href = 'login.html';
      return;
    }

    const data = await response.json();

    if (!response.ok) {
      resultDiv.innerHTML = `<span class="error">Erro: ${data.error || 'Falha ao gerar resumo.'}</span>`;
      resultDiv.style.display = 'block';
      return;
    }

    resultDiv.innerHTML = markdownToHtml(data.summary);
    resultDiv.style.display = 'block';
  } catch (error) {
    resultDiv.innerHTML = '<span class="error">Erro: Não consegui conectar ao servidor.</span>';
    resultDiv.style.display = 'block';
    console.error(error);
  } finally {
    btn.disabled = false;
    btn.innerHTML = 'Resumir Página Atual';
  }
});

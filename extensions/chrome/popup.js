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

  await loadConnectionSelect(authToken);
  await restoreLastSession(authToken);
});

async function restoreLastSession(token) {
  try {
    const storage = await chrome.storage.local.get('restore_summary_id');
    const restoreId = storage.restore_summary_id;

    let url;
    if (restoreId) {
      url = `http://localhost:3000/api/summaries/${restoreId}`;
      await chrome.storage.local.remove('restore_summary_id');
    } else {
      url = 'http://localhost:3000/api/summaries/latest';
    }

    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!res.ok) return;

    const data = await res.json();
    if (!data.summary_text) return;

    currentSummaryId = data.summary_id;
    currentPageText  = data.page_context;
    currentConnectionId = data.ai_connection_id || null;
    chatHistory = data.chat_history || [];

    const resultDiv = document.getElementById('result');
    resultDiv.innerHTML = markdownToHtml(data.summary_text);
    resultDiv.style.display = 'block';

    const messagesDiv = document.getElementById('chat-messages');
    messagesDiv.innerHTML = '';
    chatHistory.forEach(turn => appendChatBubble(turn.role, turn.content));

    document.getElementById('chat-section').style.display = 'block';
  } catch (error) {
    console.error('Erro ao restaurar sessão:', error);
  }
}

async function loadConnectionSelect(token) {
  const select = document.getElementById('connectionSelect');

  try {
    const [connectionsRes, meRes] = await Promise.all([
      fetch('http://localhost:3000/api/ai_connections', {
        headers: { 'Authorization': `Bearer ${token}` }
      }),
      fetch('http://localhost:3000/api/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
    ]);

    if (connectionsRes.status === 401) {
      window.location.href = 'login.html';
      return;
    }

    const connections = await connectionsRes.json();
    const me = await meRes.json();
    const remaining = me.free_summaries_remaining ?? 5;

    select.innerHTML = `<option value="">✨ Gemini Gratuito (${remaining}/5 restantes)</option>`;

    connections.forEach(conn => {
      const option = document.createElement('option');
      option.value = conn.id;
      option.textContent = `${conn.name} (${conn.provider})`;
      select.appendChild(option);
    });

  } catch (error) {
    select.innerHTML = '<option value="">✨ Gemini Gratuito</option>';
    console.error(error);
  }
}

let chatHistory = [];
let currentPageText = null;
let currentConnectionId = null;
let currentSummaryId = null;

document.getElementById('connectionsBtn').addEventListener('click', () => {
  window.location.href = 'connections.html';
});

document.getElementById('historyBtn').addEventListener('click', () => {
  window.location.href = 'history.html';
});

document.getElementById('logoutBtn').addEventListener('click', async () => {
  const { authToken } = await chrome.storage.local.get('authToken');

  if (authToken) {
    await fetch('http://localhost:3000/api/auth/session', {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${authToken}` }
    }).catch(() => {});
  }

  await chrome.storage.local.remove(['authToken', 'userName']);
  window.location.href = 'login.html';
});

function appendChatBubble(role, text) {
  const messagesDiv = document.getElementById('chat-messages');
  const bubble = document.createElement('div');
  bubble.classList.add('chat-bubble', role);
  bubble.textContent = text;
  messagesDiv.appendChild(bubble);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

async function sendChatMessage() {
  const input = document.getElementById('chatInput');
  const sendBtn = document.getElementById('chatSendBtn');
  const message = input.value.trim();

  if (!message || !currentPageText) return;

  const { authToken } = await chrome.storage.local.get('authToken');
  if (!authToken) { window.location.href = 'login.html'; return; }

  appendChatBubble('user', message);
  input.value = '';
  sendBtn.disabled = true;
  sendBtn.innerHTML = '<span class="spinner"></span>';

  const body = {
    message,
    page_context: currentPageText,
    history: chatHistory
  };
  if (currentConnectionId) body.ai_connection_id = currentConnectionId;
  if (currentSummaryId)    body.summary_id = currentSummaryId;

  try {
    const response = await fetch('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();

    if (!response.ok) {
      appendChatBubble('assistant', `Erro: ${data.error || 'Falha ao processar mensagem.'}`);
      return;
    }

    chatHistory.push({ role: 'user', content: message });
    chatHistory.push({ role: 'assistant', content: data.reply });
    appendChatBubble('assistant', data.reply);
  } catch (error) {
    appendChatBubble('assistant', 'Erro: Não consegui conectar ao servidor.');
    console.error(error);
  } finally {
    sendBtn.disabled = false;
    sendBtn.textContent = 'Enviar';
  }
}

document.getElementById('chatSendBtn').addEventListener('click', sendChatMessage);

document.getElementById('chatInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') sendChatMessage();
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

  const selectedConnectionId = document.getElementById('connectionSelect').value;
  currentPageText = result;
  currentConnectionId = selectedConnectionId || null;

  const body = { text: result };
  if (selectedConnectionId) body.ai_connection_id = selectedConnectionId;

  try {
    const response = await fetch('http://localhost:3000/api/summarize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(body)
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

    currentSummaryId = data.summary_id || null;
    chatHistory = [];
    document.getElementById('chat-messages').innerHTML = '';
    document.getElementById('chat-section').style.display = 'block';

    if (data.free_summaries_remaining != null) {
      const select = document.getElementById('connectionSelect');
      const freeOption = select.querySelector('option[value=""]');
      if (freeOption) freeOption.textContent = `✨ Gemini Gratuito (${data.free_summaries_remaining}/5 restantes)`;
    }
  } catch (error) {
    resultDiv.innerHTML = '<span class="error">Erro: Não consegui conectar ao servidor.</span>';
    resultDiv.style.display = 'block';
    console.error(error);
  } finally {
    btn.disabled = false;
    btn.innerHTML = 'Resumir Página Atual';
  }
});

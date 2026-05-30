const API_BASE = 'http://localhost:3000/api';

document.getElementById('backBtn').addEventListener('click', () => {
  window.location.href = 'popup.html';
});

async function getToken() {
  const { authToken } = await chrome.storage.local.get('authToken');
  return authToken;
}

async function loadConnections() {
  const token = await getToken();
  const list = document.getElementById('connectionsList');

  try {
    const response = await fetch(`${API_BASE}/ai_connections`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (response.status === 401) {
      window.location.href = 'login.html';
      return;
    }

    const connections = await response.json();

    if (connections.length === 0) {
      list.innerHTML = '<p class="empty-state">Nenhuma conexão cadastrada ainda.</p>';
      return;
    }

    list.innerHTML = connections.map(conn => `
      <div class="connection-item" data-id="${conn.id}">
        <div class="connection-info">
          <div class="connection-name">${conn.name}</div>
          <div class="connection-provider">${conn.provider}</div>
        </div>
        <button class="delete-btn" data-id="${conn.id}" title="Excluir">×</button>
      </div>
    `).join('');

    list.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', () => deleteConnection(btn.dataset.id));
    });

  } catch (error) {
    list.innerHTML = '<p class="empty-state" style="color:#ef4444">Erro ao carregar conexões.</p>';
    console.error(error);
  }
}

async function deleteConnection(id) {
  const token = await getToken();

  try {
    const response = await fetch(`${API_BASE}/ai_connections/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (response.ok) {
      loadConnections();
    }
  } catch (error) {
    console.error(error);
  }
}

document.getElementById('saveBtn').addEventListener('click', async () => {
  const token = await getToken();
  const btn = document.getElementById('saveBtn');
  const status = document.getElementById('status');

  const provider = document.getElementById('providerSelect').value;
  const name = document.getElementById('nameInput').value.trim();
  const api_key = document.getElementById('apiKeyInput').value.trim();

  if (!name || !api_key) {
    status.textContent = 'Preencha o nome e a API Key.';
    status.className = 'error';
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Salvando...';
  status.textContent = '';
  status.className = '';

  try {
    const response = await fetch(`${API_BASE}/ai_connections`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ ai_connection: { provider, name, api_key } })
    });

    const data = await response.json();

    if (!response.ok) {
      status.textContent = data.errors ? data.errors.join(', ') : 'Erro ao salvar.';
      status.className = 'error';
      return;
    }

    document.getElementById('nameInput').value = '';
    document.getElementById('apiKeyInput').value = '';
    status.textContent = 'Conexão salva com sucesso!';
    status.className = '';
    loadConnections();

  } catch (error) {
    status.textContent = 'Erro: não consegui conectar ao servidor.';
    status.className = 'error';
    console.error(error);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Salvar Conexão';
  }
});

loadConnections();

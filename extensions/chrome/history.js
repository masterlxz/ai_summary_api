const API_BASE = 'http://localhost:3000/api';

function formatDate(isoString) {
  const date = new Date(isoString);
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
    + ' ' + date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function formatUrl(url) {
  if (!url) return 'URL não registrada';
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function renderList(summaries) {
  const list = document.getElementById('historyList');

  if (summaries.length === 0) {
    list.innerHTML = '<p class="empty-state">Nenhum resumo encontrado.</p>';
    return;
  }

  list.innerHTML = '';

  summaries.forEach(function(summary) {
    const item = document.createElement('div');
    item.className = 'history-item';
    item.innerHTML = `
      <div class="history-summary">${summary.summary_text}</div>
      <div class="history-meta">
        <span class="history-url" title="${summary.page_url || ''}">${formatUrl(summary.page_url)}</span>
        <span class="history-date">${formatDate(summary.created_at)}</span>
      </div>
    `;

    item.addEventListener('click', function() {
      chrome.storage.local.set({ restore_summary_id: summary.id }, function() {
        window.location.href = 'popup.html';
      });
    });

    list.appendChild(item);
  });
}

document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('backBtn').addEventListener('click', function() {
    window.location.href = 'popup.html';
  });

  chrome.storage.local.get('auth_token', function(result) {
    const token = result.auth_token;

    if (!token) {
      window.location.href = 'login.html';
      return;
    }

    fetch(`${API_BASE}/summaries`, {
      headers: { 'Authorization': 'Bearer ' + token }
    })
    .then(function(response) {
      if (response.status === 401) {
        window.location.href = 'login.html';
        return null;
      }
      return response.json();
    })
    .then(function(data) {
      if (!data) return;
      renderList(data.summaries);
    })
    .catch(function() {
      document.getElementById('historyList').innerHTML =
        '<p class="empty-state">Erro ao carregar histórico.</p>';
    });
  });
});

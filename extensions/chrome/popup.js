// 1. Ouvinte de evento: Espera o usuário clicar no botão de "Resumir"
document.getElementById('summarizeBtn').addEventListener('click', async () => {
  const resultDiv = document.getElementById('result');
  resultDiv.innerText = 'Processando...';

  // 2. Pegar a aba ativa do navegador
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  // 3. Executar um script na aba ativa para ler o texto da página
  // O 'chrome.scripting.executeScript' é como o "braço" da extensão que toca no DOM da página
  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => document.body.innerText, // Pega todo o texto do corpo da página
  });

  // 4. Enviar esse texto para o nosso servidor Rails (a nossa "Cozinha")
  try {
    const response = await fetch('http://localhost:3000/api/summarize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: result })
    });

    const data = await response.json();

    // 5. Exibir o resultado na nossa janelinha
    resultDiv.innerText = data.summary || 'Erro ao resumir.';
  } catch (error) {
    resultDiv.innerText = 'Erro: Não consegui conectar ao servidor.';
    console.error(error);
  }
});

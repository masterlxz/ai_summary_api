# README_CONTEXT.md — Save State do Projeto

> Este arquivo é um "Save State" técnico e histórico do projeto. Ele existe para que, ao trocar de máquina ou retomar o trabalho após uma pausa, você (ou uma IA assistente) possa ler este documento e entrar em contexto imediatamente, sem precisar re-explorar o código do zero.

---

## 🎯 O OBJETIVO DO PROJETO

Este é um projeto **Full-Stack** composto por duas partes que se comunicam:

1. **Backend:** Uma API em **Ruby on Rails** que recebe texto, chama a **API do Gemini 2.5 Flash** do Google e devolve um resumo inteligente em JSON.
2. **Frontend:** Uma **Extensão do Chrome** que captura o texto da página que o usuário está visitando, envia para o backend Rails e exibe o resumo formatado em um popup bonito.

O objetivo de produto é evoluir isso para um **SaaS** — uma ferramenta de produtividade com planos pagos.

**Ambiente de desenvolvimento:** Arch Linux.

---

## 📜 O PASSADO — O que já está 100% pronto e testado

### Backend (Ruby on Rails — API Mode)

- **API configurada** em modo API-only (sem views HTML, sem assets).
- **`SummaryService`** (`app/services/summary_service.rb`): Faz a chamada ao Gemini usando a biblioteca padrão do Ruby (`Net::HTTP`), sem nenhuma gem de terceiros para isso. Constrói o payload JSON na mão e parseia a resposta com `data.dig(...)`.
- **Rota:** `POST /api/summarize` → `Api::SummariesController#create`.
- **Controller** (`app/controllers/api/summaries_controller.rb`): Recebe os params `text` e `mode` (opcional, padrão: `resumo_direto`), instancia o service e devolve `{ summary: "..." }` como JSON.
- **CORS liberado:** Configurado em `config/initializers/cors.rb` com `origins '*'`, aceitando requisições de qualquer origem (incluindo a extensão do Chrome).
- **Variável de ambiente:** A chave do Gemini (`GEMINI_API_KEY`) é carregada via `dotenv-rails` a partir de um arquivo `.env` local (não commitado).
- **`.gitignore`:** A pasta `vendor/bundle/` está corretamente ignorada, então as gems não são versionadas.

### Frontend (Extensão do Chrome)

- **`manifest.json` (Manifest V3):**
  - Permissões: `activeTab`, `scripting`.
  - `host_permissions`: `http://localhost:3000/*` (permite o `fetch` para o Rails local).
- **`popup.html`:**
  - Fonte **Inter** carregada via Google Fonts.
  - Design estilo **SaaS card**: fundo `#f8fafc`, container com `border-radius: 14px` e `box-shadow`, `body` transparente para as bordas arredondadas aparecerem.
  - Card branco para o resultado (`#result`), inicialmente oculto (`display: none`).
  - Animação CSS de **spinner** (rotação 360°) para o estado de carregamento.
- **`popup.js`:**
  - Ao clicar: desabilita o botão, substitui o texto por `<span class="spinner"></span> Analisando...` e esconde o card de resultado.
  - Usa `chrome.scripting.executeScript` para extrair `document.body.innerText` da aba ativa.
  - Faz `fetch` via `POST` para `http://localhost:3000/api/summarize` com o texto extraído.
  - Checa `response.ok` para distinguir sucesso (2xx) de erro (4xx/5xx).
  - Função `markdownToHtml()`: converte o Markdown retornado pelo Gemini (`**negrito**`, `- listas`, `# títulos`) em HTML real antes de inserir no DOM com `innerHTML`.
  - No `finally`: reabilita o botão e restaura o texto original.

---

## 📍 O PRESENTE — Status Atual

O **fluxo de ponta a ponta está funcionando perfeitamente em `localhost`**:

```
Usuário clica → Extensão extrai o texto da página
→ POST para Rails (localhost:3000)
→ Rails chama o Gemini 2.5 Flash
→ Gemini responde com o resumo em Markdown
→ Rails devolve { summary: "..." } como JSON
→ Extensão converte para HTML e exibe no popup
```

O design da extensão foi atualizado e está com visual de SaaS profissional: estilo card moderno, fonte Inter, spinner de carregamento, bordas arredondadas no corpo da extensão.

---

## 🚀 O FUTURO — Roadmap de Produto

### Funcionalidade 1: Modelo BYOK (Bring Your Own Key)
Permitir que o usuário use sua própria chave da API do Gemini.
- Adicionar uma tela de **Configurações** na extensão (uma nova página HTML ou um painel no popup).
- Salvar a chave no `chrome.storage.sync` (persiste entre dispositivos do mesmo usuário Chrome).
- Enviar a chave no header ou body do `fetch` para o Rails, que a usará em vez da variável de ambiente global.

### Funcionalidade 2: Autenticação e CRUD
- Avaliar **Login com Google via OmniAuth** em vez de login tradicional (e-mail/senha) — mais simples de implementar e muito mais amigável na UX de uma extensão.
- Criar um sistema de **limitação de uso** por usuário (ex: N resumos por dia no plano gratuito).
- Construir um **CRUD** para que o usuário veja o histórico dos seus resumos.

### Funcionalidade 3: Planos e Monetização (SaaS)
- Definir tiers de plano (Gratuito, Pro, etc.).
- Integrar um gateway de pagamento (ex: Stripe).
- Criar uma landing page para o produto.

---

## 🧠 DIRETRIZES DE APRENDIZADO DO DESENVOLVEDOR

> **Importante para a IA assistente:** O desenvolvedor está aprendendo enquanto constrói. As diretrizes abaixo são rigorosas e devem ser seguidas em todas as sessões.

### Estilo Passo a Passo
Nunca entregar blocos massivos de código de uma vez. A abordagem correta é sempre **um arquivo por vez**, com explicação do que está sendo feito e por quê, antes de passar para o próximo.

### Explicação Conceitual Obrigatória
Sempre explicar o **"porquê"** de cada linha, configuração ou decisão técnica nova. Não basta mostrar o código — é preciso conectar o conceito ao entendimento do desenvolvedor.

### Uso de Analogias do Mundo Real
Continuar usando analogias concretas para fixar conceitos abstratos. Exemplos já estabelecidos neste projeto:

| Conceito Técnico | Analogia |
|---|---|
| Controller | Garçom (recebe o pedido e entrega o resultado) |
| Service | Cozinha (onde o trabalho pesado acontece) |
| CORS | Segurança na porta do restaurante (verifica de onde vem o pedido) |
| `fetch` no JS | Motoboy que leva e traz a encomenda |

### Modo Detetive para Erros
Em caso de erros ou bugs, **não dar a correção de bandeja**. O processo correto é:
1. Guiar o desenvolvedor a ler os logs relevantes (terminal do Rails, console do Chrome).
2. Fazer perguntas para ajudar a identificar a causa raiz.
3. Explicar o que o erro significa conceitualmente.
4. Só então sugerir a correção, explicando o porquê.

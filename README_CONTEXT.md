# README_CONTEXT.md — Save State do Projeto

> Este arquivo é um "Save State" técnico e histórico do projeto. Ele existe para que, ao trocar de máquina ou retomar o trabalho após uma pausa, você (ou uma IA assistente) possa ler este documento e entrar em contexto imediatamente, sem precisar re-explorar o código do zero.

> Lembre-se sempre de ir atualizando esse arquivo conforme progredimos no projeto.

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

### O que foi construído na sessão de 2026-05-24 (autenticação — CONCLUÍDO)

O fluxo completo de autenticação Google OAuth com PKCE está funcionando.

**Backend:**
- Migration `20260524184433`: adicionou `google_uid`, `auth_token` e `name` à tabela `users`, com índices únicos.
- `User` model: métodos `find_or_create_from_google` e `generate_auth_token!` implementados.
- `Api::AuthController` (`app/controllers/api/auth_controller.rb`): recebe `code` + `code_verifier` + `redirect_uri`, troca o código pelo access token do Google via `oauth2.googleapis.com/token`, busca dados do usuário via `oauth2/v2/userinfo`, encontra/cria o usuário e devolve nosso token de sessão.
- Rota: `post 'auth/google', to: 'auth#google'` dentro do `namespace :api`.
- Variáveis de ambiente: `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` no `.env`.

**Extensão:**
- `manifest.json`: permissões `identity` e `storage`; service worker `background.js` registrado. Sem bloco `oauth2`.
- `background.js`: service worker que gerencia todo o fluxo OAuth (PKCE + launchWebAuthFlow + fetch para Rails + storage.set). Responde à mensagem `START_LOGIN`.
- `login.js`: apenas envia `{ type: 'START_LOGIN' }` ao service worker e aguarda resposta.
- `popup.js`: verifica token ao abrir; envia `Authorization: Bearer <token>` nas requisições; redireciona para login se token inválido.

**Decisões técnicas importantes:**
- `chrome.identity.getAuthToken()` foi descartado — só funciona com extensões publicadas na Web Store.
- `launchWebAuthFlow()` com PKCE foi a solução — funciona em desenvolvimento.
- A lógica de auth foi movida para o **service worker** (`background.js`) porque o popup fecha quando perde foco (enquanto o Google auth window está aberto), matando o contexto JS antes do `chrome.storage.local.set` ser executado.
- Credencial OAuth usada: tipo **"Aplicativo da Web"** no GCP (tem client_id + client_secret).
- Extension ID: `eidppmgladbnonfacjlabffbgbkeegfk`

**Google Cloud Console:**
- Projeto criado, tela de consentimento configurada (modo Externo), usuário de teste `fabio.anjos.junior@gmail.com` adicionado.
- Credencial "Aplicativo da Web" com redirect URI `https://eidppmgladbnonfacjlabffbgbkeegfk.chromiumapp.org/`.

### Infraestrutura de banco

- **Tabela `users`**: `google_uid`, `auth_token`, `name`, `free_summaries_count`, `last_summary_date` — tudo criado.
- **Tabela `ai_connections`**: `provider`, `api_key`, `user_id`, `name` — tudo criado (campo `name` adicionado em 2026-05-26).
- **Modelos**: `User` (`has_many :ai_connections`) e `AiConnection` (`belongs_to :user`) existem.

### O que foi construído na sessão de 2026-05-30 (Fase 2 frontend — tela de conexões)

**Extensão:**
- `connections.html`: tela de gerenciamento de conexões AI — lista conexões cadastradas, formulário para adicionar nova (provider + nome + API key) e botão × para deletar cada uma.
- `connections.js`: faz GET ao abrir a tela, POST ao salvar e DELETE ao clicar em ×. Todas as requisições enviam `Authorization: Bearer <token>`. Redireciona para `login.html` se receber 401.
- `popup.html`: adicionado botão ⚙ no header que navega para `connections.html`.
- `popup.js`: adicionado evento de clique no botão ⚙.

### O que foi construído na sessão de 2026-05-31 (Fase 3 — Chat Pós-Resumo)

**Backend:**
- `app/services/chat_service.rb`: novo serviço de chat stateless — recebe `message`, `page_context` e `history` (array de turns anteriores), monta o contexto correto para cada provider (Gemini, OpenAI, Anthropic) e retorna a resposta da IA.
- `app/controllers/api/chat_controller.rb`: novo controller com `POST /api/chat` — autenticado por token, resolve credenciais (conexão própria ou Gemini gratuito), chama o `ChatService`.
- `config/routes.rb`: adicionada rota `post 'chat', to: 'chat#create'`.

**Extensão:**
- `popup.html`: adicionada seção `#chat-section` (oculta inicialmente) com área de mensagens `#chat-messages`, input e botão de enviar. CSS com bolhas `.chat-bubble.user` (azul, direita) e `.chat-bubble.assistant` (branca, esquerda).
- `popup.js`: variáveis globais `chatHistory`, `currentPageText`, `currentConnectionId` guardam estado em memória. Após resumo gerado, `#chat-section` aparece. Função `sendChatMessage()` manda POST com histórico completo, exibe bolhas e atualiza `chatHistory`. Enter no input também envia.

**Decisões técnicas:**
- Chat é stateless por enquanto: histórico vive só em memória JS, some ao fechar o popup. Persistência fica para a Fase 4.
- Gemini não tem campo `system` — contexto da página é injetado como o primeiro "turn" do array `contents`, com resposta simulada "Entendido" para satisfazer a API.
- Chat não consome o limite gratuito de resumos — usa a mesma conexão selecionada sem cobrança adicional por mensagem.

### O que não funciona ainda

- Ao fechar e reabrir a extensão, o resumo some — estado não persiste (Fase 4).
- Histórico de chat some ao fechar o popup (Fase 4).
- Histórico de resumos não existe ainda — usuário quer os últimos 10-15 salvos (Fase 4/5).

---

## 🚀 O FUTURO — Roadmap de Produto

> **Nota:** O roadmap foi revisado em 2026-05-24. A ordem e o escopo mudaram em relação à versão anterior.

### Fase 1 — Autenticação (CONCLUÍDA)
Fundação obrigatória para tudo que vem depois.
- Rotas de registro/login via API JSON (Devise já instalado).
- Autenticação por **token** no header `Authorization: Bearer <token>`.
- Tela de login/registro na extensão (nova página HTML).
- Token salvo no `chrome.storage.local` (apenas local, não sync — por segurança).

### Fase 2 — Gerenciamento de Conexões AI (BYOK Multi-Provider) — CONCLUÍDA
Usuário cadastra suas próprias chaves de diferentes provedores de IA.
- [x] Migration adicionou campo `name` à tabela `ai_connections`
- [x] `Api::AiConnectionsController` com index, create, update, destroy — protegidos por token
- [x] `ApplicationController` com `authenticate_user!` e `current_user`
- [x] `User` migrado de `has_one` para `has_many :ai_connections`
- [x] Tela na extensão para listar e cadastrar conexões (`connections.html` + `connections.js`)
- [x] Select de conexões no popup com contagem de usos gratuitos em tempo real
- [x] `SummariesController` com autenticação, limite de 5 resumos gratuitos/dia e roteamento por `ai_connection_id`
- [x] `SummaryService` suporta Gemini, OpenAI e Anthropic
- [x] `GET /api/me` retorna saldo gratuito restante (`Api::UsersController`)

### Fase 3 — Chat Pós-Resumo — CONCLUÍDA
Após gerar o resumo, o usuário pode conversar sobre o conteúdo da página.
- [x] `ChatService` com suporte a Gemini, OpenAI e Anthropic — histórico de conversa passado a cada chamada
- [x] `Api::ChatController` com `POST /api/chat` — autenticado, usa mesma conexão do resumo
- [x] UI de chat no popup — bolhas de mensagem, input, scroll automático
- [x] Histórico em memória JS — cresce a cada troca, some ao fechar (Fase 4 persiste)

### Fase 4 — Persistência de Estado
Fechar a extensão não perde o resumo nem o chat.
- Ao reabrir o popup: buscar último estado da sessão via GET autenticado.
- Resumo e conversa salvos na conta do usuário.

### Fase 5 — Limite de Uso e Histórico
- Lógica de limitação usando `free_summaries_count` e `last_summary_date` (já no schema).
- Endpoint `GET /api/summaries` para histórico de resumos.

### Fase 6 — Monetização (SaaS)
- Planos Gratuito/Pro com Stripe.
- Landing page do produto.

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

---

## 🧑‍💻 PERFIL DO DESENVOLVEDOR — Para a IA assistente

> Esta seção foi escrita com base em observações das sessões reais. Leia antes de começar qualquer sessão.

### O que ele já domina
- Lógica de programação geral (condicionais, loops, funções, etc.)
- Conceitos de Model e Service no Rails — entende que service é a quebra do model para organização
- Fluxo geral de uma API (request → controller → model → response)
- JavaScript e a estrutura da extensão do Chrome

### O que ele ainda está aprendendo
- **Sintaxe Ruby** — esta é a principal lacuna. Ele entende a lógica mas não conhece o idioma.
  - Símbolos (`:api`, `:index`) — o que é o `:` na frente
  - Blocos `do...end` — o que são e por que existem
  - Encadeamento de métodos com `.` (ex: `Rails.application.routes.draw`)
  - Safe navigation operator `&.`
  - `self.` em métodos de classe vs métodos de instância
  - `unless` como alternativa ao `if`
  - Retorno implícito (última linha do método)
  - Herança com `<` e o que ela confere à classe filha
- **Controller** — entendeu na sessão de 2026-05-26, mas é conceito novo
- **View** — entendeu que em API mode raramente usa arquivo de view separado (`render json:` no controller)

### Como ele aprende melhor
- Perguntas conceituais curtas no meio da implementação ("o que é X nessa linha?")
- Prefere entender o código em si, não só a lógica por trás
- Responde bem quando você explica linha por linha
- Quando erra, consegue chegar à resposta com uma dica ("olha a linha X do arquivo Y")
- Exemplo real: ao ver o erro `undefined method 'ai_connections'`, com a dica "olha o has_one no user.rb" ele mesmo concluiu "é por causa que tá no plural?"

### Ritmo da sessão
- Ele pergunta muito durante a implementação — isso é positivo, não é atraso
- Às vezes fecha a conversa sem querer e precisa retomar — sempre verifique o estado atual do código antes de assumir onde parou
- Gosta de commitar ao final de cada etapa coesa, com o README_CONTEXT.md atualizado

### Analogias já estabelecidas (continue usando)

| Conceito Técnico | Analogia |
|---|---|
| Controller | Garçom (recebe o pedido e entrega o resultado) |
| Service | Cozinha (onde o trabalho pesado acontece) |
| CORS | Segurança na porta do restaurante |
| `fetch` no JS | Motoboy que leva e traz a encomenda |
| `routes` | Caderno de endereços |
| Classe do model | Formulário que representa uma planilha (tabela) no banco |
| Token de sessão | Crachá de acesso gerado após login |

require 'net/http'
require 'uri'
require 'json'

class ChatService
  def initialize(message, page_context, history, provider: 'gemini', api_key: ENV['GEMINI_API_KEY'])
    @message      = message
    @page_context = page_context
    @history      = history
    @provider     = provider
    @api_key      = api_key
  end

  def call
    case @provider
    when 'gemini'    then call_gemini
    when 'openai'    then call_openai
    when 'anthropic' then call_anthropic
    else "Provider '#{@provider}' não suportado."
    end
  rescue StandardError => e
    "Erro ao processar mensagem: #{e.message}"
  end

  private

  def system_prompt
    "Você é um assistente inteligente. O usuário acabou de ler a seguinte página web e quer conversar sobre o conteúdo. Responda apenas com base no conteúdo fornecido.\n\n---\n\n#{@page_context}"
  end

  def call_gemini
    url = URI("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=#{@api_key}")

    # Gemini monta o histórico como array de "turns" com role "user" e "model"
    contents = [{ role: "user", parts: [{ text: system_prompt }] },
                { role: "model", parts: [{ text: "Entendido. Estou pronto para responder sobre o conteúdo da página." }] }]

    @history.each do |msg|
      gemini_role = msg["role"] == "assistant" ? "model" : "user"
      contents << { role: gemini_role, parts: [{ text: msg["content"] }] }
    end

    contents << { role: "user", parts: [{ text: @message }] }

    body = { contents: contents }
    response = post_json(url, { "Content-Type" => "application/json" }, body)
    data = JSON.parse(response.body)
    data.dig("candidates", 0, "content", "parts", 0, "text")
  end

  def call_openai
    url = URI("https://api.openai.com/v1/chat/completions")

    messages = [{ role: "system", content: system_prompt }]

    @history.each do |msg|
      messages << { role: msg["role"], content: msg["content"] }
    end

    messages << { role: "user", content: @message }

    body = { model: "gpt-4o-mini", messages: messages }
    response = post_json(url, {
      "Content-Type" => "application/json",
      "Authorization" => "Bearer #{@api_key}"
    }, body)
    data = JSON.parse(response.body)
    data.dig("choices", 0, "message", "content")
  end

  def call_anthropic
    url = URI("https://api.anthropic.com/v1/messages")

    messages = []
    @history.each do |msg|
      messages << { role: msg["role"], content: msg["content"] }
    end
    messages << { role: "user", content: @message }

    body = {
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: system_prompt,
      messages: messages
    }
    response = post_json(url, {
      "Content-Type" => "application/json",
      "x-api-key" => @api_key,
      "anthropic-version" => "2023-06-01"
    }, body)
    data = JSON.parse(response.body)
    data.dig("content", 0, "text")
  end

  def post_json(url, headers, body)
    http = Net::HTTP.new(url.host, url.port)
    http.use_ssl = true
    request = Net::HTTP::Post.new(url.request_uri, headers)
    request.body = body.to_json
    http.request(request)
  end
end

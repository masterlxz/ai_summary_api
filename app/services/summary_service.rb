require 'net/http'
require 'uri'
require 'json'

class SummaryService
  def initialize(text, mode, provider: 'gemini', api_key: ENV['GEMINI_API_KEY'])
    @text = text
    @mode = mode
    @provider = provider
    @api_key = api_key
  end

  def call
    prompt = build_prompt
    case @provider
    when 'gemini'    then call_gemini(prompt)
    when 'openai'    then call_openai(prompt)
    when 'anthropic' then call_anthropic(prompt)
    else "Provider '#{@provider}' não suportado."
    end
  rescue StandardError => e
    "Erro ao gerar resumo: #{e.message}"
  end

  private

  def call_gemini(prompt)
    url = URI("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=#{@api_key}")
    body = {
      contents: [{ parts: [{ text: "INSTRUÇÃO:\n#{prompt}\n\nTEXTO PARA PROCESSAR:\n#{@text}" }] }]
    }
    response = post_json(url, { "Content-Type" => "application/json" }, body)
    data = JSON.parse(response.body)
    data.dig("candidates", 0, "content", "parts", 0, "text")
  end

  def call_openai(prompt)
    url = URI("https://api.openai.com/v1/chat/completions")
    body = {
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: "INSTRUÇÃO:\n#{prompt}\n\nTEXTO PARA PROCESSAR:\n#{@text}" }]
    }
    response = post_json(url, {
      "Content-Type" => "application/json",
      "Authorization" => "Bearer #{@api_key}"
    }, body)
    data = JSON.parse(response.body)
    data.dig("choices", 0, "message", "content")
  end

  def call_anthropic(prompt)
    url = URI("https://api.anthropic.com/v1/messages")
    body = {
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      messages: [{ role: "user", content: "INSTRUÇÃO:\n#{prompt}\n\nTEXTO PARA PROCESSAR:\n#{@text}" }]
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

  def build_prompt
    if @mode == 'explicacao_detalhada'
      "Você é um professor especialista. O usuário vai te mandar um trecho de um texto. Explique esse trecho de forma detalhada, clara e didática, como se estivesse ensinando um aluno."
    else
      "Você é um assistente especialista em produtividade. O usuário vai te mandar o texto de uma página da web. Extraia os pontos mais importantes e retorne um resumo direto e estruturado."
    end
  end
end

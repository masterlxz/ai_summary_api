require 'net/http'
require 'uri'
require 'json'

class SummaryService
    def initialize(text, mode)
        @text = text
        @mode = mode
    end

    def call
        prompt = build_prompt
        api_key = ENV['GEMINI_API_KEY']
        
        # 1. O endereço oficial dos servidores do Google
    url = URI("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=#{api_key}")

    # 2. Preparando a nossa conexão de internet
    http = Net::HTTP.new(url.host, url.port)
    http.use_ssl = true

    # 3. COLANDO A ETIQUETA DIRETO NA CRIAÇÃO DA CARTA (A correção está aqui!)
    request = Net::HTTP::Post.new(url.request_uri, { "Content-Type" => "application/json" })
    
    # 4. O Pacote JSON
    request.body = {
      contents: [{
        parts: [{ text: "INSTRUÇÃO:\n#{prompt}\n\nTEXTO PARA PROCESSAR:\n#{@text}" }]
      }]
    }.to_json

    # 5. Enviando a carta e esperando o Google responder
    response = http.request(request)

        # --- ADICIONE ESTAS 3 LINHAS AQUI ---
        puts "====== RESPOSTA DO GOOGLE ======"
        puts response.body
        puts "================================"
        # ------------------------------------
        
        # 5. Transformando a resposta de volta em algo que o Ruby entende
        data = JSON.parse(response.body)

        # 6. A nossa velha amiga "pá" cavando o resumo no meio da bagunça do Google!
        data.dig("candidates", 0, "content", "parts", 0, "text")
    rescue StandardError => e
        "Erro ao conectar com o Gemini: #{e.message}"
    end

    private

    def build_prompt
        if @mode == 'explicacao_detalhada'
            "Você é um professor especialista. O usuário vai te mandar um trecho de um texto. Explique esse trecho de forma detalhada, clara e didática, como se estivesse ensinando um aluno."
        else
            "Você é um assistente especialista em produtividade. O usuário vai te mandar o texto de uma página da web. Extraia os pontos mais importantes e retorne um resumo direto e estruturado."
        end
    end
end
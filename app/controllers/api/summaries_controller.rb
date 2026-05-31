class Api::SummariesController < ApplicationController
  before_action :authenticate_user!

  FREE_DAILY_LIMIT = 5

  def create
    texto_recebido = params[:text]
    modo = params[:mode] || 'resumo_direto'

    if texto_recebido.blank?
      render json: { error: "Nenhum texto foi enviado" }, status: :bad_request
      return
    end

    provider, api_key, free_remaining, connection_id = resolve_credentials
    return if performed?

    service = SummaryService.new(texto_recebido, modo, provider: provider, api_key: api_key)
    resultado = service.call

    if resultado
      summary = current_user.summaries.create!(
        summary_text: resultado,
        page_context: texto_recebido,
        ai_connection_id: connection_id,
        page_url: params[:page_url]
      )
      render json: { summary: resultado, summary_id: summary.id, free_summaries_remaining: free_remaining }, status: :ok
    else
      render json: { error: "Falha ao gerar resumo" }, status: :unprocessable_entity
    end
  end

  def index
    summaries = current_user.summaries
                             .order(created_at: :desc)
                             .limit(15)
                             .select(:id, :summary_text, :page_url, :created_at)

    render json: { summaries: summaries.map { |s|
      {
        id:           s.id,
        summary_text: s.summary_text.truncate(120),
        page_url:     s.page_url,
        created_at:   s.created_at
      }
    }}, status: :ok
  end

  def show
    summary = current_user.summaries.find_by(id: params[:id])

    if summary
      render json: {
        summary_id:       summary.id,
        summary_text:     summary.summary_text,
        page_context:     summary.page_context,
        chat_history:     summary.chat_history,
        ai_connection_id: summary.ai_connection_id
      }, status: :ok
    else
      render json: { error: "Resumo não encontrado" }, status: :not_found
    end
  end

  def latest
    summary = current_user.summaries.order(created_at: :desc).first

    if summary
      render json: {
        summary_id:   summary.id,
        summary_text: summary.summary_text,
        page_context: summary.page_context,
        chat_history: summary.chat_history,
        ai_connection_id: summary.ai_connection_id
      }, status: :ok
    else
      render json: { summary: nil }, status: :ok
    end
  end

  private

  def resolve_credentials
    connection_id = params[:ai_connection_id]

    if connection_id.present?
      connection = current_user.ai_connections.find_by(id: connection_id)
      return render(json: { error: "Conexão não encontrada" }, status: :not_found) unless connection
      [connection.provider, connection.api_key, nil, connection.id]
    else
      check_free_limit
    end
  end

  def check_free_limit
    user = current_user

    if user.last_summary_date != Date.today
      user.update!(free_summaries_count: FREE_DAILY_LIMIT, last_summary_date: Date.today)
    end

    if user.free_summaries_count <= 0
      render json: { error: "Limite diário de resumos gratuitos atingido. Cadastre uma conexão AI para continuar." }, status: :too_many_requests
      return
    end

    user.decrement!(:free_summaries_count)
    ['gemini', ENV['GEMINI_API_KEY'], user.free_summaries_count, nil]
  end
end
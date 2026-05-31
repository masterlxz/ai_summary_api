class Api::ChatController < ApplicationController
  before_action :authenticate_user!

  def create
    message      = params[:message]
    page_context = params[:page_context]
    history      = params[:history] || []

    if message.blank?
      render json: { error: "Mensagem não pode estar vazia" }, status: :bad_request
      return
    end

    if page_context.blank?
      render json: { error: "Contexto da página não foi enviado" }, status: :bad_request
      return
    end

    provider, api_key = resolve_credentials
    return if performed?

    service = ChatService.new(message, page_context, history, provider: provider, api_key: api_key)
    reply = service.call

    if reply
      render json: { reply: reply }, status: :ok
    else
      render json: { error: "Falha ao processar mensagem" }, status: :unprocessable_entity
    end
  end

  private

  def resolve_credentials
    connection_id = params[:ai_connection_id]

    if connection_id.present?
      connection = current_user.ai_connections.find_by(id: connection_id)
      return render(json: { error: "Conexão não encontrada" }, status: :not_found) unless connection
      [connection.provider, connection.api_key]
    else
      ['gemini', ENV['GEMINI_API_KEY']]
    end
  end
end

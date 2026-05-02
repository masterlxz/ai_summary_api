class Api::SummariesController < ApplicationController
  def create
    texto_recebido = params[:text]
    modo = params[:mode] || 'resumo_direto'

    if texto_recebido.blank?
      render json: { error: "Nenhum texto foi enviado" }, status: :bad_request
      return
    end

    service = SummaryService.new(texto_recebido, modo)
    resultado = service.call

    if resultado
      render json: { summary: resultado }, status: :ok
    else
      render json: { error: "Falha ao gerar resumo" }, status: :unprocessable_entity
    end
  end
end
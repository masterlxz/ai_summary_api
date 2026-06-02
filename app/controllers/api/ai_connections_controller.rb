class Api::AiConnectionsController < ApplicationController
  before_action :authenticate_user!

  def index
    connections = current_user.ai_connections.select(:id, :name, :provider)
    render json: connections, status: :ok
  end

  def create
    connection = current_user.ai_connections.build(connection_params)

    if connection.save
      render json: connection, status: :created
    else
      render json: { errors: connection.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def update
    connection = current_user.ai_connections.find(params[:id])

    if connection.update(connection_params)
      render json: connection, status: :ok
    else
      render json: { errors: connection.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def destroy
    connection = current_user.ai_connections.find(params[:id])
    connection.destroy
    render json: { message: "Conexão removida" }, status: :ok
  end

  private

  def connection_params
    params.require(:ai_connection).permit(:name, :provider, :api_key)
  end
end

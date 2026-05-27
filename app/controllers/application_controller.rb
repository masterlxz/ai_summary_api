class ApplicationController < ActionController::API
  private

  def authenticate_user!
    token = request.headers["Authorization"]&.split(" ")&.last

    @current_user = User.find_by(auth_token: token)

    unless @current_user
      render json: { error: "Não autorizado" }, status: :unauthorized
    end
  end

  def current_user
    @current_user
  end
end

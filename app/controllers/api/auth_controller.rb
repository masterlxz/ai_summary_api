require 'net/http'
require 'uri'
require 'json'

class Api::AuthController < ApplicationController
  def google
    token = params[:token]

    if token.blank?
      render json: { error: "Token não enviado" }, status: :bad_request
      return
    end

    google_info = fetch_google_user_info(token)

    if google_info.nil?
      render json: { error: "Token do Google inválido" }, status: :unauthorized
      return
    end

    user = User.find_or_create_from_google(google_info)
    user.generate_auth_token!

    render json: { token: user.auth_token, name: user.name }, status: :ok
  rescue StandardError => e
    render json: { error: "Erro ao autenticar: #{e.message}" }, status: :internal_server_error
  end

  private

  def fetch_google_user_info(token)
    url = URI("https://www.googleapis.com/oauth2/v2/userinfo")
    http = Net::HTTP.new(url.host, url.port)
    http.use_ssl = true

    request = Net::HTTP::Get.new(url.request_uri)
    request["Authorization"] = "Bearer #{token}"

    response = http.request(request)
    return nil unless response.is_a?(Net::HTTPSuccess)

    data = JSON.parse(response.body)

    {
      google_uid: data["id"],
      email:      data["email"],
      name:       data["name"]
    }
  end
end

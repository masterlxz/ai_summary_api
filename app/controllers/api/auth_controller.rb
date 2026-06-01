require 'net/http'
require 'uri'
require 'json'

class Api::AuthController < ApplicationController
  def logout
    authenticate_user!
    return if performed?

    current_user.update!(auth_token: nil)
    render json: { message: "Logout realizado com sucesso" }, status: :ok
  end

  def google
    code         = params[:code]
    code_verifier = params[:code_verifier]
    redirect_uri  = params[:redirect_uri]

    if code.blank? || code_verifier.blank? || redirect_uri.blank?
      render json: { error: "Parâmetros incompletos" }, status: :bad_request
      return
    end

    access_token = exchange_code_for_token(code, code_verifier, redirect_uri)

    if access_token.nil?
      render json: { error: "Falha ao trocar o código pelo token" }, status: :unauthorized
      return
    end

    google_info = fetch_google_user_info(access_token)

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

  def exchange_code_for_token(code, code_verifier, redirect_uri)
    url  = URI("https://oauth2.googleapis.com/token")
    http = Net::HTTP.new(url.host, url.port)
    http.use_ssl = true

    request = Net::HTTP::Post.new(url.request_uri)
    request["Content-Type"] = "application/x-www-form-urlencoded"
    request.body = URI.encode_www_form(
      code:          code,
      code_verifier: code_verifier,
      client_id:     ENV["GOOGLE_CLIENT_ID"],
      client_secret: ENV["GOOGLE_CLIENT_SECRET"],
      redirect_uri:  redirect_uri,
      grant_type:    "authorization_code"
    )

    response = http.request(request)
    return nil unless response.is_a?(Net::HTTPSuccess)

    JSON.parse(response.body)["access_token"]
  end

  def fetch_google_user_info(access_token)
    url  = URI("https://www.googleapis.com/oauth2/v2/userinfo")
    http = Net::HTTP.new(url.host, url.port)
    http.use_ssl = true

    request = Net::HTTP::Get.new(url.request_uri)
    request["Authorization"] = "Bearer #{access_token}"

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

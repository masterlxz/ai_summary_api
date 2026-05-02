Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    origins '*' # O asterisco significa: "Pode aceitar pedidos de qualquer lugar" (ideal para testes)
    resource '*',
      headers: :any,
      methods: [:post, :options]
  end
end
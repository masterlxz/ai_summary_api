Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    origins ENV.fetch('ALLOWED_ORIGIN', '*') # Em produção, defina ALLOWED_ORIGIN com o domínio real
    resource '*',
      headers: :any,
      methods: [:post, :options]
  end
end
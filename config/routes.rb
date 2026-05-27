Rails.application.routes.draw do
    namespace :api do
        post 'summarize', to: 'summaries#create'

        post 'auth/google', to: 'auth#google'

        resources :ai_connections, only: [:index, :create, :update, :destroy]
    end
end
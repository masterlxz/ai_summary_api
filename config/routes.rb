Rails.application.routes.draw do
    namespace :api do
        post 'summarize', to: 'summaries#create'
        get  'summaries/latest', to: 'summaries#latest'

        post 'auth/google', to: 'auth#google'

        resources :ai_connections, only: [:index, :create, :update, :destroy]

        get 'me', to: 'users#me'

        post 'chat', to: 'chat#create'
    end
end
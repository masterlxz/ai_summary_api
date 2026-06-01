Rails.application.routes.draw do
    namespace :api do
        post 'summarize', to: 'summaries#create'
        get  'summaries/latest', to: 'summaries#latest'
        get  'summaries',        to: 'summaries#index'
        get  'summaries/:id',    to: 'summaries#show'

        post   'auth/google',   to: 'auth#google'
        delete 'auth/session',  to: 'auth#logout'

        resources :ai_connections, only: [:index, :create, :update, :destroy]

        get 'me', to: 'users#me'

        post 'chat', to: 'chat#create'
    end
end
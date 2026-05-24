Rails.application.routes.draw do
    namespace :api do
        post 'summarize', to: 'summaries#create'

        post 'auth/google', to: 'auth#google'
    end
end
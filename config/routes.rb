Rails.application.routes.draw do
    namespace :api do
        post 'summarize', to: 'summaries#create'

        namespace :auth do
            post 'google', to: 'auth#google'
        end
    end
end
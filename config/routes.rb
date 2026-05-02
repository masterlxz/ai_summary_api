Rails.application.routes.draw do
    namespace :api do
        post 'summarize', to: 'summaries#create'
    end
end
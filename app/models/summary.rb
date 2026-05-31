class Summary < ApplicationRecord
  belongs_to :user
  belongs_to :ai_connection, optional: true
end

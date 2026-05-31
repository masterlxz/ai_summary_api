class User < ApplicationRecord
  devise :database_authenticatable, :registerable,
         :recoverable, :rememberable, :validatable

  has_many :ai_connections
  has_many :summaries

  def self.find_or_create_from_google(google_info)
    user = find_by(google_uid: google_info[:google_uid])

    unless user
      user = create!(
        google_uid: google_info[:google_uid],
        email:      google_info[:email],
        name:       google_info[:name],
        password:   SecureRandom.hex(16)
      )
    end

    user
  end

  def generate_auth_token!
    update!(auth_token: SecureRandom.hex(32))
  end
end
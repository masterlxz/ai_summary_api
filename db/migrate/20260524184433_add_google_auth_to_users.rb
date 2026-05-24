class AddGoogleAuthToUsers < ActiveRecord::Migration[7.2]
  def change
    add_column :users, :google_uid, :string
    add_column :users, :auth_token, :string
    add_column :users, :name, :string
    add_index :users, :google_uid, unique: true
    add_index :users, :auth_token, unique: true
  end
end

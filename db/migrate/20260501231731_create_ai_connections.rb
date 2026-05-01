class CreateAiConnections < ActiveRecord::Migration[7.2]
  def change
    create_table :ai_connections do |t|
      t.references :user, null: false, foreign_key: true
      t.string :provider
      t.string :api_key

      t.timestamps
    end
  end
end

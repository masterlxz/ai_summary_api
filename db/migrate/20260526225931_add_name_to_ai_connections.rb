class AddNameToAiConnections < ActiveRecord::Migration[7.2]
  def change
    add_column :ai_connections, :name, :string
  end
end

class CreateSummaries < ActiveRecord::Migration[7.2]
  def change
    create_table :summaries do |t|
      t.references :user, null: false, foreign_key: true
      t.text :summary_text
      t.text :page_context
      t.bigint :ai_connection_id
      t.string :page_url
      t.jsonb :chat_history, default: []

      t.timestamps
    end
  end
end

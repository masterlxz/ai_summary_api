class Api::UsersController < ApplicationController
  before_action :authenticate_user!

  def me
    remaining = if current_user.last_summary_date == Date.today
      current_user.free_summaries_count
    else
      Api::SummariesController::FREE_DAILY_LIMIT
    end

    render json: { name: current_user.name, free_summaries_remaining: remaining }
  end
end

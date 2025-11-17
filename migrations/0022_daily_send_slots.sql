CREATE TABLE daily_send_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slot_date DATE NOT NULL,
    slot_time_utc TIMESTAMP WITH TIME ZONE NOT NULL,
    filled BOOLEAN NOT NULL DEFAULT FALSE,
    recipient_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Required indexes:
CREATE INDEX idx_slots_by_date ON daily_send_slots(slot_date);
CREATE INDEX idx_slots_open ON daily_send_slots(slot_date, filled);

-- Create holidays table
CREATE TABLE IF NOT EXISTS holidays (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    date DATE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_recurring BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for date queries
CREATE INDEX IF NOT EXISTS idx_holidays_date ON holidays(date);
CREATE INDEX IF NOT EXISTS idx_holidays_recurring ON holidays(is_recurring);
CREATE INDEX IF NOT EXISTS idx_holidays_active ON holidays(is_active);

-- Enable RLS
ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;

-- RLS Policies for holidays
CREATE POLICY "Users can view all active holidays" ON holidays
    FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage holidays" ON holidays
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_holidays_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_holidays_updated_at_trigger
    BEFORE UPDATE ON holidays
    FOR EACH ROW
    EXECUTE FUNCTION update_holidays_updated_at();

-- Insert default UAE holidays
INSERT INTO holidays (date, name, description, is_recurring, created_by) VALUES
    ('2024-01-01', 'New Year Day', 'New Year celebration', true, (SELECT id FROM users WHERE role = 'admin' LIMIT 1)),
    ('2024-03-11', 'Ramadan Begins', 'Start of Ramadan month', false, (SELECT id FROM users WHERE role = 'admin' LIMIT 1)),
    ('2024-04-10', 'Eid al-Fitr', 'End of Ramadan celebration', false, (SELECT id FROM users WHERE role = 'admin' LIMIT 1)),
    ('2024-06-16', 'Eid al-Adha', 'Festival of Sacrifice', false, (SELECT id FROM users WHERE role = 'admin' LIMIT 1)),
    ('2024-07-07', 'Islamic New Year', 'Hijri New Year', true, (SELECT id FROM users WHERE role = 'admin' LIMIT 1)),
    ('2024-07-15', 'Prophet Muhammad Birthday', 'Prophet Muhammad birthday celebration', true, (SELECT id FROM users WHERE role = 'admin' LIMIT 1)),
    ('2024-12-02', 'UAE National Day', 'United Arab Emirates National Day', true, (SELECT id FROM users WHERE role = 'admin' LIMIT 1)),
    ('2024-12-25', 'Christmas Day', 'Christmas celebration', true, (SELECT id FROM users WHERE role = 'admin' LIMIT 1))
ON CONFLICT DO NOTHING;


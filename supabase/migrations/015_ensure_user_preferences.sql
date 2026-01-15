-- Create user_preferences table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    lean_mode BOOLEAN DEFAULT false,
    dark_mode BOOLEAN DEFAULT true,
    audio_volume FLOAT DEFAULT 0.8,
    hide_donation_prompts BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Enable RLS if not already enabled
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_preferences' 
        AND policyname = 'Users can manage own preferences'
    ) THEN
        ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY "Users can manage own preferences" ON user_preferences
            FOR ALL USING (auth.uid() = user_id);
    END IF;
END $$;

-- Create donations table if it doesn't exist
CREATE TABLE IF NOT EXISTS donations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    amount DECIMAL(10, 2),
    currency VARCHAR(10) DEFAULT 'USD',
    status VARCHAR(20) DEFAULT 'pending',
    transaction_id VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    verified_at TIMESTAMP WITH TIME ZONE,
    verified_by UUID REFERENCES auth.users(id)
);

-- Enable RLS for donations
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'donations'
    ) THEN
        ALTER TABLE donations ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY "Users can see own donations" ON donations
            FOR SELECT USING (auth.uid() = user_id);
        
        CREATE POLICY "Admins can manage all donations" ON donations
            FOR ALL USING (
                EXISTS (
                    SELECT 1 FROM user_roles 
                    WHERE user_id = auth.uid() AND role = 'admin'
                )
            );
    END IF;
END $$;

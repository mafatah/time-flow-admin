-- DeepSeek AI Analysis System Database Schema
-- This schema supports comprehensive AI-powered employee monitoring and productivity analysis

-- Table: ai_screenshot_analysis
-- Stores AI analysis results for individual screenshots
CREATE TABLE IF NOT EXISTS ai_screenshot_analysis (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    screenshot_id UUID NOT NULL REFERENCES screenshots(id) ON DELETE CASCADE,
    is_working BOOLEAN NOT NULL DEFAULT false,
    working_score INTEGER NOT NULL DEFAULT 0 CHECK (working_score >= 0 AND working_score <= 100),
    working_reason TEXT,
    detected_activity TEXT,
    productivity_level TEXT CHECK (productivity_level IN ('high', 'medium', 'low', 'none')),
    categories TEXT[] DEFAULT '{}',
    concerns TEXT[] DEFAULT '{}',
    recommendations TEXT[] DEFAULT '{}',
    confidence INTEGER NOT NULL DEFAULT 0 CHECK (confidence >= 0 AND confidence <= 100),
    visual_elements TEXT[] DEFAULT '{}',
    text_detected TEXT,
    applications_identified TEXT[] DEFAULT '{}',
    suspicious_indicators TEXT[] DEFAULT '{}',
    analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: ai_url_analysis
-- Stores AI analysis results for URL visits
CREATE TABLE IF NOT EXISTS ai_url_analysis (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    url_log_id UUID NOT NULL REFERENCES url_logs(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    domain TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'unknown',
    work_related BOOLEAN NOT NULL DEFAULT false,
    productivity_score INTEGER NOT NULL DEFAULT 0 CHECK (productivity_score >= 0 AND productivity_score <= 100),
    risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high')) DEFAULT 'low',
    analysis TEXT,
    analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: ai_app_analysis
-- Stores AI analysis results for application usage
CREATE TABLE IF NOT EXISTS ai_app_analysis (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    app_log_id UUID NOT NULL REFERENCES app_logs(id) ON DELETE CASCADE,
    app_name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'unknown',
    work_related BOOLEAN NOT NULL DEFAULT false,
    productivity_score INTEGER NOT NULL DEFAULT 0 CHECK (productivity_score >= 0 AND productivity_score <= 100),
    usage_pattern TEXT DEFAULT 'normal',
    analysis TEXT,
    analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: ai_daily_reports
-- Stores comprehensive daily AI analysis reports for employees
CREATE TABLE IF NOT EXISTS ai_daily_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    overall_productivity_score INTEGER NOT NULL DEFAULT 0 CHECK (overall_productivity_score >= 0 AND overall_productivity_score <= 100),
    working_hours DECIMAL(4,2) NOT NULL DEFAULT 0.00,
    distraction_time DECIMAL(4,2) NOT NULL DEFAULT 0.00,
    focus_periods INTEGER NOT NULL DEFAULT 0,
    top_distractions TEXT[] DEFAULT '{}',
    productivity_trend TEXT CHECK (productivity_trend IN ('improving', 'stable', 'declining')) DEFAULT 'stable',
    key_insights TEXT[] DEFAULT '{}',
    recommendations TEXT[] DEFAULT '{}',
    detailed_analysis TEXT,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, date)
);

-- Table: ai_analysis_config
-- Stores AI analysis configuration and settings
CREATE TABLE IF NOT EXISTS ai_analysis_config (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    config_key TEXT NOT NULL UNIQUE,
    config_value JSONB NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_ai_screenshot_analysis_screenshot_id ON ai_screenshot_analysis(screenshot_id);
CREATE INDEX IF NOT EXISTS idx_ai_screenshot_analysis_analyzed_at ON ai_screenshot_analysis(analyzed_at);
CREATE INDEX IF NOT EXISTS idx_ai_screenshot_analysis_working_score ON ai_screenshot_analysis(working_score);
CREATE INDEX IF NOT EXISTS idx_ai_screenshot_analysis_productivity_level ON ai_screenshot_analysis(productivity_level);

CREATE INDEX IF NOT EXISTS idx_ai_url_analysis_url_log_id ON ai_url_analysis(url_log_id);
CREATE INDEX IF NOT EXISTS idx_ai_url_analysis_analyzed_at ON ai_url_analysis(analyzed_at);
CREATE INDEX IF NOT EXISTS idx_ai_url_analysis_domain ON ai_url_analysis(domain);
CREATE INDEX IF NOT EXISTS idx_ai_url_analysis_work_related ON ai_url_analysis(work_related);
CREATE INDEX IF NOT EXISTS idx_ai_url_analysis_risk_level ON ai_url_analysis(risk_level);

CREATE INDEX IF NOT EXISTS idx_ai_app_analysis_app_log_id ON ai_app_analysis(app_log_id);
CREATE INDEX IF NOT EXISTS idx_ai_app_analysis_analyzed_at ON ai_app_analysis(analyzed_at);
CREATE INDEX IF NOT EXISTS idx_ai_app_analysis_app_name ON ai_app_analysis(app_name);
CREATE INDEX IF NOT EXISTS idx_ai_app_analysis_work_related ON ai_app_analysis(work_related);

CREATE INDEX IF NOT EXISTS idx_ai_daily_reports_user_id ON ai_daily_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_daily_reports_date ON ai_daily_reports(date);
CREATE INDEX IF NOT EXISTS idx_ai_daily_reports_productivity_score ON ai_daily_reports(overall_productivity_score);
CREATE INDEX IF NOT EXISTS idx_ai_daily_reports_generated_at ON ai_daily_reports(generated_at);

-- Row Level Security (RLS) Policies
ALTER TABLE ai_screenshot_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_url_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_app_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_daily_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_analysis_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ai_screenshot_analysis
CREATE POLICY "Admin can view all screenshot analysis" ON ai_screenshot_analysis
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'manager')
        )
    );

CREATE POLICY "Users can view their own screenshot analysis" ON ai_screenshot_analysis
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM screenshots 
            WHERE screenshots.id = ai_screenshot_analysis.screenshot_id 
            AND screenshots.user_id = auth.uid()
        )
    );

CREATE POLICY "Admin can insert screenshot analysis" ON ai_screenshot_analysis
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'manager')
        )
    );

-- RLS Policies for ai_url_analysis
CREATE POLICY "Admin can view all url analysis" ON ai_url_analysis
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'manager')
        )
    );

CREATE POLICY "Users can view their own url analysis" ON ai_url_analysis
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM url_logs 
            WHERE url_logs.id = ai_url_analysis.url_log_id 
            AND url_logs.user_id = auth.uid()
        )
    );

CREATE POLICY "Admin can insert url analysis" ON ai_url_analysis
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'manager')
        )
    );

-- RLS Policies for ai_app_analysis
CREATE POLICY "Admin can view all app analysis" ON ai_app_analysis
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'manager')
        )
    );

CREATE POLICY "Users can view their own app analysis" ON ai_app_analysis
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM app_logs 
            WHERE app_logs.id = ai_app_analysis.app_log_id 
            AND app_logs.user_id = auth.uid()
        )
    );

CREATE POLICY "Admin can insert app analysis" ON ai_app_analysis
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'manager')
        )
    );

-- RLS Policies for ai_daily_reports
CREATE POLICY "Admin can view all daily reports" ON ai_daily_reports
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'manager')
        )
    );

CREATE POLICY "Users can view their own daily reports" ON ai_daily_reports
    FOR SELECT TO authenticated
    USING (ai_daily_reports.user_id = auth.uid());

CREATE POLICY "Admin can insert daily reports" ON ai_daily_reports
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'manager')
        )
    );

CREATE POLICY "Admin can update daily reports" ON ai_daily_reports
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'manager')
        )
    );

-- RLS Policies for ai_analysis_config
CREATE POLICY "Admin can manage analysis config" ON ai_analysis_config
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'manager')
        )
    );

-- Functions for automated analysis triggers
CREATE OR REPLACE FUNCTION update_ai_analysis_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update timestamp triggers
CREATE TRIGGER update_ai_screenshot_analysis_timestamp
    BEFORE UPDATE ON ai_screenshot_analysis
    FOR EACH ROW
    EXECUTE FUNCTION update_ai_analysis_timestamp();

CREATE TRIGGER update_ai_url_analysis_timestamp
    BEFORE UPDATE ON ai_url_analysis
    FOR EACH ROW
    EXECUTE FUNCTION update_ai_analysis_timestamp();

CREATE TRIGGER update_ai_app_analysis_timestamp
    BEFORE UPDATE ON ai_app_analysis
    FOR EACH ROW
    EXECUTE FUNCTION update_ai_analysis_timestamp();

CREATE TRIGGER update_ai_daily_reports_timestamp
    BEFORE UPDATE ON ai_daily_reports
    FOR EACH ROW
    EXECUTE FUNCTION update_ai_analysis_timestamp();

CREATE TRIGGER update_ai_analysis_config_timestamp
    BEFORE UPDATE ON ai_analysis_config
    FOR EACH ROW
    EXECUTE FUNCTION update_ai_analysis_timestamp();

-- Insert default AI analysis configuration
INSERT INTO ai_analysis_config (config_key, config_value, description) VALUES
('deepseek_api_settings', '{"api_key": "", "base_url": "https://api.deepseek.com", "model_screenshot": "deepseek-vl-7b-chat", "model_text": "deepseek-chat", "timeout": 30000}', 'DeepSeek API configuration'),
('analysis_thresholds', '{"low_productivity": 30, "high_confidence": 80, "distraction_hours": 2, "working_hours_expected": 8}', 'Analysis threshold settings'),
('monitoring_settings', '{"work_hours_start": 9, "work_hours_end": 17, "enable_real_time": true, "screenshot_analysis_enabled": true, "url_analysis_enabled": true, "app_analysis_enabled": true}', 'Monitoring configuration'),
('notification_settings', '{"enable_alerts": true, "alert_low_productivity": true, "alert_suspicious_activity": true, "alert_distractions": true, "alert_daily_reports": true}', 'Notification configuration')
ON CONFLICT (config_key) DO NOTHING;

-- Views for easy data access
CREATE OR REPLACE VIEW ai_analysis_summary AS
SELECT 
    u.id as user_id,
    u.full_name,
    u.email,
    adr.date,
    adr.overall_productivity_score,
    adr.working_hours,
    adr.distraction_time,
    adr.focus_periods,
    adr.productivity_trend,
    COUNT(asa.id) as screenshot_analyses,
    COUNT(aua.id) as url_analyses,
    COUNT(aaa.id) as app_analyses,
    AVG(asa.working_score) as avg_screenshot_score,
    AVG(aua.productivity_score) as avg_url_score,
    AVG(aaa.productivity_score) as avg_app_score
FROM users u
LEFT JOIN ai_daily_reports adr ON u.id = adr.user_id
LEFT JOIN ai_screenshot_analysis asa ON asa.screenshot_id IN (
    SELECT id FROM screenshots WHERE user_id = u.id AND DATE(captured_at) = adr.date
)
LEFT JOIN ai_url_analysis aua ON aua.url_log_id IN (
    SELECT id FROM url_logs WHERE user_id = u.id AND DATE(timestamp) = adr.date
)
LEFT JOIN ai_app_analysis aaa ON aaa.app_log_id IN (
    SELECT id FROM app_logs WHERE user_id = u.id AND DATE(timestamp) = adr.date
)
WHERE u.role IN ('employee', 'admin', 'manager')
GROUP BY u.id, u.full_name, u.email, adr.date, adr.overall_productivity_score, 
         adr.working_hours, adr.distraction_time, adr.focus_periods, adr.productivity_trend;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON ai_screenshot_analysis TO authenticated;
GRANT SELECT, INSERT, UPDATE ON ai_url_analysis TO authenticated;
GRANT SELECT, INSERT, UPDATE ON ai_app_analysis TO authenticated;
GRANT SELECT, INSERT, UPDATE ON ai_daily_reports TO authenticated;
GRANT SELECT, INSERT, UPDATE ON ai_analysis_config TO authenticated;
GRANT SELECT ON ai_analysis_summary TO authenticated;

-- Comments for documentation
COMMENT ON TABLE ai_screenshot_analysis IS 'AI analysis results for individual screenshots using DeepSeek vision models';
COMMENT ON TABLE ai_url_analysis IS 'AI analysis results for URL visits to determine work relevance and productivity impact';
COMMENT ON TABLE ai_app_analysis IS 'AI analysis results for application usage patterns and productivity scoring';
COMMENT ON TABLE ai_daily_reports IS 'Comprehensive daily AI-generated productivity reports for employees';
COMMENT ON TABLE ai_analysis_config IS 'Configuration settings for AI analysis system including API keys and thresholds';
COMMENT ON VIEW ai_analysis_summary IS 'Aggregated view of AI analysis data for easy reporting and dashboard display';
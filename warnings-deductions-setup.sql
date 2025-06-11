-- Warnings & Deductions Setup Script
-- Run this in your Supabase SQL Editor to enable the feature

-- 1. Create employee_deductions table
CREATE TABLE IF NOT EXISTS public.employee_deductions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    month_year DATE NOT NULL,
    deduction_type TEXT NOT NULL CHECK (deduction_type IN ('late', 'absent', 'disciplinary', 'other')),
    amount DECIMAL(10,2) NOT NULL CHECK (amount >= 0),
    reason TEXT NOT NULL,
    created_by UUID REFERENCES public.users(id) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create employee_warnings table
CREATE TABLE IF NOT EXISTS public.employee_warnings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    month_year DATE NOT NULL,
    warning_type TEXT NOT NULL CHECK (warning_type IN ('below_hours', 'below_days', 'productivity_low', 'attendance_issue')),
    severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high')),
    message TEXT NOT NULL,
    required_value DECIMAL(10,2),
    actual_value DECIMAL(10,2),
    gap_percentage DECIMAL(5,2),
    is_reviewed BOOLEAN DEFAULT FALSE,
    reviewed_by UUID REFERENCES public.users(id),
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create employee_working_standards table
CREATE TABLE IF NOT EXISTS public.employee_working_standards (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    employment_type TEXT NOT NULL CHECK (employment_type IN ('monthly', 'hourly')),
    required_hours_monthly DECIMAL(10,2) DEFAULT 160,
    required_days_monthly INTEGER DEFAULT 22,
    minimum_hours_daily DECIMAL(10,2) DEFAULT 8,
    overtime_threshold DECIMAL(10,2) DEFAULT 160,
    warning_threshold_percentage DECIMAL(5,2) DEFAULT 90,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- 4. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_employee_deductions_user_month ON public.employee_deductions(user_id, month_year);
CREATE INDEX IF NOT EXISTS idx_employee_deductions_type ON public.employee_deductions(deduction_type);
CREATE INDEX IF NOT EXISTS idx_employee_warnings_user_month ON public.employee_warnings(user_id, month_year);
CREATE INDEX IF NOT EXISTS idx_employee_warnings_reviewed ON public.employee_warnings(is_reviewed);
CREATE INDEX IF NOT EXISTS idx_employee_working_standards_user ON public.employee_working_standards(user_id);

-- 5. Enable Row Level Security
ALTER TABLE public.employee_deductions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_warnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_working_standards ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS Policies for employee_deductions
CREATE POLICY "Admins can manage all deductions" ON public.employee_deductions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'manager')
        )
    );

CREATE POLICY "Employees can view own deductions" ON public.employee_deductions
    FOR SELECT USING (auth.uid() = user_id);

-- 7. Create RLS Policies for employee_warnings
CREATE POLICY "Admins can manage all warnings" ON public.employee_warnings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'manager')
        )
    );

CREATE POLICY "Employees can view own warnings" ON public.employee_warnings
    FOR SELECT USING (auth.uid() = user_id);

-- 8. Create RLS Policies for employee_working_standards
CREATE POLICY "Admins can manage working standards" ON public.employee_working_standards
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'manager')
        )
    );

CREATE POLICY "Employees can view own standards" ON public.employee_working_standards
    FOR SELECT USING (auth.uid() = user_id);

-- 9. Insert default working standards for existing employees
INSERT INTO public.employee_working_standards (user_id, employment_type, required_hours_monthly, required_days_monthly)
SELECT 
    id as user_id,
    'hourly' as employment_type,
    160 as required_hours_monthly,
    22 as required_days_monthly
FROM public.users 
WHERE role = 'employee' AND is_active = true
ON CONFLICT (user_id) DO NOTHING;

-- 10. Create sample warnings for testing (optional)
INSERT INTO public.employee_warnings (user_id, month_year, warning_type, severity, message, required_value, actual_value, gap_percentage, is_reviewed)
SELECT 
    u.id as user_id,
    DATE_TRUNC('month', CURRENT_DATE) as month_year,
    'below_hours' as warning_type,
    'medium' as severity,
    'Sample warning: Employee working below expected hours for ' || TO_CHAR(CURRENT_DATE, 'Month YYYY') as message,
    160 as required_value,
    120 as actual_value,
    25 as gap_percentage,
    false as is_reviewed
FROM public.users u 
WHERE u.role = 'employee' AND u.is_active = true
LIMIT 3; -- Only create warnings for first 3 employees as examples

-- Success message
SELECT 'Warnings & Deductions feature setup completed successfully!' as result; 
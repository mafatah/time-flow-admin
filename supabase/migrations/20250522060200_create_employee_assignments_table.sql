-- Create employee_project_assignments table for auto-assignment
CREATE TABLE IF NOT EXISTS public.employee_project_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by UUID REFERENCES public.users(id),
  is_active BOOLEAN DEFAULT TRUE,
  UNIQUE(user_id, project_id)
);

-- Enable RLS
ALTER TABLE public.employee_project_assignments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (same as users - based on role)
CREATE POLICY "Admin and managers can manage all assignments" ON public.employee_project_assignments
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'manager')
  )
);

CREATE POLICY "Employees can view own assignments" ON public.employee_project_assignments
FOR SELECT USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_employee_project_assignments_user_id ON public.employee_project_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_employee_project_assignments_project_id ON public.employee_project_assignments(project_id);
CREATE INDEX IF NOT EXISTS idx_employee_project_assignments_active ON public.employee_project_assignments(is_active);

-- Auto-assign existing employees to Default Project
INSERT INTO public.employee_project_assignments (user_id, project_id, assigned_by)
SELECT 
  u.id as user_id,
  '00000000-0000-0000-0000-000000000001'::uuid as project_id,
  (SELECT id FROM public.users WHERE role = 'admin' LIMIT 1) as assigned_by
FROM public.users u 
WHERE u.role = 'employee' 
  AND u.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM public.employee_project_assignments epa 
    WHERE epa.user_id = u.id 
    AND epa.project_id = '00000000-0000-0000-0000-000000000001'
  );

-- Create working standards for existing employees who don't have them
INSERT INTO public.employee_working_standards (
  user_id, 
  employment_type, 
  required_hours_monthly, 
  required_days_monthly,
  minimum_hours_daily,
  overtime_threshold,
  warning_threshold_percentage
)
SELECT 
  u.id as user_id,
  'monthly' as employment_type,
  160 as required_hours_monthly,
  22 as required_days_monthly,
  8 as minimum_hours_daily,
  160 as overtime_threshold,
  90 as warning_threshold_percentage
FROM public.users u 
WHERE u.role = 'employee' 
  AND u.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM public.employee_working_standards ews 
    WHERE ews.user_id = u.id
  );

-- Success message
SELECT 'Employee project assignments table created and existing employees auto-assigned!' as result; 
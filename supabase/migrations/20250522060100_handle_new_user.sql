-- Enhanced function to handle new auth users with complete setup
-- This includes: user record creation, project assignment, and working standards setup

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  metadata jsonb;
  user_role text;
  default_project_id uuid := '00000000-0000-0000-0000-000000000001';
BEGIN
  metadata := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  
  -- Determine user role
  IF metadata ? 'role' THEN
    user_role := metadata->>'role';
  ELSE
    user_role := 'employee';
    metadata := jsonb_set(metadata, '{role}', '"employee"');
  END IF;

  -- Update metadata on auth.users
  NEW.raw_user_meta_data := metadata;

  -- Insert into public.users table
  INSERT INTO public.users(id, email, full_name, avatar_url, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(metadata->>'full_name', NEW.email),
    metadata->>'avatar_url',
    user_role
  );

  -- Auto-setup for new employees only
  IF user_role = 'employee' THEN
    
    -- 1. Auto-assign to Default Project
    INSERT INTO public.employee_project_assignments(user_id, project_id)
    VALUES (NEW.id, default_project_id)
    ON CONFLICT (user_id, project_id) DO NOTHING;
    
    -- 2. Create default working standards (160 hours/month)
    INSERT INTO public.employee_working_standards(
      user_id, 
      employment_type, 
      required_hours_monthly, 
      required_days_monthly,
      minimum_hours_daily,
      overtime_threshold,
      warning_threshold_percentage
    )
    VALUES (
      NEW.id,
      'monthly',  -- Default to monthly employment
      160,        -- 160 hours per month
      22,         -- 22 working days per month
      8,          -- 8 hours minimum per day
      160,        -- Overtime threshold
      90          -- Warning at 90% threshold
    )
    ON CONFLICT (user_id) DO NOTHING;
    
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger is properly set
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

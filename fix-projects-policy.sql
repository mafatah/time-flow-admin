-- Fix RLS policy for projects table to allow employees to read projects
-- This allows all authenticated users to read projects for time tracking

-- Drop existing restrictive policy if it exists
DROP POLICY IF EXISTS "Allow read access" ON projects;

-- Create new policy that allows all authenticated users to read projects
CREATE POLICY "Allow authenticated users to read projects" 
ON projects 
FOR SELECT 
TO authenticated 
USING (true);

-- Ensure RLS is enabled on projects table
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Optional: Create separate policies for different operations
-- Allow only admins/managers to insert/update/delete projects
DROP POLICY IF EXISTS "Allow admin insert" ON projects;
CREATE POLICY "Allow admin insert" 
ON projects 
FOR INSERT 
TO authenticated 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role IN ('admin', 'manager')
  )
);

DROP POLICY IF EXISTS "Allow admin update" ON projects;
CREATE POLICY "Allow admin update" 
ON projects 
FOR UPDATE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role IN ('admin', 'manager')
  )
);

DROP POLICY IF EXISTS "Allow admin delete" ON projects;
CREATE POLICY "Allow admin delete" 
ON projects 
FOR DELETE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role IN ('admin', 'manager')
  )
); 
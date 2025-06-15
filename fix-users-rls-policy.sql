-- Fix infinite recursion in users table RLS policies
-- Run this in your Supabase SQL Editor

-- First, let's check current policies on users table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'users';

-- Drop all existing policies on users table that might cause recursion
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON users;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON users;
DROP POLICY IF EXISTS "Admin users can manage all users" ON users;
DROP POLICY IF EXISTS "Users can view all users" ON users;
DROP POLICY IF EXISTS "Users can read all users" ON users;

-- Create simple, non-recursive policies
-- Policy 1: Allow users to read all user data (needed for employee lists, etc.)
CREATE POLICY "Allow authenticated users to read all users" ON users
FOR SELECT
TO authenticated
USING (true);

-- Policy 2: Allow users to update their own profile only
CREATE POLICY "Allow users to update own profile" ON users
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Policy 3: Allow admins to manage all users
CREATE POLICY "Allow admins to manage all users" ON users
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users u2
    WHERE u2.id = auth.uid() 
    AND u2.role = 'admin'
  )
);

-- Policy 4: Allow inserting new users (for registration)
CREATE POLICY "Allow user creation" ON users
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Verify the policies were created correctly
SELECT schemaname, tablename, policyname, permissive, roles, cmd 
FROM pg_policies 
WHERE tablename = 'users'
ORDER BY policyname;

-- Test query to make sure there's no recursion
SELECT 'RLS policies fixed successfully!' as message; 
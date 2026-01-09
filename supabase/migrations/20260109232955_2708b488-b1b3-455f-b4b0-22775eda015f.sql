-- Add member_type column to members table to distinguish between recreador, animador and admin
ALTER TABLE public.members ADD COLUMN member_type text NOT NULL DEFAULT 'recreador';

-- Create an index for filtering by member type
CREATE INDEX idx_members_member_type ON public.members(member_type);
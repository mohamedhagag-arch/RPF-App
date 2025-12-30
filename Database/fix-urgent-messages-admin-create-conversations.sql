-- ============================================================
-- Fix: Allow Admins to Create Conversations for Any User
-- إصلاح: السماح للأدمن بإنشاء محادثات لأي مستخدم
-- ============================================================
-- 
-- This script fixes the RLS policy to allow admins to create
-- conversations for other users when sending messages
-- 
-- هذا السكريبت يصلح سياسة RLS للسماح للأدمن بإنشاء محادثات
-- لمستخدمين آخرين عند إرسال الرسائل
-- ============================================================

-- Drop the existing policy that only allows users to create their own conversations
DROP POLICY IF EXISTS "Users can create their own conversations" ON public.urgent_conversations;

-- Create a new policy that allows users to create their own conversations
CREATE POLICY "Users can create their own conversations"
  ON public.urgent_conversations
  FOR INSERT
  WITH CHECK (
    -- Users can create conversations for themselves
    auth.uid() = user_id
    OR
    -- Admins can create conversations for any user
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Also ensure admins can insert conversations with admin_id set
-- تأكد من أن الأدمن يمكنه إدراج محادثات مع تعيين admin_id
COMMENT ON POLICY "Users can create their own conversations" ON public.urgent_conversations IS 
  'Allows users to create conversations for themselves, and admins to create conversations for any user';

-- Verify the policy
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'urgent_conversations'
AND policyname = 'Users can create their own conversations';

-- Test message (informational)
SELECT '✅ Policy updated successfully! Admins can now create conversations for any user.' as status;


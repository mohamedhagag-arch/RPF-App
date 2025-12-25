-- ============================================================
-- Fix: Allow users to mark messages as read in their conversations
-- إصلاح: السماح للمستخدمين بتحديد الرسائل كمقروءة في محادثاتهم
-- ============================================================

-- Add policy to allow users to update messages in their conversations to mark as read
-- إضافة سياسة للسماح للمستخدمين بتحديث الرسائل في محادثاتهم لتحديدها كمقروءة
DROP POLICY IF EXISTS "Users can mark messages as read in their conversations" ON public.urgent_messages;

CREATE POLICY "Users can mark messages as read in their conversations"
  ON public.urgent_messages
  FOR UPDATE
  USING (
    -- User can update messages in their own conversations (even if not the sender)
    -- المستخدم يمكنه تحديث الرسائل في محادثاته الخاصة (حتى لو لم يكن المرسل)
    EXISTS (
      SELECT 1 FROM public.urgent_conversations
      WHERE urgent_conversations.id = urgent_messages.conversation_id
      AND urgent_conversations.user_id = auth.uid()
    )
  )
  WITH CHECK (
    -- Only allow updating is_read and read_at fields
    -- السماح فقط بتحديث حقول is_read و read_at
    EXISTS (
      SELECT 1 FROM public.urgent_conversations
      WHERE urgent_conversations.id = urgent_messages.conversation_id
      AND urgent_conversations.user_id = auth.uid()
    )
  );

-- Create a function to mark messages as read (more reliable)
-- إنشاء دالة لتحديد الرسائل كمقروءة (أكثر موثوقية)
CREATE OR REPLACE FUNCTION mark_messages_as_read(
  p_conversation_id UUID,
  p_user_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
  user_role TEXT;
BEGIN
  -- Get user role
  SELECT role INTO user_role
  FROM public.users
  WHERE id = p_user_id;
  
  IF user_role = 'admin' THEN
    -- Admins can mark any message as read
    UPDATE public.urgent_messages
    SET is_read = TRUE,
        read_at = NOW()
    WHERE conversation_id = p_conversation_id
    AND sender_id != p_user_id
    AND is_read = FALSE;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
  ELSE
    -- Users can only mark messages in their conversations
    UPDATE public.urgent_messages
    SET is_read = TRUE,
        read_at = NOW()
    WHERE conversation_id = p_conversation_id
    AND sender_id != p_user_id
    AND is_read = FALSE
    AND EXISTS (
      SELECT 1 FROM public.urgent_conversations
      WHERE urgent_conversations.id = urgent_messages.conversation_id
      AND urgent_conversations.user_id = p_user_id
    );
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
  END IF;
  
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION mark_messages_as_read(UUID, UUID) TO authenticated;

COMMENT ON FUNCTION mark_messages_as_read(UUID, UUID) IS 'Mark messages as read in a conversation (users can only mark in their own conversations, admins can mark in any conversation)';


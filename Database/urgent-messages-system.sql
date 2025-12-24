-- ============================================================
-- Urgent Messages System - Complete Database Schema
-- نظام الرسائل العاجلة - مخطط قاعدة البيانات الكامل
-- ============================================================
-- 
-- IMPORTANT: Run this script in Supabase SQL Editor
-- مهم: قم بتنفيذ هذا الملف في Supabase SQL Editor
--
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. Urgent Conversations Table
-- جدول المحادثات العاجلة
-- ============================================================
CREATE TABLE IF NOT EXISTS public.urgent_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  admin_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  subject TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.urgent_conversations IS 'Urgent conversations between users and admins';
COMMENT ON COLUMN public.urgent_conversations.user_id IS 'The user who initiated the conversation';
COMMENT ON COLUMN public.urgent_conversations.admin_id IS 'The admin assigned to handle this conversation';
COMMENT ON COLUMN public.urgent_conversations.status IS 'Current status of the conversation';
COMMENT ON COLUMN public.urgent_conversations.priority IS 'Priority level of the conversation';

-- ============================================================
-- 2. Urgent Messages Table
-- جدول الرسائل العاجلة
-- ============================================================
CREATE TABLE IF NOT EXISTS public.urgent_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.urgent_conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  message_text TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.urgent_messages IS 'Individual messages within urgent conversations';
COMMENT ON COLUMN public.urgent_messages.sender_id IS 'The user who sent this message';
COMMENT ON COLUMN public.urgent_messages.is_read IS 'Whether the message has been read by the recipient';

-- ============================================================
-- 3. Indexes for Performance
-- فهارس لتحسين الأداء
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_urgent_conversations_user_id ON public.urgent_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_urgent_conversations_admin_id ON public.urgent_conversations(admin_id);
CREATE INDEX IF NOT EXISTS idx_urgent_conversations_status ON public.urgent_conversations(status);
CREATE INDEX IF NOT EXISTS idx_urgent_conversations_last_message_at ON public.urgent_conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_urgent_messages_conversation_id ON public.urgent_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_urgent_messages_sender_id ON public.urgent_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_urgent_messages_is_read ON public.urgent_messages(is_read);
CREATE INDEX IF NOT EXISTS idx_urgent_messages_created_at ON public.urgent_messages(created_at DESC);

-- ============================================================
-- 4. Function to Update Conversation Last Message Time
-- دالة لتحديث وقت آخر رسالة في المحادثة
-- ============================================================
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.urgent_conversations
  SET last_message_at = NEW.created_at,
      updated_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 5. Trigger to Auto-Update Last Message Time
-- محفز لتحديث وقت آخر رسالة تلقائياً
-- ============================================================
DROP TRIGGER IF EXISTS trigger_update_conversation_last_message ON public.urgent_messages;
CREATE TRIGGER trigger_update_conversation_last_message
  AFTER INSERT ON public.urgent_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_last_message();

-- ============================================================
-- 6. Row Level Security (RLS) Policies
-- سياسات أمان مستوى الصف (RLS)
-- ============================================================

-- Enable RLS
ALTER TABLE public.urgent_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.urgent_messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own conversations" ON public.urgent_conversations;
DROP POLICY IF EXISTS "Admins can view all conversations" ON public.urgent_conversations;
DROP POLICY IF EXISTS "Users can create their own conversations" ON public.urgent_conversations;
DROP POLICY IF EXISTS "Admins can update conversations" ON public.urgent_conversations;
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.urgent_messages;
DROP POLICY IF EXISTS "Admins can view all messages" ON public.urgent_messages;
DROP POLICY IF EXISTS "Users can send messages in their conversations" ON public.urgent_messages;
DROP POLICY IF EXISTS "Admins can send messages in any conversation" ON public.urgent_messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON public.urgent_messages;
DROP POLICY IF EXISTS "Admins can update any message" ON public.urgent_messages;

-- Policies for urgent_conversations
CREATE POLICY "Users can view their own conversations"
  ON public.urgent_conversations
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all conversations"
  ON public.urgent_conversations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Users can create their own conversations"
  ON public.urgent_conversations
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update conversations"
  ON public.urgent_conversations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Policies for urgent_messages
CREATE POLICY "Users can view messages in their conversations"
  ON public.urgent_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.urgent_conversations
      WHERE urgent_conversations.id = urgent_messages.conversation_id
      AND urgent_conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all messages"
  ON public.urgent_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Users can send messages in their conversations"
  ON public.urgent_messages
  FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.urgent_conversations
      WHERE urgent_conversations.id = urgent_messages.conversation_id
      AND urgent_conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can send messages in any conversation"
  ON public.urgent_messages
  FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Users can update their own messages"
  ON public.urgent_messages
  FOR UPDATE
  USING (auth.uid() = sender_id);

CREATE POLICY "Admins can update any message"
  ON public.urgent_messages
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- ============================================================
-- 7. Function to Get Unread Message Count for User
-- دالة للحصول على عدد الرسائل غير المقروءة للمستخدم
-- ============================================================
CREATE OR REPLACE FUNCTION get_unread_messages_count(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  user_role TEXT;
  unread_count INTEGER;
BEGIN
  -- Get user role
  SELECT role INTO user_role
  FROM public.users
  WHERE id = user_uuid;
  
  IF user_role = 'admin' THEN
    -- Admins see unread messages in all conversations
    SELECT COUNT(*) INTO unread_count
    FROM public.urgent_messages
    WHERE is_read = FALSE
    AND sender_id != user_uuid;
  ELSE
    -- Users see unread messages in their conversations from admins
    SELECT COUNT(*) INTO unread_count
    FROM public.urgent_messages um
    INNER JOIN public.urgent_conversations uc ON um.conversation_id = uc.id
    WHERE uc.user_id = user_uuid
    AND um.is_read = FALSE
    AND um.sender_id != user_uuid;
  END IF;
  
  RETURN COALESCE(unread_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 8. Grant Permissions
-- منح الصلاحيات
-- ============================================================
GRANT SELECT, INSERT, UPDATE ON public.urgent_conversations TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.urgent_messages TO authenticated;
GRANT EXECUTE ON FUNCTION get_unread_messages_count(UUID) TO authenticated;

COMMENT ON FUNCTION get_unread_messages_count(UUID) IS 'Get count of unread messages for a user (admin sees all, users see only their conversations)';


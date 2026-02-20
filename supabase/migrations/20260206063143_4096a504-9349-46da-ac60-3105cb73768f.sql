-- Create messages table for parent-teacher communication
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL,
  recipient_id UUID NOT NULL,
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add indexes for better query performance
CREATE INDEX idx_messages_sender ON public.messages(sender_id);
CREATE INDEX idx_messages_recipient ON public.messages(recipient_id);
CREATE INDEX idx_messages_student ON public.messages(student_id);
CREATE INDEX idx_messages_created ON public.messages(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Parents can view messages where they are sender or recipient
CREATE POLICY "Users can view their own messages"
ON public.messages
FOR SELECT
USING (
  auth.uid() = sender_id OR 
  auth.uid() = recipient_id OR
  has_role(auth.uid(), 'admin'::app_role)
);

-- Users can send messages (insert where they are the sender)
CREATE POLICY "Users can send messages"
ON public.messages
FOR INSERT
WITH CHECK (auth.uid() = sender_id);

-- Users can mark their received messages as read
CREATE POLICY "Recipients can update read status"
ON public.messages
FOR UPDATE
USING (auth.uid() = recipient_id)
WITH CHECK (auth.uid() = recipient_id);

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Add student login credentials columns
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS login_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS password_hash TEXT,
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Create index on login_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_students_login_id ON public.students(login_id);
-- Migration: 009_create_attachments_table
-- Description: Creates the attachments table for storing message attachments like receipts

-- Create attachments table
CREATE TABLE IF NOT EXISTS attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups by message_id
CREATE INDEX IF NOT EXISTS idx_attachments_message_id ON attachments(message_id);

-- Create index for filtering by file_type
CREATE INDEX IF NOT EXISTS idx_attachments_file_type ON attachments(file_type);

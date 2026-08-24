/*
  # Add PDF and Document Management Fields to Cases

  1. Changes
    - Add pdf_url column to cases table for storing PDF file URLs
    - Add document_title column for better document organization
    - Add document_type column to categorize different types of case documents
    
  2. Security
    - Maintain existing RLS policies
*/

-- Add new columns to cases table
ALTER TABLE cases
ADD COLUMN IF NOT EXISTS pdf_url text,
ADD COLUMN IF NOT EXISTS document_title text,
ADD COLUMN IF NOT EXISTS document_type text;

-- Add check constraint for document types
ALTER TABLE cases
ADD CONSTRAINT cases_document_type_check
CHECK (document_type IN (
  'complaint',
  'response',
  'motion',
  'brief',
  'order',
  'judgment',
  'evidence',
  'correspondence',
  'other'
));
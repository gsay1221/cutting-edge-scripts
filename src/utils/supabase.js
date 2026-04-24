import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  'https://yzmofccpijrqabgwwkrp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6bW9mY2NwaWpycWFiZ3d3a3JwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4OTczODgsImV4cCI6MjA5MjQ3MzM4OH0.07wE8miuTdTKGz7zSEEZB7oKGOZBWjUEjNiijHeHGq4'
);

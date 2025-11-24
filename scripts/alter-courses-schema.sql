-- SQL commands to make category and duration required fields in courses table
-- Run these commands manually on your local and server databases

-- Step 1: Update any existing NULL values to default values before adding NOT NULL constraint
-- For category: set empty string or a default category
UPDATE courses SET category = 'Uncategorized' WHERE category IS NULL OR category = '';

-- For duration: set a default duration (e.g., '1' for 1 month)
-- You may want to adjust this default based on your business needs
UPDATE courses SET duration = '1' WHERE duration IS NULL OR duration = '';

-- Step 2: Add NOT NULL constraints
ALTER TABLE courses 
  MODIFY COLUMN category VARCHAR(100) NOT NULL,
  MODIFY COLUMN duration VARCHAR(50) NOT NULL;

-- Optional: Add a default value for category if you want
-- ALTER TABLE courses MODIFY COLUMN category VARCHAR(100) NOT NULL DEFAULT 'Uncategorized';

-- Verify the changes
-- DESCRIBE courses;


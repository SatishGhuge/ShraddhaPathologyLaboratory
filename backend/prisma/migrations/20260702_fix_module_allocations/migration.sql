-- Delete orphaned records from module_allocations where userId doesn't exist in users table
DELETE FROM module_allocations 
WHERE userId IS NOT NULL 
AND userId NOT IN (SELECT id FROM users);

-- Note: Records with userId = NULL are kept as they are linked to organizations only
-- This allows organizations to have module allocations without requiring a specific user

-- Remove moduleAllocation column from users table if exists
ALTER TABLE users DROP COLUMN IF EXISTS moduleAllocation;

-- Remove moduleAllocation column from organizations table if exists
ALTER TABLE organizations DROP COLUMN IF EXISTS moduleAllocation;

-- Drop existing table if it exists to recreate it
DROP TABLE IF EXISTS module_allocations;

-- Create module_allocations table with proper FK constraint
CREATE TABLE module_allocations (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  userId INT UNIQUE,
  organizationId VARCHAR(191) UNIQUE,
  modules LONGTEXT,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  
  INDEX module_allocation_userId_fkey (userId),
  INDEX module_allocation_organizationId_fkey (organizationId)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Add foreign key constraints separately
ALTER TABLE module_allocations ADD CONSTRAINT module_allocations_userId_fkey FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE module_allocations ADD CONSTRAINT module_allocations_organizationId_fkey FOREIGN KEY (organizationId) REFERENCES organizations(id) ON DELETE CASCADE;

-- Remove moduleAllocation column from users table
ALTER TABLE users DROP COLUMN moduleAllocation;

-- Remove moduleAllocation column from organizations table
ALTER TABLE organizations DROP COLUMN moduleAllocation;

-- Create module_allocations table
CREATE TABLE module_allocations (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  userId INT UNIQUE,
  organizationId VARCHAR(255) UNIQUE,
  modules JSON,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  
  CONSTRAINT module_allocations_userId_fkey FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT module_allocations_organizationId_fkey FOREIGN KEY (organizationId) REFERENCES organizations(id) ON DELETE CASCADE,
  
  INDEX module_allocation_userId_fkey (userId),
  INDEX module_allocation_organizationId_fkey (organizationId)
);

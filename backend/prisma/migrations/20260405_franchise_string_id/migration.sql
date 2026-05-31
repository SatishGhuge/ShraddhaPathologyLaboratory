-- Migration: Change Franchise.id from Int to String (FR-AAA style)
-- This migration is now a no-op since test_charges no longer has franchiseId
-- The franchiseId column was removed in earlier migrations

-- No operations needed - franchise string ID conversion is skipped
-- as the franchise entity is being removed entirely


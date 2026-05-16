# Backend Scripts

This folder contains utility scripts for database management and maintenance.

## 🌱 Seeding Scripts

### `seed-basic.js`
Seeds the database with initial data including departments, tests, packages, doctors, corporates, units, and sample types.

**Usage:**
```bash
node scripts/seed-basic.js
```

**What it seeds:**
- 5 Departments
- 10 Tests with default charges
- 3 Packages with test links
- 5 Doctors
- 8 Corporates
- 14 Units
- 8 Sample Types

**Note:** Does NOT seed franchises or collection centers (create via UI).

### `seed-admins.js`
Creates/updates admin user accounts.

**Usage:**
```bash
node scripts/seed-admins.js
```

**Creates:**
- Super Admin (admin / Admin@123)
- Regular Admin (user / User@123)
- Lab Manager (labmanager / Lab@123)
- Receptionist (receptionist / Reception@123)

### `verify-seed.js`
Verifies what data has been seeded in the database.

**Usage:**
```bash
node scripts/verify-seed.js
```

Shows counts and details of all seeded data.

## 🔧 Database Maintenance Scripts

### `fix-ids.js`
Converts franchise and collection_centers ID types from INT to VARCHAR(191).

**Usage:**
```bash
node scripts/fix-ids.js
```

**What it does:**
- Removes auto_increment from ID columns
- Converts IDs to VARCHAR(191)
- Updates foreign key constraints
- Re-establishes relationships

**When to use:** Only if you encounter ID type mismatch errors.

### `fix-ids-manual.sql`
Manual SQL commands for ID type conversion (alternative to fix-ids.js).

**Usage:** Run in MySQL/phpMyAdmin directly.

### `fix-database.js`
Checks database structure and reports any issues.

**Usage:**
```bash
node scripts/fix-database.js
```

Shows table structures and ID types.

## 🧪 Testing Scripts

### `test-email.js`
Tests email configuration and SMTP connection.

**Usage:**
```bash
node scripts/test-email.js
```

Verifies email settings and sends a test email.

## 🗑️ Data Cleanup Scripts

### `clear-test-data.js`
Clears test patient data from the database.

**Usage:**
```bash
node scripts/clear-test-data.js
```

**Warning:** This will delete patient test data. Use with caution!

### `clear-test-data.sql`
SQL version of the data cleanup script.

## 🔍 Diagnostic Scripts

### `check-db.js`
Shows all database tables and their columns.

**Usage:**
```bash
node scripts/check-db.js
```

Useful for debugging database structure issues.

## 📊 Data Files

### `seed-data.json`
Large JSON file containing comprehensive seed data (5928 lines).

**Note:** Currently not used by seed scripts. Contains historical test data with parameters.

## 🚀 Quick Start

1. **First Time Setup:**
   ```bash
   # Seed admin accounts
   node scripts/seed-admins.js
   
   # Seed basic data
   node scripts/seed-basic.js
   
   # Verify seeding
   node scripts/verify-seed.js
   ```

2. **Test Email:**
   ```bash
   node scripts/test-email.js
   ```

3. **Check Database:**
   ```bash
   node scripts/check-db.js
   node scripts/fix-database.js
   ```

## ⚠️ Important Notes

- Always backup your database before running cleanup scripts
- Seeding scripts use `skipDuplicates` so they're safe to run multiple times
- Franchises and Centers must be created via UI (they need String IDs)
- Fix scripts should only be run if you encounter specific errors

## 🆘 Troubleshooting

### "Prisma client out of sync"
Run: `npx prisma generate`

### "ID type mismatch"
Run: `node scripts/fix-ids.js`

### "Email not working"
Run: `node scripts/test-email.js`

### "Need to verify data"
Run: `node scripts/verify-seed.js`

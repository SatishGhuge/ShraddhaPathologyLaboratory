# 📚 API Inspector Documentation Index

Complete guide to the Organization Charges API Inspector Scripts

---

## 🗂️ File Guide

### 📄 Core Scripts (Choose One)

1. **`inspect-org-charges.js`** (Node.js)
   - 📍 Location: `backend/scripts/inspect-org-charges.js`
   - 🎯 Best for: Full-stack developers, maximum detail
   - 💻 Requirements: Node.js v14+
   - ⏱️ Time to first result: ~1 second
   - 📊 Output: Comprehensive with statistics
   - Start here if: You want the most detailed analysis

2. **`inspect-org-charges.ps1`** (PowerShell)
   - 📍 Location: `backend/scripts/inspect-org-charges.ps1`
   - 🎯 Best for: Windows developers
   - 💻 Requirements: PowerShell 3.0+ (built-in on Windows)
   - ⏱️ Time to first result: ~0.5 seconds
   - 📊 Output: Color-coded, well-formatted
   - Start here if: You're on Windows

3. **`inspect-org-charges.sh`** (Bash)
   - 📍 Location: `backend/scripts/inspect-org-charges.sh`
   - 🎯 Best for: Linux/Mac developers
   - 💻 Requirements: Bash, curl (usually pre-installed)
   - ⏱️ Time to first result: ~0.3 seconds
   - 📊 Output: Efficient, with jq support optional
   - Start here if: You're on Linux or Mac

---

### 📖 Documentation Files

#### Getting Started (Read These First)

1. **`CHOOSING-YOUR-SCRIPT.md`** ⭐ START HERE
   - Helps you pick the right script for your OS/needs
   - Decision tree with clear recommendations
   - OS-specific setup instructions
   - Troubleshooting by platform
   - **Time to read:** 10-15 minutes
   - **Read if:** Unsure which script to use

2. **`TEST-SCRIPT-SUMMARY.md`** ⭐ OVERVIEW
   - Complete overview of what was created
   - Quick start guide
   - Response structure overview
   - Use cases and next steps
   - **Time to read:** 5-10 minutes
   - **Read if:** Want quick overview

3. **`QUICK-REFERENCE.txt`** ⭐ CHEAT SHEET
   - One-page quick reference
   - Common commands
   - Data type reference
   - Essential troubleshooting
   - **Time to read:** 3-5 minutes
   - **Read if:** Want fast lookup

#### Comprehensive Documentation

4. **`API-RESPONSE-INSPECTOR.md`** ⭐ COMPLETE GUIDE
   - Full, detailed documentation
   - How each script works
   - Complete response structure
   - Field explanations with tables
   - Comprehensive troubleshooting
   - Real examples
   - **Time to read:** 20-30 minutes
   - **Read if:** Want complete understanding

5. **`SAMPLE-OUTPUT.txt`** 
   - Real example outputs
   - What you'll see when you run scripts
   - Examples of success/empty/error responses
   - How to interpret the output
   - Practical examples
   - **Time to read:** 10-15 minutes
   - **Read if:** Want to know what output looks like

#### Reference Documents

6. **`QUICK-REFERENCE.txt`** (Duplicate)
   - Handy one-page reference card
   - API endpoint details
   - Response structure
   - Common commands
   - Troubleshooting shortcuts
   - **Time to read:** Whenever you need it
   - **Read if:** Need quick lookup while coding

7. **`API-INSPECTOR-INDEX.md`** (This File)
   - Documentation roadmap
   - File descriptions
   - What to read when
   - Learning paths
   - **Time to read:** 5 minutes

---

## 🚀 Quick Start (5 Minutes)

### Step 1: Choose Your Script (1 min)

**Windows users:**
```powershell
.\scripts\inspect-org-charges.ps1
```

**Mac/Linux users:**
```bash
./scripts/inspect-org-charges.sh
```

**All platforms:**
```bash
node scripts/inspect-org-charges.js
```

### Step 2: Start Backend (1 min)

```bash
cd backend
npm run dev
```

Wait until you see: `Server running on port 5000`

### Step 3: Run Script (1 min)

```bash
node scripts/inspect-org-charges.js ORG-AAC
```

### Step 4: Study Output (2 min)

Look at the response structure and note:
- Field names
- Data types
- Nested objects
- Available values

---

## 📚 Learning Paths

### Path 1: "I Just Need It To Work" (⏱️ 15 minutes)

1. Read: `CHOOSING-YOUR-SCRIPT.md` (5 min)
   - Find your OS section
   - Copy-paste the command

2. Do: Run your script (2 min)
   - Follow the quick start above

3. Reference: `QUICK-REFERENCE.txt` (5 min)
   - Bookmark for later
   - Keep handy while coding

4. Done! Start coding with confidence

---

### Path 2: "I Want To Understand Everything" (⏱️ 45 minutes)

1. Read: `TEST-SCRIPT-SUMMARY.md` (10 min)
   - Understand what was created
   - See the response structure

2. Read: `CHOOSING-YOUR-SCRIPT.md` (10 min)
   - Pick the right script
   - Follow OS setup

3. Run: Execute the script (5 min)
   - Get real output
   - See it in action

4. Read: `SAMPLE-OUTPUT.txt` (10 min)
   - Compare with your output
   - Understand each section

5. Read: `API-RESPONSE-INSPECTOR.md` (Optional 20 min)
   - Deep dive into details
   - Field explanations

6. Done! Expert-level understanding

---

### Path 3: "I'm Debugging/Troubleshooting" (⏱️ 10 minutes)

1. Check: `QUICK-REFERENCE.txt` → Troubleshooting section
   - Is your issue listed?
   - Try the solution

2. Read: `CHOOSING-YOUR-SCRIPT.md` → Troubleshooting by OS
   - OS-specific fixes

3. Read: `API-RESPONSE-INSPECTOR.md` → Troubleshooting Guide
   - Detailed troubleshooting

4. Still stuck? Check server logs

---

### Path 4: "I'm a DevOps/CI-CD Person" (⏱️ 30 minutes)

1. Read: `CHOOSING-YOUR-SCRIPT.md`
   - Choose script for your pipeline

2. Read: `API-RESPONSE-INSPECTOR.md` → Direct curl section
   - Understand underlying API

3. Integrate: Use curl or script in pipeline
   - Save output as JSON
   - Parse with grep/jq/PowerShell

4. Create: Custom monitoring based on response

---

## 🎯 Decision Guide

### "Which file should I read?"

**I don't know where to start:**
→ Read `CHOOSING-YOUR-SCRIPT.md`

**I need it working in 5 minutes:**
→ Follow Quick Start above then use `QUICK-REFERENCE.txt`

**I need detailed information:**
→ Read `API-RESPONSE-INSPECTOR.md`

**I want to see example outputs:**
→ Read `SAMPLE-OUTPUT.txt`

**I need quick reference while coding:**
→ Bookmark `QUICK-REFERENCE.txt`

**I'm troubleshooting an issue:**
→ Check Troubleshooting section in relevant doc

**I need to explain this to team:**
→ Share `TEST-SCRIPT-SUMMARY.md` + `SAMPLE-OUTPUT.txt`

**I'm integrating into CI/CD:**
→ Read `API-RESPONSE-INSPECTOR.md` → Integration section

**I need full documentation:**
→ Read everything in this index in order

---

## 📋 File Organization

```
backend/scripts/
├── Core Scripts
│   ├── inspect-org-charges.js        (Node.js version)
│   ├── inspect-org-charges.ps1       (PowerShell version)
│   └── inspect-org-charges.sh        (Bash version)
│
├── Documentation
│   ├── API-INSPECTOR-INDEX.md        ← You are here
│   ├── CHOOSING-YOUR-SCRIPT.md       (Decision guide)
│   ├── TEST-SCRIPT-SUMMARY.md        (Overview)
│   ├── API-RESPONSE-INSPECTOR.md     (Complete guide)
│   ├── SAMPLE-OUTPUT.txt             (Example outputs)
│   ├── QUICK-REFERENCE.txt           (Cheat sheet)
│   └── API-INSPECTOR-INDEX.md        (This file)
│
└── Related Files
    ├── test-api-charges.js           (Existing test script)
    └── ... (other backend scripts)
```

---

## 🔍 What Each File Covers

| File | What It's About | Best For | Read Time |
|------|---|---|---|
| `CHOOSING-YOUR-SCRIPT.md` | Which script to use | Picking the right tool | 15 min |
| `TEST-SCRIPT-SUMMARY.md` | What was created | Overview + getting started | 10 min |
| `API-RESPONSE-INSPECTOR.md` | Complete reference | Learning all details | 30 min |
| `SAMPLE-OUTPUT.txt` | Real example outputs | Understanding output format | 15 min |
| `QUICK-REFERENCE.txt` | Quick lookup | While coding | 5 min |
| `API-INSPECTOR-INDEX.md` | Navigation (this file) | Finding what you need | 5 min |

---

## 🎓 Key Concepts

### API Endpoint
**What:** `GET /api/master/organizations/{organizationId}/charges`
**Where:** Defined in `/routes/master.routes.js`
**Handled By:** `getTestCharges()` in `/controllers/master.controller.js`

### Response Format
```javascript
{
  "success": boolean,        // Was request successful?
  "data": [                  // Array of charge records
    {
      "id": "string",        // Charge ID
      "testId": number,      // Which test
      "organizationId": "string", // Which org
      "b2cCharge": number,   // Consumer price
      "b2bCharge": number,   // Business price
      "isActive": boolean,   // Currently in use?
      "test": {...},         // Nested test info
      "organization": {...}, // Nested org info
      // ... more fields
    }
  ]
}
```

### Data Types
- `string`: Text ("ORG-AAC")
- `number`: Numbers (500, 2.5)
- `boolean`: true/false
- `null`: Nothing/not set
- `array`: List of items [...]
- `object`: Structured data {...}

### ISO 8601 Dates
Format: `"2025-01-15T10:30:00.000Z"`
- Represents: January 15, 2025 at 10:30 AM UTC
- "Z" means UTC timezone
- Used for: `createdAt`, `updatedAt`, `effectiveFrom`, `effectiveTo`

---

## ✅ Implementation Checklist

Before running scripts:
- [ ] Backend server running (`npm run dev`)
- [ ] Database connected and has data
- [ ] Organization ID is valid (e.g., ORG-AAC)
- [ ] Port is correct (default: 5000)
- [ ] Network connection available
- [ ] Script dependencies installed (if needed)

After running scripts:
- [ ] API returned successful response (200 OK)
- [ ] Response has expected structure
- [ ] Data appears in `data` array
- [ ] All field names look correct
- [ ] Data types match documentation
- [ ] Nested objects are populated

---

## 🔗 Related Resources

### In This Repository
- **Master Controller:** `/controllers/master.controller.js`
  - `getTestCharges()` function
  - Response structure defined

- **Routes:** `/routes/master.routes.js`
  - Route definition
  - Endpoint mapping

- **Database Models:** `/prisma/schema.prisma`
  - TestCharge model
  - Test model
  - Organization model

- **Existing Test:** `/scripts/test-api-charges.js`
  - Similar test script
  - Alternative approach

### Database
- **Models Used:** TestCharge, Test, Organization, Department
- **Relationships:** TestCharge → Test → Department
- **Relationships:** TestCharge → Organization

---

## 💡 Tips & Tricks

### Save Response for Analysis
```bash
node scripts/inspect-org-charges.js > response.json
# Later: cat response.json (or open in editor)
```

### Compare Multiple Organizations
```bash
node scripts/inspect-org-charges.js ORG-AAA > org-aaa.json
node scripts/inspect-org-charges.js ORG-AAC > org-aac.json
diff org-aaa.json org-aac.json
```

### Direct API Call
```bash
curl http://localhost:5000/api/master/organizations/ORG-AAC/charges | jq '.'
```

### Filter with jq
```bash
curl -s http://localhost:5000/api/master/organizations/ORG-AAC/charges | \
  jq '.data[] | select(.isActive == true) | .b2cCharge'
```

---

## 🆘 Troubleshooting Quick Links

**Connection issues:**
- Server not running? → Start with `npm run dev`
- Wrong port? → Default is 5000, check .env file
- Network blocked? → Check firewall/proxy

**API errors:**
- 404 Not Found? → Organization ID might be wrong
- 500 Error? → Check server logs, database connection
- Empty response? → Organization might not have charges

**Script issues:**
- Script won't run? → Read Troubleshooting in your chosen OS section
- Dependency errors? → Install required packages (Node.js, etc.)
- Permission denied? → Check file permissions, script must be executable

**Understanding output:**
- Confused by types? → See "Data Types Reference" in QUICK-REFERENCE.txt
- What's this field? → Check "Key Fields Explained" in API-RESPONSE-INSPECTOR.md
- Format of dates? → See "ISO 8601 Dates" section above

---

## 📞 When You're Stuck

1. **Check the docs:**
   - QUICK-REFERENCE.txt for quick answers
   - API-RESPONSE-INSPECTOR.md for detailed info
   - SAMPLE-OUTPUT.txt to compare

2. **Check the code:**
   - `/controllers/master.controller.js` - How API works
   - `/routes/master.routes.js` - Route definition

3. **Check your setup:**
   - Backend running?
   - Database connected?
   - Valid organization ID?
   - Correct port?

4. **Check server logs:**
   - Look at console where `npm run dev` is running
   - May show database errors

---

## 📚 Complete Reading Order

For full mastery, read in this order:

1. **CHOOSING-YOUR-SCRIPT.md** (15 min)
   - Understand which script to use
   
2. **Quick Start** (5 min)
   - Get it running

3. **SAMPLE-OUTPUT.txt** (15 min)
   - See what output looks like
   
4. **QUICK-REFERENCE.txt** (5 min)
   - Bookmark for reference

5. **API-RESPONSE-INSPECTOR.md** (30 min)
   - Deep dive into details

6. **Keep handy:** QUICK-REFERENCE.txt
   - While you're coding

---

## 🎯 Success Criteria

You'll know everything is working when you can:

✅ Run the appropriate script for your OS
✅ See HTTP 200 response
✅ View complete JSON response
✅ Identify all fields in the response
✅ Understand the data type of each field
✅ Explain nested objects
✅ Interpret ISO 8601 dates
✅ Use the data in your code

---

**Last Updated:** 2025
**Version:** 1.0
**Status:** Complete and ready to use

For the latest information, always check:
- This index file
- README.md in the scripts directory
- Comments in the script files themselves

---

## 🚀 Next Steps

1. Choose your script → `CHOOSING-YOUR-SCRIPT.md`
2. Run the script → Follow Quick Start above  
3. Study the output → `SAMPLE-OUTPUT.txt`
4. Keep reference handy → `QUICK-REFERENCE.txt`
5. Dive deeper → `API-RESPONSE-INSPECTOR.md`

Happy coding! 🎉

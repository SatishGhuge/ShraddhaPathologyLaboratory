# Choosing Your API Inspector Script

This guide helps you select the right script for your environment and needs.

---

## 🎯 Quick Decision Tree

```
┌─ Which operating system are you using?
│
├─ Windows
│  └─ Do you prefer PowerShell?
│     ├─ Yes → Use: inspect-org-charges.ps1
│     └─ No  → Use: inspect-org-charges.js (requires Node.js)
│
├─ macOS
│  ├─ Have jq installed?
│  │  ├─ Yes (or willing to install) → Use: inspect-org-charges.sh
│  │  └─ No → Use: inspect-org-charges.js
│  └─ (Alternative) Use: inspect-org-charges.js
│
└─ Linux
   ├─ Have jq installed?
   │  ├─ Yes → Use: inspect-org-charges.sh
   │  └─ No  → Use: inspect-org-charges.js
   └─ (Alternative) Use: inspect-org-charges.ps1 with PowerShell Core
```

---

## 📊 Script Comparison

| Feature | Node.js | PowerShell | Bash |
|---------|---------|-----------|------|
| **Platform** | All (Windows, Mac, Linux) | Windows, PowerShell Core | Mac, Linux |
| **Dependencies** | Node.js + npm | Built-in PowerShell | curl, bash (+ jq optional) |
| **Installation Difficulty** | Medium (need Node.js) | None (Windows native) | Easy (usually pre-installed) |
| **Output Detail** | ⭐⭐⭐⭐⭐ Maximum | ⭐⭐⭐⭐ Very Good | ⭐⭐⭐⭐ Very Good |
| **Color Coding** | No | Yes (great readability) | Yes (with jq) |
| **Performance** | Fast | Very Fast | Very Fast |
| **Customization** | High | Medium | Medium |
| **Statistical Analysis** | Yes | Basic | Yes (with jq) |
| **Recommended For** | Full-stack developers | Windows developers | Unix/Linux developers |

---

## 🔍 Detailed Comparison

### Node.js Script (`inspect-org-charges.js`)

#### ✅ Advantages
- **Universal:** Works on Windows, Mac, Linux
- **Maximum Detail:** Most comprehensive output
- **Statistical Analysis:** Calculates averages and unique counts
- **Flexible:** Easy to modify and extend
- **Type Analysis:** Detailed type checking for all fields
- **Nested Object Analysis:** Shows all nested structures clearly
- **Best for Understanding API:** Most pedagogical output

#### ❌ Disadvantages
- **Dependencies:** Requires Node.js and npm
- **Setup Time:** Need to navigate to backend directory
- **Startup Time:** Slightly slower than shell scripts

#### 🎯 Best For
- Learning API response structure
- Generating comprehensive documentation
- Backend/full-stack developers
- When you want maximum detail

#### 💻 How to Use
```bash
cd backend
node scripts/inspect-org-charges.js
node scripts/inspect-org-charges.js ORG-AAA 5000
```

#### 📋 Output Includes
- ✓ Full JSON response
- ✓ Structure visualization with types
- ✓ Detailed field-by-field analysis
- ✓ Nested object inspection
- ✓ Statistical summary
- ✓ Type information for each field

---

### PowerShell Script (`inspect-org-charges.ps1`)

#### ✅ Advantages
- **Native to Windows:** Built-in, no installation needed
- **Color Coded:** Excellent visual organization
- **Fast:** Minimal startup overhead
- **User Friendly:** Clear output structure
- **Object Manipulation:** PowerShell's object model works well
- **Integration:** Works with Windows ecosystem tools

#### ❌ Disadvantages
- **Windows Only:** Not available on Mac/Linux (without PowerShell Core)
- **Less Detail:** Slightly less analytical depth than Node.js
- **Execution Policy:** May need configuration on first use
- **Learning Curve:** PowerShell syntax unfamiliar to some

#### 🎯 Best For
- Windows developers (primary audience)
- Quick checks with minimal setup
- When native color output is important
- DevOps and system administrators

#### 💻 How to Use
```powershell
cd backend
.\scripts\inspect-org-charges.ps1
.\scripts\inspect-org-charges.ps1 -OrgId "ORG-AAA" -Port 5000
```

#### ⚠️ First Time Setup
```powershell
# Allow scripts to run (one-time only)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

#### 📋 Output Includes
- ✓ Full JSON response
- ✓ Color-coded sections
- ✓ Field analysis with types
- ✓ Nested object details
- ✓ Statistical summary
- ✓ Clear visual hierarchy

---

### Bash Script (`inspect-org-charges.sh`)

#### ✅ Advantages
- **Lightweight:** Minimal resource usage
- **Universal on Unix:** Standard on Mac and Linux
- **Fast:** Direct system calls
- **jq Integration:** Enhanced JSON parsing with jq
- **Portable:** Works across Unix variants
- **No Runtime:** No JVM or Node.js startup time

#### ❌ Disadvantages
- **Unix Only:** Not natively available on Windows
- **jq Dependency:** Best results need jq installed
- **Less Detail:** Less analytical than Node.js (without jq)
- **Platform Variations:** Minor differences between Linux/Mac

#### 🎯 Best For
- Mac and Linux developers (primary audience)
- Minimalist users
- When minimal dependencies are important
- Command-line specialists

#### 💻 How to Use
```bash
cd backend
chmod +x scripts/inspect-org-charges.sh
./scripts/inspect-org-charges.sh
./scripts/inspect-org-charges.sh ORG-AAA 5000
```

#### 📦 Optional Setup (Install jq)
```bash
# macOS
brew install jq

# Ubuntu/Debian
sudo apt-get install jq

# CentOS/RHEL
sudo yum install jq

# Alpine
apk add jq
```

#### 📋 Output Includes
- ✓ Full JSON response
- ✓ Field analysis with types (with jq)
- ✓ Nested object details
- ✓ Statistical summary
- ✓ Color output (with jq)
- ✓ Minimal memory footprint

---

## 🚀 Getting Started by OS

### Windows Users

#### Option 1: PowerShell (Recommended)
```powershell
# First time only:
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Then:
cd backend
.\scripts\inspect-org-charges.ps1
```

#### Option 2: Node.js
```bash
cd backend
node scripts/inspect-org-charges.js
```

#### Option 3: WSL (Windows Subsystem for Linux)
```bash
# In WSL terminal:
cd backend
chmod +x scripts/inspect-org-charges.sh
./scripts/inspect-org-charges.sh
```

---

### macOS Users

#### Option 1: Bash (Recommended)
```bash
cd backend
chmod +x scripts/inspect-org-charges.sh
./scripts/inspect-org-charges.sh

# For enhanced output:
brew install jq
./scripts/inspect-org-charges.sh
```

#### Option 2: Node.js
```bash
cd backend
node scripts/inspect-org-charges.js
```

---

### Linux Users

#### Option 1: Bash (Recommended)
```bash
cd backend
chmod +x scripts/inspect-org-charges.sh
./scripts/inspect-org-charges.sh

# For enhanced output:
sudo apt-get install jq  # or equivalent for your distro
./scripts/inspect-org-charges.sh
```

#### Option 2: Node.js
```bash
cd backend
node scripts/inspect-org-charges.js
```

#### Option 3: PowerShell Core
```bash
cd backend
chmod +x scripts/inspect-org-charges.ps1
pwsh ./scripts/inspect-org-charges.ps1
```

---

## 📝 Script File Details

### `inspect-org-charges.js` (Node.js)
```
File size: ~12 KB
Language: JavaScript (ES6 modules)
Runtime: Node.js v14+
Dependencies: node-fetch (usually included)
Execution time: ~0.5-1 second
Memory: ~20-30 MB
```

### `inspect-org-charges.ps1` (PowerShell)
```
File size: ~8 KB
Language: PowerShell
Runtime: PowerShell 3.0+ / PowerShell Core 6+
Dependencies: None (built-in cmdlets only)
Execution time: ~0.2-0.5 seconds
Memory: ~50-100 MB
```

### `inspect-org-charges.sh` (Bash)
```
File size: ~6 KB
Language: Bash shell script
Runtime: Bash 3.0+
Dependencies: curl (required), jq (optional)
Execution time: ~0.1-0.3 seconds
Memory: ~2-5 MB
```

---

## 🔧 Troubleshooting by OS

### Windows with PowerShell

**Problem:** "cannot be loaded because running scripts is disabled"
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
Y  # Press Y to confirm
```

**Problem:** Command not found
```powershell
# Use full path:
& "C:\Users\YourName\Projects\backend\scripts\inspect-org-charges.ps1"

# Or dot-source:
. .\scripts\inspect-org-charges.ps1
```

### macOS with Bash

**Problem:** "Permission denied"
```bash
chmod +x scripts/inspect-org-charges.sh
./scripts/inspect-org-charges.sh
```

**Problem:** "jq: command not found" (optional, for enhanced output)
```bash
brew install jq
```

### Linux with Bash

**Problem:** "Permission denied"
```bash
chmod +x scripts/inspect-org-charges.sh
./scripts/inspect-org-charges.sh
```

**Problem:** "curl: command not found"
```bash
sudo apt-get install curl  # Debian/Ubuntu
sudo yum install curl      # CentOS/RHEL
```

### All Platforms

**Problem:** "Connection refused"
```bash
# Make sure backend is running:
cd backend
npm run dev
```

**Problem:** "Empty response"
```bash
# Check organization exists:
node scripts/inspect-org-charges.js ORG-AAA  # Try default org
```

---

## 💡 Pro Tips

### Tip 1: First Time Setup Checklist

```
□ Backend running? (npm run dev)
□ Database connected?
□ Organization ID valid?
□ Port correct? (default 5000)
□ Dependencies installed?
  □ Node.js (for .js script)
  □ PowerShell execution policy (for .ps1 script)
  □ Bash + curl (for .sh script)
```

### Tip 2: Save Output for Later

```bash
# Node.js
node scripts/inspect-org-charges.js > response.txt

# PowerShell
.\scripts\inspect-org-charges.ps1 | Out-File response.txt

# Bash
./scripts/inspect-org-charges.sh > response.txt
```

### Tip 3: Compare Responses

```bash
# Node.js
node scripts/inspect-org-charges.js ORG-AAA > org-aaa.json
node scripts/inspect-org-charges.js ORG-AAC > org-aac.json
diff org-aaa.json org-aac.json
```

### Tip 4: Direct curl Alternative

```bash
# Without any script:
curl -s http://localhost:5000/api/master/organizations/ORG-AAC/charges | \
  python3 -m json.tool

# Or with jq:
curl -s http://localhost:5000/api/master/organizations/ORG-AAC/charges | \
  jq '.'
```

---

## 🎓 Learning Recommendation

### For Beginners:
Start with **Node.js script** → Most educational with detailed output

### For Quick Checks:
Use your **OS-native script** → Fastest setup and execution

### For Documentation:
Use **Node.js script** → Best for generating examples

### For Integration:
Choose based on your **build system**:
- Java/Maven: Use curl alternative
- Node.js project: Use .js script
- PowerShell automation: Use .ps1 script
- Bash/Shell scripts: Use .sh script

---

## ✨ Summary Table

| You are using | Best Choice | Alternative | Why |
|---|---|---|---|
| Windows 10/11 | PowerShell (.ps1) | Node.js (.js) | Native, no setup |
| macOS | Bash (.sh) | Node.js (.js) | Built-in, fast |
| Linux | Bash (.sh) | Node.js (.js) | Built-in, fast |
| Full-stack dev | Node.js (.js) | OS-native | Most detailed |
| DevOps/Sysadmin | PowerShell (.ps1) | Bash (.sh) | Ecosystem match |
| CI/CD pipeline | Bash (.sh) | Node.js (.js) | Universal |
| Don't know | Node.js (.js) | Your OS-native | Works everywhere |

---

## 📚 Next Steps

1. **Identify your OS** above
2. **Follow the recommended script**
3. **Do the first-time setup** (if needed)
4. **Run the script**: `node scripts/inspect-org-charges.js`
5. **Study the output** using SAMPLE-OUTPUT.txt as reference

---

For more information:
- **Complete Guide:** API-RESPONSE-INSPECTOR.md
- **Quick Reference:** QUICK-REFERENCE.txt
- **Sample Output:** SAMPLE-OUTPUT.txt
- **Summary:** TEST-SCRIPT-SUMMARY.md

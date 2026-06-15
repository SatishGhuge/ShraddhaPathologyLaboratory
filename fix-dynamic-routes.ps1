# Fix all dynamic route pages with id parameter issues

$files = @(
  'frontend/app/master/center/view/[id]/page.tsx',
  'frontend/app/master/corporate/edit/[id]/page.tsx',
  'frontend/app/master/corporate/view/[id]/page.tsx',
  'frontend/app/master/departmentlist/edit/[id]/page.tsx',
  'frontend/app/master/departmentlist/view/[id]/page.tsx',
  'frontend/app/master/franchise/edit/[id]/page.tsx',
  'frontend/app/master/franchise/view/[id]/page.tsx',
  'frontend/app/master/outsourcing/edit/[id]/page.tsx',
  'frontend/app/master/outsourcing/view/[id]/page.tsx',
  'frontend/app/master/packagelist/charges/[id]/page.tsx',
  'frontend/app/master/packagelist/edit/[id]/page.tsx',
  'frontend/app/master/packagelist/view/[id]/page.tsx',
  'frontend/app/master/referral-doctor/edit/[id]/page.tsx',
  'frontend/app/master/rolelist/edit/[id]/page.tsx',
  'frontend/app/master/rolelist/view/[id]/page.tsx',
  'frontend/app/master/testlist/edit/[id]/page.tsx',
  'frontend/app/master/testlist/view/[id]/page.tsx',
  'frontend/app/master/user/edit/[id]/page.tsx'
)

$fixedCount = 0

foreach ($file in $files) {
  $fullPath = Get-ChildItem -Path $file -ErrorAction SilentlyContinue | Select-Object -ExpandProperty FullName
  
  if ($fullPath) {
    $content = [System.IO.File]::ReadAllText($fullPath)
    $originalContent = $content
    
    # Fix pattern 1: getXxxById(id) -> getXxxById(centerId as string)
    $content = $content -replace 'get(\w+)ById\(id\)(?!.*as string)', 'get$1ById(centerId as string)'
    
    # Fix pattern 2: Add centerId conversion if not present
    if ($content -match 'if \(id && \(isViewMode \|\| isEditMode\)\)' -and $content -notmatch 'const centerId = Array\.isArray\(id\)') {
      $content = $content -replace '(if \(id && \(isViewMode \|\| isEditMode\)\) \{[\s\n]*setLoading\(true\);)', '$1' + "`n      const centerId = Array.isArray(id) ? id[0] : id;"
    }
    
    # Fix pattern 3: credentials response
    $content = $content -replace 'credentials: res\.credentials', 'credentials: res.data?.credentials'
    
    if ($content -ne $originalContent) {
      [System.IO.File]::WriteAllText($fullPath, $content)
      $fixedCount++
      Write-Host "✓ Fixed: $file"
    }
  }
}

Write-Host "`nTotal files fixed: $fixedCount"

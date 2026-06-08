# Organization Charges API Response Inspector
# PowerShell script to inspect the organization charges API endpoint
# 
# Usage: .\inspect-org-charges.ps1 -OrgId "ORG-AAC" -Port 5000
# Example: .\inspect-org-charges.ps1 -OrgId "ORG-AAC" -Port 5000

param(
    [string]$OrgId = "ORG-AAC",
    [int]$Port = 5000
)

$API_URL = "http://localhost:$Port/api/master/organizations/$OrgId/charges"

Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "🔍 Organization Charges API Response Inspector" -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

Write-Host "📋 Request Details:" -ForegroundColor Yellow
Write-Host "   URL: $API_URL"
Write-Host "   Method: GET"
Write-Host "   Organization ID: $OrgId"
Write-Host "   Port: $Port"
Write-Host ""

Write-Host "⏳ Sending request..." -ForegroundColor Yellow
Write-Host ""

try {
    $response = Invoke-WebRequest -Uri $API_URL -Method Get -ContentType "application/json" -ErrorAction Stop
    
    Write-Host "✅ Response Status: $($response.StatusCode) $([System.Net.HttpStatusCode]$response.StatusCode)" -ForegroundColor Green
    Write-Host "   Content-Type: $($response.Headers['Content-Type'])"
    Write-Host ""
    
    $data = $response.Content | ConvertFrom-Json
    
    # Display raw JSON
    Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "📄 Raw Response (Pretty JSON)" -ForegroundColor Cyan
    Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""
    
    $data | ConvertTo-Json -Depth 10 | Write-Host
    
    # Display detailed field analysis
    Write-Host ""
    Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "🔬 Detailed Field Analysis" -ForegroundColor Cyan
    Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""
    
    if ($data.success -ne $null) {
        Write-Host "success: $($data.success) ($(if ($data.success -is [bool]) { 'boolean' } else { $data.success.GetType().Name }))" -ForegroundColor White
    }
    
    if ($data.data) {
        Write-Host ""
        Write-Host "data: Array with $($data.data.Count) charge record(s)" -ForegroundColor White
        
        if ($data.data.Count -gt 0) {
            $charge = $data.data[0]
            Write-Host ""
            Write-Host "  📊 First Charge Object Fields:" -ForegroundColor Yellow
            Write-Host "  ────────────────────────────────" -ForegroundColor Yellow
            
            foreach ($property in $charge.PSObject.Properties) {
                $name = $property.Name
                $value = $property.Value
                $type = if ($value -is [array]) { "array" } elseif ($value -is [PSCustomObject]) { "object" } elseif ($value -eq $null) { "null" } else { $value.GetType().Name }
                
                $displayValue = ""
                if ($value -is [array]) {
                    $displayValue = "[Array: $($value.Count) items]"
                } elseif ($value -is [PSCustomObject]) {
                    $subKeys = $value.PSObject.Properties.Name
                    $displayValue = "{$($subKeys -join ', ')}"
                } elseif ($value -is [string]) {
                    $displayValue = """$($value.Substring(0, [Math]::Min(40, $value.Length)))$(if ($value.Length -gt 40) { '...' })"""
                } elseif ($value -eq $null) {
                    $displayValue = "null"
                } else {
                    $displayValue = $value
                }
                
                Write-Host "    • $($name): $displayValue ($type)" -ForegroundColor Gray
            }
            
            # Show nested objects
            if ($charge.test) {
                Write-Host ""
                Write-Host "  📌 Nested Object - charge.test:" -ForegroundColor Yellow
                Write-Host "  ────────────────────────────────" -ForegroundColor Yellow
                
                foreach ($property in $charge.test.PSObject.Properties) {
                    $name = $property.Name
                    $value = $property.Value
                    $type = if ($value -is [array]) { "array" } elseif ($value -is [PSCustomObject]) { "object" } elseif ($value -eq $null) { "null" } else { $value.GetType().Name }
                    
                    $displayValue = ""
                    if ($value -is [array]) {
                        $displayValue = "[Array: $($value.Count) items]"
                    } elseif ($value -is [PSCustomObject]) {
                        $subKeys = $value.PSObject.Properties.Name
                        $displayValue = "{$($subKeys -join ', ')}"
                    } elseif ($value -is [string]) {
                        $displayValue = """$($value.Substring(0, [Math]::Min(40, $value.Length)))$(if ($value.Length -gt 40) { '...' })"""
                    } elseif ($value -eq $null) {
                        $displayValue = "null"
                    } else {
                        $displayValue = $value
                    }
                    
                    Write-Host "      • $($name): $displayValue ($type)" -ForegroundColor Gray
                }
            }
            
            if ($charge.organization) {
                Write-Host ""
                Write-Host "  📌 Nested Object - charge.organization:" -ForegroundColor Yellow
                Write-Host "  ────────────────────────────────" -ForegroundColor Yellow
                
                foreach ($property in $charge.organization.PSObject.Properties) {
                    $name = $property.Name
                    $value = $property.Value
                    $type = if ($value -is [array]) { "array" } elseif ($value -is [PSCustomObject]) { "object" } elseif ($value -eq $null) { "null" } else { $value.GetType().Name }
                    
                    $displayValue = ""
                    if ($value -is [array]) {
                        $displayValue = "[Array: $($value.Count) items]"
                    } elseif ($value -is [PSCustomObject]) {
                        $subKeys = $value.PSObject.Properties.Name
                        $displayValue = "{$($subKeys -join ', ')}"
                    } elseif ($value -is [string]) {
                        $displayValue = """$($value.Substring(0, [Math]::Min(40, $value.Length)))$(if ($value.Length -gt 40) { '...' })"""
                    } elseif ($value -eq $null) {
                        $displayValue = "null"
                    } else {
                        $displayValue = $value
                    }
                    
                    Write-Host "      • $($name): $displayValue ($type)" -ForegroundColor Gray
                }
            }
        }
    }
    
    # Summary statistics
    Write-Host ""
    Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "📊 Summary Statistics" -ForegroundColor Cyan
    Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""
    
    if ($data.data) {
        Write-Host "Total Charges: $($data.data.Count)" -ForegroundColor White
        
        if ($data.data.Count -gt 0) {
            $uniqueTests = @($data.data | ForEach-Object { $_.testId } | Select-Object -Unique)
            $uniqueOrgs = @($data.data | ForEach-Object { $_.organizationId } | Select-Object -Unique)
            
            Write-Host "Unique Tests: $($uniqueTests.Count)" -ForegroundColor White
            Write-Host "Unique Organizations: $($uniqueOrgs.Count)" -ForegroundColor White
            
            $totalB2C = ($data.data | Measure-Object -Property b2cCharge -Sum).Sum
            $totalB2B = ($data.data | Measure-Object -Property b2bCharge -Sum).Sum
            
            $avgB2C = $totalB2C / $data.data.Count
            $avgB2B = $totalB2B / $data.data.Count
            
            Write-Host "Average B2C Charge: ₹$($avgB2C.ToString('F2'))" -ForegroundColor White
            Write-Host "Average B2B Charge: ₹$($avgB2B.ToString('F2'))" -ForegroundColor White
        }
    }
    
    Write-Host ""
    Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""
    
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Make sure:" -ForegroundColor Yellow
    Write-Host "  1. The server is running on http://localhost:$Port" -ForegroundColor Yellow
    Write-Host "  2. The organization ID `"$OrgId`" exists in the database" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""
    exit 1
}

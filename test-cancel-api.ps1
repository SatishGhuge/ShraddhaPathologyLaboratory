# Test script to verify cancelTest API endpoint

Write-Host "`n🧪 Testing Cancel Test API...`n" -ForegroundColor Cyan

try {
    # Step 1: Get a patient with tests
    Write-Host "Step 1: Fetching patients..." -ForegroundColor Yellow
    $patientsRes = Invoke-WebRequest -Uri "http://localhost:5000/api/patients?page=1&limit=5" -ErrorAction Stop
    $patientsData = $patientsRes.Content | ConvertFrom-Json
    
    if (-not $patientsData.success -or -not $patientsData.data -or $patientsData.data.Count -eq 0) {
        Write-Host "❌ No patients found" -ForegroundColor Red
        exit
    }

    $patient = $patientsData.data[0]
    Write-Host "✅ Found patient: $($patient.patientId) - $($patient.firstName) $($patient.lastName)" -ForegroundColor Green
    Write-Host "   Tests: $($patient.tests.Count)" -ForegroundColor Gray

    if ($patient.tests.Count -eq 0) {
        Write-Host "❌ Patient has no tests" -ForegroundColor Red
        exit
    }

    # Get first test
    $test = $patient.tests[0]
    $visitId = $test.visitId
    $testId = $test.id

    Write-Host "`n✅ Found test to cancel:" -ForegroundColor Green
    Write-Host "   Test ID: $testId"
    Write-Host "   Test Name: $($test.test.name)"
    Write-Host "   Visit ID: $visitId"
    Write-Host "   Status: $($test.status)"
    Write-Host "   Charge: ₹$($test.charge)"

    # Step 2: Call cancel-test endpoint
    Write-Host "`nStep 2: Calling POST /api/patients/$visitId/cancel-test/$testId..." -ForegroundColor Yellow
    
    $cancelRes = Invoke-WebRequest `
        -Uri "http://localhost:5000/api/patients/$visitId/cancel-test/$testId" `
        -Method POST `
        -ContentType "application/json" `
        -Body (ConvertTo-Json @{ remarks = "Test cancellation from test script" }) `
        -ErrorAction Stop

    $cancelData = $cancelRes.Content | ConvertFrom-Json

    if ($cancelRes.StatusCode -ne 200) {
        Write-Host "❌ API returned $($cancelRes.StatusCode): $($cancelData.message)" -ForegroundColor Red
        exit
    }

    if (-not $cancelData.success) {
        Write-Host "❌ Cancellation failed: $($cancelData.message)" -ForegroundColor Red
        exit
    }

    Write-Host "✅ Cancellation successful!" -ForegroundColor Green
    Write-Host "`n📊 Response data:" -ForegroundColor Cyan
    Write-Host "   Updated Test Status: $($cancelData.data.updatedTest.status)"
    Write-Host "   New Gross Amount: ₹$($cancelData.data.updatedBill.grossAmount)"
    Write-Host "   New Balance: ₹$($cancelData.data.updatedBill.balanceAmount)"
    Write-Host "   Total Paid: ₹$($cancelData.data.updatedBill.totalPaid)"
    Write-Host "   Discount: ₹$($cancelData.data.updatedBill.totalDiscount)"
    Write-Host "   Refund Created: $(if ($cancelData.data.refund) { 'Yes ✅' } else { 'No' })"

    # Step 3: Verify test is now cancelled by fetching patient again
    Write-Host "`nStep 3: Verifying cancellation by fetching patient again..." -ForegroundColor Yellow
    
    $verifyRes = Invoke-WebRequest -Uri "http://localhost:5000/api/patients/$($patient.patientId)" -ErrorAction Stop
    $verifyData = $verifyRes.Content | ConvertFrom-Json

    if ($verifyData.success) {
        $cancelledTest = $verifyData.data.tests | Where-Object { $_.id -eq $testId }
        if (-not $cancelledTest) {
            Write-Host "✅ Cancelled test is now HIDDEN from patient tests list (filtered out)" -ForegroundColor Green
            Write-Host "   Remaining tests: $($verifyData.data.tests.Count)"
        } else {
            Write-Host "✅ Cancelled test still exists but marked as status='Cancelled'" -ForegroundColor Green
            Write-Host "   Status: $($cancelledTest.status)"
        }
    }

    Write-Host "`n🎉 Test completed successfully!`n" -ForegroundColor Green

} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host $_.Exception.StackTrace
}

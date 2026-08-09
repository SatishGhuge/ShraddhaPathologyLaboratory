"use client";

import React, { useState, useEffect } from "react";
import { X, Plus, RefreshCcw, Pencil, Eye, Trash2 } from "lucide-react";

/*
 * ============================================================================
 * BOOKING DETAILS MODAL - NORMALIZED BILLING TABLE MAPPING
 * ============================================================================
 * 
 * ADD NEW TESTS (handleSave):
 * ├─ BillingSession created with:
 * │  ├─ sessionType: "ADD_TEST"
 * │  ├─ sequence: incremented from previous
 * │  └─ remarks: optional
 * │
 * ├─ BillDiscount created (if discount > 0):
 * │  ├─ discountType: "PERCENTAGE" | "FLAT"
 * │  ├─ discountValue: discountPercent or discountAmount
 * │  └─ appliedOnAmount: newTestsTotal
 * │
 * ├─ Payment created (if payment > 0):
 * │  ├─ amount: paymentAmount
 * │  └─ paymentMode
 * │
 * ├─ VisitBill updated with:
 * │  ├─ grossAmount: sum of all tests (old + new)
 * │  ├─ totalDiscount: sum of all discounts
 * │  ├─ totalPaid: sum of all payments
 * │  ├─ balanceAmount: recalculated
 * │  └─ status: "PENDING" | "PARTIAL" | "PAID"
 * │
 * └─ BillTransaction created:
 *    ├─ transactionType: "ADD_TEST"
 *    ├─ amount: newTestsTotal
 *    └─ balanceAfter: newBalance
 * 
 * ============================================================================
 */

interface BookingDetailsModalProps {
  booking: any;
  isOpen: boolean;
  onClose: () => void;
  businessType?: string;
  allTests?: any[];
  packagesList?: any[];
  onBookingUpdate?: (updatedBooking: any) => void;
}

const BookingDetailsModal: React.FC<BookingDetailsModalProps> = ({
  booking,
  isOpen,
  onClose,
  businessType = "B2C",
  allTests = [],
  packagesList = [],
  onBookingUpdate
}) => {
  const [testView, setTestView] = useState("all");
  const [searchTest, setSearchTest] = useState("");
  const [selectedPackage, setSelectedPackage] = useState<any>(null);
  const [packageSearch, setPackageSearch] = useState("");
  const [showPkgDropdown, setShowPkgDropdown] = useState(false);
  const [editingCharge, setEditingCharge] = useState<any>(null);
  const [discount, setDiscount] = useState(0); // ✅ Reset on modal open
  const [discountPercent, setDiscountPercent] = useState(0); // ✅ Reset on modal open
  const [discountRemark, setDiscountRemark] = useState("");
  // Map to new BillingSession/BillDiscount enum
  const [discountType, setDiscountType] = useState("FLAT");
  const [paymentMode, setPaymentMode] = useState(booking?.paymentMode || booking?.patientData?.paymentMode || "Cash");
  const [paymentAmount, setPaymentAmount] = useState(0); // ✅ ALWAYS start at 0 - this is for NEW payment input, not existing
  // Load tests from booking - these are the tests already added to this visit
  const [tests, setTests] = useState(booking?.tests && booking.tests.length > 0 ? booking.tests : []);
  // Track if new tests have been added (to enable/disable discount fields)
  const [newTestsAdded, setNewTestsAdded] = useState(false);
  const [initialTestCount] = useState(booking?.tests?.length || 0);

  // Fetch tests from backend when modal opens
  // This MUST be before the early return to avoid React hooks violation
  const [billingSummary, setBillingSummary] = useState<any>(null);
  
  useEffect(() => {
    const fetchTests = async () => {
      if (!booking?.visitId) {
        console.log('⚠️ No visitId provided to BookingDetailsModal');
        return;
      }
      
      try {
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';
        const url = `${API_BASE_URL}/patients/tests-by-visit?visitId=${booking.visitId}`;
        console.log('🔍 Fetching tests from:', url);
        
        const response = await fetch(url);
        const result = await response.json();
        
        console.log('🔍 API Response:', result);
        
        if (result.success && result.data) {
          console.log('✅ Fetched tests from PatientTest table:', result.data);
          
          // If data is an array (old format), use it as tests
          if (Array.isArray(result.data)) {
            console.log('📋 Using array format, setting', result.data.length, 'tests');
            setTests(result.data);
          } else if (result.data.tests) {
            // New format with tests and billingSummary
            console.log('📋 Using object format with tests array, setting', result.data.tests.length, 'tests');
            setTests(result.data.tests);
            if (result.data.billingSummary) {
              console.log('💰 RAW Billing Summary from backend:', JSON.stringify(result.data.billingSummary));
              setBillingSummary(result.data.billingSummary);
              console.log('✅ billingSummary state set with totalDiscount:', result.data.billingSummary.totalDiscount);
            }
          } else {
            console.warn('⚠️ Unexpected response structure:', result.data);
            setTests([]);
          }
        } else {
          console.warn('⚠️ API returned unsuccessful response:', result);
          setTests([]);
        }
      } catch (error) {
        console.error('❌ Error fetching tests:', error);
        // Fall back to using booking.tests if API fails
        if (booking?.tests && booking.tests.length > 0) {
          console.log('📋 Using fallback tests from booking.tests');
          setTests(booking.tests);
        } else {
          setTests([]);
        }
      }
    };
    
    if (isOpen) {
      fetchTests();
    }
  }, [isOpen, booking?.visitId]);

  // ✅ Cleanup: Clear all form states when modal closes
  useEffect(() => {
    if (!isOpen) {
      console.log('🧹 Clearing BookingDetailsModal form states on close');
      setSearchTest("");
      setTestView("all");
      setSelectedPackage(null);
      setPackageSearch("");
      setShowPkgDropdown(false);
      setEditingCharge(null);
      setDiscount(0);
      setDiscountPercent(0);
      setDiscountRemark("");
      setDiscountType("FLAT");
      setPaymentAmount(0);
      setTests([]);
      setBillingSummary(null);
      setNewTestsAdded(false);
    }
  }, [isOpen]);

  if (!isOpen || !booking) return null;

  // Filter tests based on search (no useMemo to avoid hook mismatch errors)
  let displayTests: any[] = [];
  if (testView === "packages" && selectedPackage) {
    displayTests = selectedPackage.tests?.filter((t: any) =>
      t.name.toLowerCase().includes(searchTest.toLowerCase())
    ) || [];
  } else {
    displayTests = allTests.filter((t: any) =>
      t.name.toLowerCase().includes(searchTest.toLowerCase())
    );
  }

  // ============================================================================
  // BILLING CALCULATION LOGIC - Map to new VisitBill/BillDiscount/Payment structure
  // ============================================================================
  
  // Use backend summary if available, otherwise calculate locally
  let finalGrandTotal, finalInitialDiscount, finalInitialAmount, finalNewTestTotal, finalNewDiscount, finalNetAmount, finalBalance;
  
  console.log('🔍 BILLING STATE DEBUG:', {
    'billingSummary exists': !!billingSummary,
    'billingSummary.grossAmount': billingSummary?.grossAmount,
    'billingSummary.totalDiscount': billingSummary?.totalDiscount,
    'billingSummary.balanceAmount': billingSummary?.balanceAmount,
    'billingSummary.totalPaid': billingSummary?.totalPaid,
    'booking.billing': booking?.billing
  });
  
  if (billingSummary && billingSummary.grossAmount) {
    // ✅ NEW: Map from VisitBill normalized structure (after backend fix)
    finalGrandTotal = parseFloat(billingSummary.grossAmount) || 0;
    finalInitialDiscount = parseFloat(billingSummary.totalDiscount) || 0;
    finalInitialAmount = finalGrandTotal - finalInitialDiscount;
    finalNewTestTotal = 0;  // No separate new tests in normalized structure
    finalNewDiscount = 0;
    finalNetAmount = finalGrandTotal - finalInitialDiscount;
    finalBalance = parseFloat(billingSummary.balanceAmount) || 0;
    
    console.log('✅ Using VisitBill from backend (FRESH DATA):', {
      grossAmount: finalGrandTotal,
      totalDiscount: finalInitialDiscount,
      balanceAmount: finalBalance,
      totalPaid: billingSummary.totalPaid,
      status: billingSummary.status,
      rawBillingSummary: JSON.stringify(billingSummary)
    });
  } else {
    // Local fallback calculation using old field names
    const advanceFromDB = parseFloat(booking?.billing?.paidAmount) || parseFloat(booking?.paidAmount) || 0;
    const balanceAmountFromDB = parseFloat(booking?.billing?.balanceAmount) || parseFloat(booking?.balanceAmount) || 0;
    const existingDiscountAmountFromDB = parseFloat(booking?.billing?.discountAmount) || parseFloat(booking?.billing?.totalDiscount) || parseFloat(booking?.discountAmount) || 0;
    
    finalGrandTotal = parseFloat(booking?.billing?.grossAmount) || (advanceFromDB + balanceAmountFromDB + existingDiscountAmountFromDB) || 0;
    finalInitialDiscount = existingDiscountAmountFromDB;
    finalInitialAmount = finalGrandTotal - finalInitialDiscount;
    finalBalance = balanceAmountFromDB;
    finalNewTestTotal = 0;
    finalNewDiscount = 0;
    finalNetAmount = finalInitialAmount;
    
    console.log('⚠️ Using fallback calculation (billingSummary not available):', {
      grossAmount: finalGrandTotal,
      totalDiscount: finalInitialDiscount,
      balanceAmount: finalBalance,
      bookingBillingObject: booking?.billing
    });
  }
  
  // ✅ NOW CALCULATE NEW TEST CHARGES FOR DISPLAY
  // When user adds new tests, calculate their totals locally for preview
  const newTestsAddedToModal = tests.filter(t => !t.isExisting);
  const newTestsChargeTotal = newTestsAddedToModal.reduce((sum, t) => {
    const charge = businessType === "B2C" ? (t.b2cCharge || t.charge || 0) : (t.b2bCharge || t.charge || 0);
    return sum + charge;
  }, 0);
  
  // ✅ NEW LOGIC: Discount applies to BALANCE AMOUNT (not just new tests)
  // New total balance = existing balance + new test charges
  const newTotalBalance = finalBalance + newTestsChargeTotal;
  
  // Calculate discount on TOTAL BALANCE (not just new tests)
  let newTestDiscountForPreview = 0;
  if (discountPercent > 0 && newTotalBalance > 0) {
    newTestDiscountForPreview = Math.round((newTotalBalance * discountPercent) / 100);
  } else if (discount > 0) {
    newTestDiscountForPreview = discount;
  }
  
  const newTestsNetForPreview = newTotalBalance - newTestDiscountForPreview;
  
  // Display values - get from billingSummary or fallback to booking data
  // ✅ NEW LOGIC: Discount applies to balance, not just new tests
  const balanceBeforeDiscount = finalBalance + newTestsChargeTotal;  // Balance before discount
  
  // ✅ FIX: TOTAL DISCOUNT from DB (not just previous session)
  // finalInitialDiscount already contains the AGGREGATE total from billingSummary.totalDiscount OR booking.billing.discountAmount/totalDiscount
  const previousDiscount = parseFloat(String(finalInitialDiscount)) || 0;  // Ensure it's a number
  const previousDiscountPercent = billingSummary?.totalDiscountPercent ? Math.round(billingSummary.totalDiscountPercent) : (finalGrandTotal > 0 ? Math.round((previousDiscount / finalGrandTotal) * 100) : 0);
  const aggregateDiscountAmount = previousDiscount + newTestDiscountForPreview;  // AGGREGATE - for SUMMARY
  
  console.log('📊 Final Bill Display Values:', {
    finalGrandTotal,
    finalInitialDiscount,
    finalBalance,
    previousDiscount,
    newTestDiscountForPreview,
    aggregateDiscountAmount,
    newTestsAdded,
    billingSummaryExists: !!billingSummary,
    billingSummaryTotalDiscount: billingSummary?.totalDiscount
  });
  
  console.log('📊 Calculation Debug:', {
    finalBalance,
    newTestsChargeTotal,
    newTotalBalance,
    discountPercent,
    newTestDiscountForPreview,
    previousDiscount,
    aggregateDiscountAmount,
    balanceBeforeDiscount
  });
  
  // ✅ FIX: Calculate totals correctly
  const grandTotal = finalGrandTotal + newTestsChargeTotal;  // Total gross with new tests
  
  const newTestsTotal = newTestsChargeTotal;
  const newTestDiscountAmount = newTestDiscountForPreview;  // Applied to balance
  
  // ✅ Get ADVANCE from database (cumulative payment across all sessions)
  const advanceFromDB = billingSummary?.totalPaid 
    ? parseFloat(billingSummary.totalPaid) 
    : (booking?.billing?.paidAmount || booking?.paidAmount || 0);
  
  // ✅ For Net Amount and Balance: Apply aggregate discount to balance
  const balanceAfterAggregateDiscount = Math.max(0, balanceBeforeDiscount - aggregateDiscountAmount);
  
  // ✅ CORRECT: Calculate discount % based on TOTAL GROSS AMOUNT
  const totalTestCharges = finalGrandTotal + newTestsChargeTotal;  // All test charges
  const aggregateDiscountPercent = totalTestCharges > 0 ? Math.round((aggregateDiscountAmount / totalTestCharges) * 100) : 0;
  
  // ✅ For display in Grand Total (shows EXISTING state, not aggregate)
  const displayedBalanceAmount = Math.max(0, grandTotal - advanceFromDB);
  const displayedNetAmount = Math.max(0, displayedBalanceAmount - paymentAmount);
  const finalBalanceAmount = paymentAmount >= displayedBalanceAmount ? 0 : displayedBalanceAmount;
  
  const paymentExceeds = paymentAmount > displayedBalanceAmount;
  const newTestsNetAmount = newTestsTotal - newTestDiscountAmount;
  
  // ✅ NEW: Calculate remaining balance after all discounts and payments
  // Advance = Total of ALL payments made (cumulative) + NEW payment being entered
  // Balance = Gross - Discount - All Payments Made
  const totalAmountDue = finalGrandTotal - previousDiscount;  // After discount
  
  // ✅ KEY: Add the NEW payment amount to the existing advance
  const totalAdvancePaid = advanceFromDB + paymentAmount;  // Cumulative: previous + new
  const remainingBalance = Math.max(0, totalAmountDue - totalAdvancePaid);  // What's still owed
  
  const totalAmountDueAfterNewDiscount = (finalGrandTotal + newTestsChargeTotal - previousDiscount - newTestDiscountForPreview);
  const remainingBalanceAfterNewDiscount = Math.max(0, totalAmountDueAfterNewDiscount - totalAdvancePaid);
  
  // ✅ Determine if should show Advance field (only if something was paid or will be paid)
  const shouldShowAdvance = totalAdvancePaid > 0;

  const handleAddTest = (test: any, pkg?: any) => {
    if (!tests.find(t => t.name === test.name)) {
      const newTest = {
        ...test,
        isExisting: false,
        b2cCharge: pkg ? Math.round(pkg.b2cCharge / (pkg.tests.length || 1)) : (test.b2cCharge || test.charge || 0),
        b2bCharge: pkg ? Math.round(pkg.b2bCharge / (pkg.tests.length || 1)) : (test.b2bCharge || test.charge || 0),
        fromPackage: pkg?.name || null
      };
      setTests([...tests, newTest]);
      setNewTestsAdded(true); // Enable discount fields when new test is added
    }
  };

  const handleDeleteTest = (testName: string) => {
    const testToDelete = tests.find(t => t.name === testName);
    if (testToDelete && testToDelete.isExisting) {
      // If deleting existing test, subtract from balance
      const testCharge = businessType === "B2C" ? (testToDelete.b2cCharge || testToDelete.charge || 0) : (testToDelete.b2bCharge || testToDelete.charge || 0);
      console.log(`Deleting existing test: ${testName}, charge: ${testCharge}`);
      // This will trigger recalculation on next render
    }
    
    const updatedTests = tests.filter(t => t.name !== testName);
    setTests(updatedTests);
    
    // ✅ Reset discount when test is deleted
    setDiscountPercent(0);
    setDiscount(0);
    
    // ✅ If no new tests left, reset newTestsAdded flag
    const remainingNewTests = updatedTests.filter(t => !t.isExisting);
    if (remainingNewTests.length === 0) {
      setNewTestsAdded(false);
    }
  };

  const handleSaveCharge = (testName: string) => {
    if (editingCharge && editingCharge.testName === testName) {
      const updatedTests = tests.map(t =>
        t.name === testName ? { ...t, b2cCharge: parseFloat(editingCharge.value) || 0 } : t
      );
      setTests(updatedTests);
      setEditingCharge(null);
    }
  };

  const handleSave = async () => {
    // Check if new tests were added
    const newTests = tests.filter(t => !t.isExisting);
    
    if (newTests.length === 0) {
      // No new tests - just close modal
      console.log('ℹ️ No new tests added, closing modal');
      onClose();
      return;
    }

    console.log('💾 Saving new tests to existing visit...', {
      newTestsCount: newTests.length,
      discountPercent,
      discount,
      visitId: booking.visitId,
      patientId: booking.patientId
    });

    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';
      
      // Call backend endpoint to add tests to existing visit
      const response = await fetch(`${API_BASE_URL}/patients/add-tests-to-visit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: booking.patientId,
          visitId: booking.visitId,
          tests: newTests.map(t => ({
            id: t.id,
            name: t.name,
            sample: t.sample,
            sampleTypeId: t.sampleTypeId,
            departmentId: t.departmentId,
            charge: businessType === "B2C" ? (t.b2cCharge || t.charge || 0) : (t.b2bCharge || t.charge || 0),
            b2cCharge: t.b2cCharge,
            b2bCharge: t.b2bCharge,
            outsourcedTo: t.outsourcedTo || null
          })),
          // NEW: Map to BillingSession and BillDiscount enums
          billingSession: {
            sessionType: "ADD_TEST",
            remarks: discountRemark || null,
            createdBy: null
          },
          discount: {
            discountType: discountPercent > 0 ? "PERCENTAGE" : "FLAT",
            discountValue: discountPercent || discount || 0,
            discountAmount: discount || 0,
            discountPercent: discountPercent || 0,
            discountRemark: discountRemark || null
          },
          payment: {
            paymentMode: paymentMode,
            amount: paymentAmount || 0
          },
          businessType
        })
      });

      const result = await response.json();
      console.log('✅ Backend response:', result);

      if (!response.ok) {
        throw new Error(result.message || 'Failed to save tests');
      }

      console.log('✅ Tests saved successfully to PatientTest table');
      console.log('📊 New totals:', {
        totalAmount: result.data.totalAmount,
        balanceAmount: result.data.balanceAmount,
        discountAmount: result.data.discountAmount
      });

      // Check if new barcodes are needed
      if (result.data.needsNewBarcode) {
        console.log('🎫 New barcodes needed for different sample types');
        console.log('📋 New tests by barcode:', result.data.newTestsByBarcode);
      }

      // Update the booking with new totals from VisitBill
      const updatedBooking = {
        ...booking,
        tests: result.data.allTests.map((t: any) => ({
          ...t,
          isExisting: true // Mark all as existing now since they're in DB
        })),
        // NEW: Update with VisitBill normalized structure
        billing: {
          grossAmount: result.data.visitBill?.grossAmount || result.data.totalAmount || 0,
          totalDiscount: result.data.visitBill?.totalDiscount || result.data.discountAmount || 0,
          discountPercent: result.data.visitBill?.totalDiscount ? 
            Math.round((result.data.visitBill.totalDiscount / result.data.visitBill.grossAmount) * 100) :
            discountPercent || 0,
          discountAmount: result.data.visitBill?.totalDiscount || result.data.discountAmount || 0,
          discountRemark: discountRemark,
          paidAmount: paymentAmount || 0,
          balanceAmount: result.data.visitBill?.balanceAmount || result.data.balanceAmount || 0,
          status: result.data.visitBill?.status || "PENDING"
        },
        patientData: {
          ...booking.patientData,
          paymentMode
        }
      };

      onBookingUpdate?.(updatedBooking);
      
      // ✅ Build success message
      const messages: string[] = [];
      if (newTests.length > 0) {
        messages.push(`✅ ${newTests.length} new test(s) added successfully`);
      }
      messages.push(`✅ Payment updated successfully`);
      
      const successMessage = messages.join('\n');
      alert(successMessage);
      
      // ✅ Reset payment field to 0
      setPaymentAmount(0);
      
      onClose();

    } catch (error) {
      console.error('❌ Error saving tests:', error);
      alert('Failed to save tests: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  const numInput = "border border-gray-300 rounded px-2 py-1 w-full text-sm text-right focus:outline-none focus:ring-2 focus:ring-orange-500";
  const style = {
    input: "border border-gray-300 bg-white rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500",
    btn: "px-3 py-1 rounded text-xs font-semibold flex items-center gap-1"
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col">
        {/* HEADER */}
        <div className="bg-cyan-900 text-white p-3 flex justify-between items-center flex-shrink-0">
          <div className="flex-1">
            <h2 className="font-bold text-base">{booking.name}</h2>
            <p className="text-xs text-yellow-300">UID: {booking.patientId} | Visit: {booking.visitId || booking.bookingId}</p>
          </div>
          <div className="flex gap-2">
            <button className="bg-orange-100 text-black px-3 py-1 rounded text-xs font-semibold hover:bg-orange-200">Bill</button>
            <button className="bg-orange-100 text-black px-3 py-1 rounded text-xs font-semibold hover:bg-orange-200">Refund</button>
            <button onClick={onClose} className="bg-red-500 p-1 rounded hover:bg-red-600 text-white">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-hidden flex gap-3 p-3">
          {/* LEFT COLUMN - TEST SELECTION */}
          <div className="w-1/3 flex flex-col bg-white rounded shadow overflow-hidden">
            {/* Search Section */}
            <div className="p-2 flex gap-2 border-b items-center flex-shrink-0">
              {testView === "packages" ? (
                <div className="relative flex-1">
                  <input
                    autoFocus
                    placeholder="Search package..."
                    value={packageSearch}
                    onChange={e => {
                      setPackageSearch(e.target.value);
                      setSelectedPackage(null);
                    }}
                    onFocus={() => setShowPkgDropdown(true)}
                    onBlur={() => setTimeout(() => setShowPkgDropdown(false), 150)}
                    className={`${style.input} w-full`}
                  />
                  {showPkgDropdown && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded shadow-lg z-50 max-h-56 overflow-y-auto">
                      {packagesList
                        .filter(p => p.name.toLowerCase().includes(packageSearch.toLowerCase()))
                        .map(pkg => (
                          <div
                            key={pkg.id}
                            onMouseDown={e => e.preventDefault()}
                            onClick={() => {
                              setSelectedPackage(pkg);
                              setPackageSearch(pkg.name);
                              setShowPkgDropdown(false);
                              setSearchTest("");
                            }}
                            className={`px-3 py-2 cursor-pointer border-b last:border-b-0 text-sm transition-colors ${
                              selectedPackage?.id === pkg.id ? "bg-orange-100 font-semibold" : "hover:bg-orange-50"
                            }`}
                          >
                            <div className="font-medium text-gray-800">{pkg.name}</div>
                            <div className="text-xs text-gray-500">
                              {pkg.tests.length} test{pkg.tests.length !== 1 ? "s" : ""} · B2C ₹{pkg.b2cCharge} · B2B ₹{pkg.b2bCharge}
                            </div>
                          </div>
                        ))}
                      {packagesList.filter(p => p.name.toLowerCase().includes(packageSearch.toLowerCase())).length === 0 && (
                        <div className="p-3 text-center text-gray-400 text-sm">No packages found</div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <input
                  placeholder="Search for test"
                  value={searchTest}
                  onChange={e => setSearchTest(e.target.value)}
                  className={`${style.input} flex-1`}
                />
              )}
              <button
                onClick={() => {
                  setTestView("all");
                  setSearchTest("");
                  setSelectedPackage(null);
                  setPackageSearch("");
                  setShowPkgDropdown(false);
                }}
                className={`${testView === "all" ? "bg-orange-600" : "bg-cyan-900"} text-white px-2 py-1 rounded shrink-0 hover:bg-orange-600`}
                title="All Tests"
              >
                <RefreshCcw size={14} />
              </button>
              <button
                onClick={() => {
                  setTestView("packages");
                  setSearchTest("");
                  setPackageSearch("");
                  setSelectedPackage(null);
                  setTimeout(() => setShowPkgDropdown(true), 50);
                }}
                className={`${testView === "packages" ? "bg-orange-600" : "bg-cyan-900"} text-white px-2 py-1 rounded shrink-0 hover:bg-orange-600`}
                title="Packages"
              >
                <Plus size={14} />
              </button>
            </div>

            {/* Tests List */}
            <div className="flex-1 overflow-y-auto max-h-96">
              <div className="bg-cyan-900 text-white text-xs font-semibold px-2 py-1 sticky top-0 grid grid-cols-3 gap-2">
                <div className="col-span-2">Test Name</div>
                <div className="text-right">Charges</div>
              </div>

              {testView === "packages" && !selectedPackage ? (
                <div className="flex items-center justify-center h-full text-gray-400 text-xs p-4">
                  Select a package
                </div>
              ) : displayTests.length > 0 ? (
                displayTests.map((t, i) => (
                  <div
                    key={i}
                    onClick={() => handleAddTest(t, selectedPackage)}
                    className="border-b px-2 py-2 text-xs cursor-pointer hover:bg-gray-50 transition-colors grid grid-cols-3 gap-2 items-center"
                  >
                    <div className="col-span-2 font-medium text-gray-800 flex items-center gap-2">
                      <Plus size={13} className="text-orange-500" />
                      <span className="truncate">{t.name}</span>
                    </div>
                    <div className="text-right text-gray-700">₹{t.b2cCharge || t.charge || 0}</div>
                  </div>
                ))
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400 text-xs p-4">
                  No tests found
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN - TESTS & BILLING */}
          <div className="w-2/3 flex flex-col gap-3 overflow-hidden">
            {/* Tests Table */}
            <div className="bg-white rounded shadow flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto max-h-64">
                <table className="w-full text-xs">
                  <thead className="bg-cyan-900 text-white sticky top-0">
                    <tr>
                      <th className="p-1 text-left">#</th>
                      <th className="p-1 text-left">Test   <span className="text-yellow-300 text-sm">{tests.length}</span></th>
                      <th className="p-1 text-center">Date</th>
                      <th className="p-1 text-center">Amt</th>
                      <th className="p-1 text-center">📝</th>
                      <th className="p-1 text-center">✓</th>
                      <th className="p-1 text-center">Act</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tests.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-2 text-center text-gray-400 text-xs">
                          No tests added
                        </td>
                      </tr>
                    ) : (
                      tests.map((t, i) => {
                        const charge = businessType === "B2C" ? (t.b2cCharge || t.charge || 0) : (t.b2bCharge || t.charge || 0);
                        const isEditing = editingCharge?.testName === t.name;
                        const isNewTest = !t.isExisting; // Mark new tests
                        return (
                          <tr key={i} className={`border-b text-xs hover:bg-gray-50 ${isNewTest ? "bg-blue-50" : ""}`}>
                            <td className="p-1 text-center font-medium">{i + 1}</td>
                            <td className="p-1">
                              <div className="flex items-center gap-1">
                                {isNewTest && (
                                  <span className="text-blue-600 font-bold text-xs">N</span>
                                )}
                                <span>{t.name}</span>
                              </div>
                            </td>
                            <td className="p-1 text-center">{booking.date}</td>
                            <td className="p-1 text-center">
                              {isEditing ? (
                                <input
                                  type="number"
                                  autoFocus
                                  value={editingCharge.value}
                                  onChange={e => setEditingCharge({ ...editingCharge, value: e.target.value })}
                                  onBlur={() => handleSaveCharge(t.name)}
                                  onKeyDown={e => {
                                    if (e.key === "Enter") handleSaveCharge(t.name);
                                    if (e.key === "Escape") setEditingCharge(null);
                                  }}
                                  className="w-12 border border-gray-300 rounded px-0.5 py-0 text-center text-xs"
                                />
                              ) : (
                                <span className="font-semibold">₹{charge}</span>
                              )}
                            </td>
                            <td className="p-1 text-center">
                              <button
                                onClick={() => setEditingCharge({ testName: t.name, value: charge })}
                                className="text-orange-600 hover:text-orange-800"
                                title="Edit"
                              >
                                <Pencil size={11} />
                              </button>
                            </td>
                            <td className="p-1 text-center">
                              <input type="checkbox" className="w-3 h-3 accent-blue-500" />
                            </td>
                            <td className="p-1 text-center">
                              <button
                                onClick={() => handleDeleteTest(t.name)}
                                className="text-red-600 hover:text-red-800"
                                title="Delete"
                              >
                                <X size={12} />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Billing Details - Compact Layout */}
            <div className="bg-white rounded shadow p-2 flex-shrink-0">
              {/* Grand Total Row */}
              <div className="flex gap-2 mb-2 items-end">
                <div className="flex-1">
                  <div className="text-xs font-semibold text-gray-700 mb-1">Grand Total</div>
                  <div className="flex gap-1.5 items-end">
                    {[
                      { label: "Grand Total", val: (finalGrandTotal + newTestsChargeTotal).toFixed(0), ro: true, color: "text-orange-600" },
                      // Only show Advance if something was paid or will be paid
                      ...(shouldShowAdvance ? [
                        { label: "Advance", val: totalAdvancePaid.toFixed(0), ro: true, color: "text-blue-600" }
                      ] : []),
                      { label: "Dis", val: previousDiscount.toFixed(0), ro: true, color: "text-yellow-600" }, // ✅ Shows TOTAL aggregate discount from DB
                      { label: "Bal", val: (newTestsAdded 
                        ? Math.max(0, (finalGrandTotal + newTestsChargeTotal) - (previousDiscount + newTestDiscountForPreview) - totalAdvancePaid)
                        : Math.max(0, finalGrandTotal - previousDiscount - totalAdvancePaid)
                      ).toFixed(0), ro: true, color: "text-red-600" },
                    ].map((item, i) => (
                      <div key={i} className="flex-1">
                        <div className={`${item.color} font-bold text-xs text-center mb-0.5`}>{item.label}</div>
                        <input
                          type="number"
                          value={item.val}
                          readOnly={item.ro}
                          className={`${numInput} text-xs h-6 ${item.ro ? "bg-gray-50 font-bold cursor-not-allowed" : ""}`}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* New Test Charges Row (Same line if added) */}
                {newTestsAdded && newTestsTotal > 0 && (
                  <div className="flex-1 bg-blue-50 p-1.5 rounded border border-blue-200">
                    <div className="text-xs font-bold text-blue-700 mb-1 flex items-center gap-1">
                      <span className="text-blue-600 font-bold">N</span>
                      New Tests
                    </div>
                    <div className="flex gap-1.5 items-end">
                      {[
                        { label: "Dis%", val: discountPercent > 0 ? discountPercent.toFixed(0) : '', ro: false, color: "text-gray-600" },
                        { label: "DisAmt", val: newTestDiscountAmount > 0 ? newTestDiscountAmount.toFixed(0) : '', ro: true, color: "text-green-600" },
                      ].map((item, i) => (
                        <div key={i} className="flex-1">
                          <div className={`${item.color} font-bold text-xs text-center mb-0.5`}>{item.label}</div>
                          <input
                            type="number"
                            value={item.val}
                            placeholder=""
                            readOnly={item.ro}
                            onChange={
                              item.label === "Dis%"
                                ? e => {
                                    setDiscountPercent(parseFloat(e.target.value) || 0);
                                    setDiscount(0);
                                  }
                                : undefined
                            }
                            className={`${numInput} text-xs h-6 ${
                              item.ro ? "bg-gray-50 font-bold cursor-not-allowed" : ""
                            }`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Summary Row */}
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <div className="text-xs font-semibold text-gray-700 mb-1">Summary</div>
                  <div className="flex gap-1.5 items-end">
                    {[
                      // Only show Total Dis if new test was added and there's a discount
                      ...(newTestsAdded && (previousDiscount + newTestDiscountForPreview) > 0 ? [
                        { label: "Total Dis", val: (previousDiscount + newTestDiscountForPreview).toFixed(0), ro: true, color: "text-red-600" }
                      ] : []),
                      { label: "Net Amt", val: (newTestsAdded ? remainingBalanceAfterNewDiscount : remainingBalance).toFixed(0), ro: true, color: "text-purple-600" },
                      { label: "Payment", val: paymentAmount > 0 ? paymentAmount.toFixed(0) : '', ro: false, color: paymentExceeds ? "text-red-700" : "text-green-700" },
                    ].map((item, i) => (
                      <div key={i} className="flex-1">
                        <div className={`${item.color} font-bold text-xs text-center mb-0.5`}>{item.label}</div>
                        <input
                          type="number"
                          value={item.val}
                          placeholder=""
                          readOnly={item.ro}
                          onChange={
                            item.label === "Payment"
                              ? e => setPaymentAmount(parseFloat(e.target.value) || 0)
                              : undefined
                          }
                          className={`${numInput} text-xs h-6 ${item.ro ? "bg-gray-50 font-bold cursor-not-allowed" : ""} ${paymentExceeds && item.label === "Payment" ? "border-red-500 border-2" : ""}`}
                        />
                      </div>
                    ))}
                  </div>
                  {paymentExceeds && (
                    <div className="text-xs text-red-600 font-semibold mt-1">⚠️ Exceed amount: ₹{(paymentAmount - (newTestsAdded ? remainingBalanceAfterNewDiscount : remainingBalance)).toFixed(0)}</div>
                  )}
                </div>

                {/* Payment Mode & Discount Remark on same line */}
                <div className="flex gap-1.5 items-end flex-1">
                  <div className="flex-1">
                    <label className="text-xs font-semibold text-red-600 mb-0.5 block">Mode</label>
                    <select
                      value={paymentMode}
                      onChange={e => setPaymentMode(e.target.value)}
                      className={`${style.input} w-full bg-white text-xs h-6`}
                    >
                      <option>Cash</option>
                      <option>Card</option>
                      <option>UPI</option>
                      <option>Other</option>
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="text-xs font-semibold text-gray-600 mb-0.5 block">Remark</label>
                    <input
                      type="text"
                      value={discountRemark}
                      onChange={e => setDiscountRemark(e.target.value)}
                      placeholder=""
                      className="w-full border border-gray-300 rounded px-1 py-1 text-xs h-6"
                      disabled={!newTestsAdded}
                    />
                  </div>
                  <button
                    onClick={handleSave}
                    className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded font-semibold text-xs h-6"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingDetailsModal;

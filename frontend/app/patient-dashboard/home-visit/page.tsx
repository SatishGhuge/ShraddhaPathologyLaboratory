"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  MapPin,
  Calendar,
  Clock,
  ChevronRight,
  ChevronLeft,
  CheckCircle,
  TestTube,
  Phone,
  Mail,
  AlertCircle,
} from "lucide-react";

interface TimeSlot {
  time: string;
  available: boolean;
}

export default function PatientHomeVisitPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [patient, setPatient] = useState<any>(null);
  
  // Step 1: Tests
  const [availableTests, setAvailableTests] = useState<any[]>([]);
  const [selectedTestIds, setSelectedTestIds] = useState<Set<number>>(new Set());
  
  // Step 2: Schedule
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [address, setAddress] = useState("");
  const [instructions, setInstructions] = useState("");
  const [loadingSlots, setLoadingSlots] = useState(false);
  
  // Confirmation
  const [bookingComplete, setBookingComplete] = useState(false);
  const [bookingId, setBookingId] = useState("");
  const [errors, setErrors] = useState<any>({});

  // Initialize data
  useEffect(() => {
    const patientData = localStorage.getItem("patient");
    if (patientData) {
      const parsed = JSON.parse(patientData);
      setPatient(parsed);
      setAddress(parsed.address || "");
    }

    // Load available tests from master data or use mock
    const storedTests = localStorage.getItem("patientTests") || 
      JSON.stringify([
        { id: 1, name: "Complete Blood Count (CBC)", price: 300 },
        { id: 2, name: "Lipid Profile", price: 500 },
        { id: 3, name: "Thyroid Profile", price: 400 },
        { id: 4, name: "Liver Function Test", price: 600 },
      ]);
    setAvailableTests(JSON.parse(storedTests));
  }, []);

  // Generate time slots when date is selected
  useEffect(() => {
    if (selectedDate) {
      setLoadingSlots(true);
      // Simulate API call
      setTimeout(() => {
        const slots: TimeSlot[] = [];
        for (let i = 9; i < 17; i++) {
          slots.push({
            time: `${String(i).padStart(2, "0")}:00-${String(i + 1).padStart(2, "0")}:00`,
            available: Math.random() > 0.3, // 70% availability
          });
        }
        setTimeSlots(slots);
        setLoadingSlots(false);
      }, 500);
    }
  }, [selectedDate]);

  const toggleTestSelection = (testId: number) => {
    const newSelected = new Set(selectedTestIds);
    if (newSelected.has(testId)) {
      newSelected.delete(testId);
    } else {
      newSelected.add(testId);
    }
    setSelectedTestIds(newSelected);
  };

  const validateStep = () => {
    const newErrors: any = {};
    
    if (currentStep === 1) {
      if (selectedTestIds.size === 0) {
        newErrors.tests = "Please select at least one test";
      }
    } else if (currentStep === 2) {
      if (!selectedDate) {
        newErrors.date = "Please select a date";
      }
      if (!selectedTime) {
        newErrors.time = "Please select a time slot";
      }
      if (!address.trim()) {
        newErrors.address = "Please enter an address";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep()) {
      if (currentStep < 3) {
        setCurrentStep(currentStep + 1);
      } else {
        handleConfirmBooking();
      }
    }
  };

  const handleConfirmBooking = () => {
    const selectedTestsList = Array.from(selectedTestIds)
      .map((id) => availableTests.find((t) => t.id === id))
      .filter(Boolean);

    const booking = {
      id: `HV${Date.now()}`,
      testIds: Array.from(selectedTestIds),
      date: selectedDate,
      time: selectedTime,
      address,
      instructions,
      createdAt: new Date().toISOString(),
      status: "Scheduled",
      amount: selectedTestsList.reduce((sum: number, t: any) => sum + (t?.price || 0), 0),
    };

    // Store in localStorage
    const existingBookings = JSON.parse(localStorage.getItem("patientHomeVisits") || "[]");
    existingBookings.push(booking);
    localStorage.setItem("patientHomeVisits", JSON.stringify(existingBookings));

    setBookingId(booking.id);
    setBookingComplete(true);
  };

  const getMinDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    return date.toISOString().split("T")[0];
  };

  const getMaxDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return date.toISOString().split("T")[0];
  };

  const selectedTests = Array.from(selectedTestIds)
    .map((id) => availableTests.find((t) => t.id === id))
    .filter(Boolean);

  const totalAmount = selectedTests.reduce((sum: number, t: any) => sum + (t?.price || 0), 0);

  if (!patient) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[oklch(45%_0.085_224.283)]"></div>
      </div>
    );
  }

  if (bookingComplete) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl p-8 border border-gray-200 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} className="text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Booking Confirmed!</h1>
          <p className="text-gray-600 mb-6">Your home visit has been successfully scheduled.</p>
          
          <div className="bg-blue-50 rounded-lg p-6 mb-6 text-left space-y-3">
            <div>
              <p className="text-sm text-gray-500">Booking ID</p>
              <p className="font-bold text-gray-800 text-lg">{bookingId}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Scheduled Date</p>
                <p className="font-medium text-gray-800">
                  {new Date(selectedDate).toLocaleDateString("en-GB")}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Time Slot</p>
                <p className="font-medium text-gray-800">{selectedTime}</p>
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-500">Collection Address</p>
              <p className="font-medium text-gray-800">{address}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Tests Selected</p>
              <p className="font-medium text-gray-800">{selectedTests.length} test(s)</p>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 flex items-start gap-3">
            <AlertCircle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-left">
              <p className="text-sm font-medium text-amber-800">What to Expect</p>
              <p className="text-sm text-amber-700 mt-1">
                A phlebotomist will visit your address during the selected time slot. Please ensure someone is available at home.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => router.push("/patient-dashboard/bookings")}
              className="w-full px-6 py-3 bg-[oklch(45%_0.085_224.283)] text-white rounded-lg font-semibold hover:bg-[oklch(40%_0.075_224.283)] transition-colors"
            >
              View All Bookings
            </button>
            <button
              onClick={() => router.push("/patient-dashboard")}
              className="w-full px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Book Home Visit</h1>
        <p className="text-sm text-gray-500 mt-1">
          Schedule a home sample collection at your convenience
        </p>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2 md:gap-4">
        {[1, 2, 3].map((step) => (
          <div key={step} className="flex items-center flex-1">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${
                step <= currentStep
                  ? "bg-[oklch(45%_0.085_224.283)] text-white"
                  : "bg-gray-200 text-gray-600"
              }`}
            >
              {step}
            </div>
            {step < 3 && (
              <div
                className={`flex-1 h-1 mx-2 ${
                  step < currentStep ? "bg-[oklch(45%_0.085_224.283)]" : "bg-gray-200"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between text-xs md:text-sm text-gray-600 -mt-4 mb-4">
        <span>Select Tests</span>
        <span>Schedule</span>
        <span>Confirm</span>
      </div>

      {/* Step 1: Test Selection */}
      {currentStep === 1 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          <h2 className="text-lg font-bold text-gray-800">Step 1: Select Tests</h2>
          <p className="text-sm text-gray-600">Choose the tests you want to get sampled at home</p>

          {errors.tests && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {errors.tests}
            </div>
          )}

          <div className="space-y-3">
            {availableTests.map((test) => (
              <label
                key={test.id}
                className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  selectedTestIds.has(test.id)
                    ? "border-orange-500 bg-orange-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedTestIds.has(test.id)}
                  onChange={() => toggleTestSelection(test.id)}
                  className="w-5 h-5 accent-[oklch(45%_0.085_224.283)] rounded"
                />
                <div className="flex-1">
                  <p className="font-medium text-gray-800">{test.name}</p>
                </div>
                <p className="font-bold text-orange-600">₹{test.price}</p>
              </label>
            ))}
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-gray-700">
              <strong>Total Amount:</strong> ₹{totalAmount}
            </p>
          </div>
        </div>
      )}

      {/* Step 2: Schedule */}
      {currentStep === 2 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          <h2 className="text-lg font-bold text-gray-800">Step 2: Schedule Collection</h2>

          {/* Date Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Date *
            </label>
            {errors.date && (
              <p className="text-xs text-red-600 mb-2">{errors.date}</p>
            )}
            <div className="relative">
              <Calendar size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setErrors((prev: any) => ({ ...prev, date: "" }));
                }}
                min={getMinDate()}
                max={getMaxDate()}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[oklch(45%_0.085_224.283)]"
              />
            </div>
          </div>

          {/* Time Slot Selection */}
          {selectedDate && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Time Slot *
              </label>
              {errors.time && (
                <p className="text-xs text-red-600 mb-2">{errors.time}</p>
              )}
              {loadingSlots ? (
                <div className="text-center py-4 text-gray-500">Loading available slots...</div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {timeSlots.map((slot) => (
                    <button
                      key={slot.time}
                      onClick={() => {
                        if (slot.available) {
                          setSelectedTime(slot.time);
                          setErrors((prev: any) => ({ ...prev, time: "" }));
                        }
                      }}
                      disabled={!slot.available}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        !slot.available
                          ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                          : selectedTime === slot.time
                          ? "bg-orange-600 text-white"
                          : "border border-gray-200 text-gray-700 hover:border-orange-300"
                      }`}
                    >
                      <Clock size={14} className="inline mr-1" />
                      {slot.time}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Collection Address *
            </label>
            {errors.address && (
              <p className="text-xs text-red-600 mb-2">{errors.address}</p>
            )}
            <div className="relative">
              <MapPin size={20} className="absolute left-3 top-3 text-gray-400" />
              <textarea
                value={address}
                onChange={(e) => {
                  setAddress(e.target.value);
                  setErrors((prev: any) => ({ ...prev, address: "" }));
                }}
                placeholder="Enter your complete address"
                rows={3}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[oklch(45%_0.085_224.283)] resize-none"
              />
            </div>
          </div>

          {/* Special Instructions */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Special Instructions (Optional)
            </label>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Any special requirements or instructions for the phlebotomist..."
              rows={3}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[oklch(45%_0.085_224.283)] resize-none"
            />
          </div>
        </div>
      )}

      {/* Step 3: Confirmation */}
      {currentStep === 3 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          <h2 className="text-lg font-bold text-gray-800">Step 3: Review & Confirm</h2>

          <div className="space-y-4 bg-blue-50 p-4 rounded-lg">
            <div>
              <p className="text-sm text-gray-600">Tests Selected</p>
              <ul className="mt-2 space-y-1">
                {selectedTests.map((test: any) => (
                  <li key={test.id} className="flex justify-between text-sm text-gray-800">
                    <span>{test.name}</span>
                    <span className="font-medium">₹{test.price}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="border-t border-blue-200 pt-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Collection Date</span>
                <span className="font-medium text-gray-800">
                  {new Date(selectedDate).toLocaleDateString("en-GB")}
                </span>
              </div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Time Slot</span>
                <span className="font-medium text-gray-800">{selectedTime}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Address</span>
                <span className="font-medium text-gray-800 text-right">{address}</span>
              </div>
            </div>

            <div className="border-t border-blue-200 pt-4">
              <div className="flex justify-between">
                <span className="font-bold text-gray-800">Total Amount</span>
                <span className="font-bold text-orange-600 text-lg">₹{totalAmount}</span>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-left text-sm">
              <p className="font-medium text-amber-800">Please ensure:</p>
              <ul className="text-amber-700 mt-2 space-y-1">
                <li>• Someone is available at the address during the scheduled time</li>
                <li>• The patient is fasting (if required for tests)</li>
                <li>• A valid ID proof is available for verification</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex gap-3">
        {currentStep > 1 && (
          <button
            onClick={() => setCurrentStep(currentStep - 1)}
            className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
          >
            <ChevronLeft size={20} />
            Back
          </button>
        )}
        <button
          onClick={handleNext}
          className="flex-1 px-6 py-3 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition-colors flex items-center justify-center gap-2"
        >
          {currentStep === 3 ? "Confirm Booking" : "Next"}
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );
}

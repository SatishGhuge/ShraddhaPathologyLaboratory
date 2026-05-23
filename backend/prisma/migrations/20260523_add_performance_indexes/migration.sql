-- Add performance indexes for Patient table
CREATE INDEX `patients_mobile_idx` ON `patients`(`mobile`);
CREATE INDEX `patients_email_idx` ON `patients`(`email`);
CREATE INDEX `patients_name_idx` ON `patients`(`firstName`, `lastName`);
CREATE INDEX `patients_createdAt_idx` ON `patients`(`createdAt`);

-- Add performance indexes for PatientTest table
CREATE INDEX `patient_tests_status_idx` ON `patient_tests`(`status`);
CREATE INDEX `patient_tests_visitDate_idx` ON `patient_tests`(`visitDate`);
CREATE INDEX `patient_tests_visitId_idx` ON `patient_tests`(`visitId`);
CREATE INDEX `patient_tests_patientId_visitId_idx` ON `patient_tests`(`patientId`, `visitId`);

-- Add performance indexes for Test table
CREATE INDEX `tests_isActive_idx` ON `tests`(`isActive`);
CREATE INDEX `tests_name_idx` ON `tests`(`name`);

-- Add performance indexes for TestParameter table
CREATE INDEX `test_parameters_parameterCode_idx` ON `test_parameters`(`parameterCode`);

-- Add performance indexes for TestResult table
CREATE INDEX `test_results_patientTestId_testParameterId_idx` ON `test_results`(`patientTestId`, `testParameterId`);

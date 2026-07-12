import express from 'express';
import {
  getDepartments, getAllDepartments, getDepartmentById, createDepartment, updateDepartment, deleteDepartment,
  getDoctors, getDoctorById, createDoctor, updateDoctor, deleteDoctor, findDuplicateDoctors, getDoctorMergeHistory, mergeDoctors,
  getOrganizations, createOrganization, updateOrganization, deleteOrganization, getOrganizationById,
  getTests, getTestById, createTest, updateTest, deleteTest,
  getSeedDataSummary,
  getTestCharges, getAllTestCharges, getDoctorTestCharges, createTestCharge, updateTestCharge, deleteTestCharge, bulkCreateTestCharges,
  getPackages, getAllPackages, getPackageById, createPackage, updatePackage, deletePackage,
  getPackageTests, addTestToPackage, removeTestFromPackage,
  searchParameters,
  getUnits, getUnitById, createUnit, updateUnit, deleteUnit,
  createTestParameter, createTestCategory, createTestCategoryWithParameter,
  getTemplates, getTemplateById, getTemplatesByTestId, createTemplate, updateTemplate, deleteTemplate,
  getSpecimenTypes, getSpecimenTypeById, createSpecimenType, updateSpecimenType, deleteSpecimenType,
  getRoles, getRoleById, createRole, updateRole, deleteRole,
  getUsers, getUserById, createUser, updateUser, deleteUser,
} from '../controllers/master.controller.js';

const router = express.Router();

// Seed data summary
router.get('/seed-summary', getSeedDataSummary);

// Department routes — /all before /:id
router.get('/departments', getDepartments);
router.get('/departments/all', getAllDepartments);  // ✅ specific before parameterized
router.get('/departments/:id', getDepartmentById);
router.post('/departments', createDepartment);
router.put('/departments/:id', updateDepartment);
router.delete('/departments/:id', deleteDepartment);

// Doctor routes
router.get('/doctors', getDoctors);
router.get('/doctors/find-duplicates', findDuplicateDoctors);
router.post('/doctors/merge', mergeDoctors);
router.get('/doctors/:id', getDoctorById);
router.get('/doctors/:doctorId/merge-history', getDoctorMergeHistory);
router.post('/doctors', createDoctor);
router.put('/doctors/:id', updateDoctor);
router.delete('/doctors/:id', deleteDoctor);

// Organization routes
router.get('/organizations', getOrganizations);
router.get('/organizations/:id', getOrganizationById);
router.post('/organizations', createOrganization);
router.put('/organizations/:id', updateOrganization);
router.delete('/organizations/:id', deleteOrganization);

// Test routes — specific paths before parameterized
router.get('/tests', getTests);
router.get('/tests/:id', getTestById);
router.post('/tests', createTest);
router.put('/tests/:id', updateTest);
router.delete('/tests/:id', deleteTest);

// Package routes — /all MUST be before /:id
router.get('/packages', getPackages);
router.get('/packages/all', getAllPackages);      // ✅ specific before parameterized
router.post('/package-tests', addTestToPackage);
router.get('/packages/:id', getPackageById);      // ✅ now correctly after /all
router.post('/packages', createPackage);
router.put('/packages/:id', updatePackage);
router.delete('/packages/:id', deletePackage);
router.get('/packages/:packageId/tests', getPackageTests);
router.delete('/packages/:packageId/tests/:testId', removeTestFromPackage);

// Test charge routes — /all and /bulk before /:id
router.get('/test-charges/all', getAllTestCharges);
router.post('/test-charges/bulk', bulkCreateTestCharges);
router.get('/doctors/:doctorId/charges', getDoctorTestCharges);
router.get('/tests/:testId/charges', getTestCharges);
router.get('/organizations/:organizationId/charges', getTestCharges);
router.post('/test-charges', createTestCharge);
router.put('/test-charges/:id', updateTestCharge);
router.delete('/test-charges/:id', deleteTestCharge);

// Parameter search routes
router.get('/parameters/search', searchParameters);

// Unit routes
router.get('/units', getUnits);
router.get('/units/:id', getUnitById);
router.post('/units', createUnit);
router.put('/units/:id', updateUnit);
router.delete('/units/:id', deleteUnit);

// Test parameter routes
router.post('/test-parameters', createTestParameter);

// Test category routes
router.post('/test-categories', createTestCategory);
router.post('/test-categories-with-parameter', createTestCategoryWithParameter);

// Template routes — specific before parameterized
router.get('/templates', getTemplates);
router.get('/templates/by-test/:testId', getTemplatesByTestId);
router.get('/templates/:id', getTemplateById);
router.post('/templates', createTemplate);
router.put('/templates/:id', updateTemplate);
router.delete('/templates/:id', deleteTemplate);

// Specimen type routes
router.get('/specimen-types', getSpecimenTypes);
router.get('/specimen-types/:id', getSpecimenTypeById);
router.post('/specimen-types', createSpecimenType);
router.put('/specimen-types/:id', updateSpecimenType);
router.delete('/specimen-types/:id', deleteSpecimenType);

// Sample type routes (alias for specimen types - same table)
router.get('/sample-types', getSpecimenTypes);
router.get('/sample-types/:id', getSpecimenTypeById);
router.post('/sample-types', createSpecimenType);
router.put('/sample-types/:id', updateSpecimenType);
router.delete('/sample-types/:id', deleteSpecimenType);

// Role routes
router.get('/roles', getRoles);
router.get('/roles/:id', getRoleById);
router.post('/roles', createRole);
router.put('/roles/:id', updateRole);
router.delete('/roles/:id', deleteRole);

// User routes
router.get('/users', getUsers);
router.get('/users/:id', getUserById);
router.post('/users', createUser);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);

export default router;

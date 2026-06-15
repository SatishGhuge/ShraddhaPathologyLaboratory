/**
 * API Response Types
 * Centralized type definitions for all API responses
 */

// Pagination Info
export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

// Base API Response
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  pagination?: PaginationInfo;
  error?: string;
}

// Paginated API Response
export interface PaginatedApiResponse<T = any> {
  success: boolean;
  message?: string;
  data: T[];
  pagination: PaginationInfo;
}

// Patient Types
export interface Patient {
  id: string;
  patientId: string;
  title?: string;
  firstName: string;
  lastName?: string;
  dob?: string;
  age?: number;
  gender: string;
  mobile: string;
  email?: string;
  address?: string;
  createdAt?: string;
  updatedAt?: string;
  tests?: PatientTest[];
}

export interface PatientTest {
  id: string;
  visitId: string;
  patientId: string;
  testId: string;
  status: string;
  visitDate?: string;
  sampleTakenDate?: string;
  sampleReceivedDate?: string;
  resultDate?: string;
  test?: Test;
  department?: Department;
  charge?: number;
  totalAmount?: number;
  paidAmount?: number;
  balanceAmount?: number;
  discountAmount?: number;
  discountPercent?: number;
  paymentMode?: string;
  remarks?: string;
  referralDoctor?: string;
}

// Test Types
export interface Test {
  id: string;
  name: string;
  testCode?: string;
  shortName?: string;
  sampleType?: string;
  departmentId?: string;
  department?: Department;
  isActive: boolean;
  isDeleted?: boolean;
  sortOrder?: number;
  charges?: TestCharge[];
  categories?: TestCategory[];
  createdAt?: string;
  updatedAt?: string;
}

export interface TestCharge {
  id: string;
  testId: string;
  b2cCharge: number;
  b2bCharge: number;
  discountPercent?: number;
  specialPrice?: number;
  effectiveFrom?: string;
  effectiveTo?: string;
  isActive: boolean;
}

export interface TestCategory {
  id: string;
  testId: string;
  categoryName: string;
  sortOrder?: number;
  testParameter?: TestParameter[];
}

export interface TestParameter {
  id: string;
  parameterName: string;
  type: string;
  isMandatory: boolean;
}

// Department Types
export interface Department {
  id: string;
  name: string;
  code?: string;
  sortOrder?: number;
  isActive: boolean;
  tests?: Test[];
  packages?: Package[];
  createdAt?: string;
  updatedAt?: string;
}

// Package Types
export interface Package {
  id: string;
  name: string;
  code?: string;
  departmentId?: string;
  department?: Department;
  b2cCharge?: number;
  b2bCharge?: number;
  isActive: boolean;
  packageTests?: PackageTest[];
  testCount?: number;
  tests?: Test[];
  createdAt?: string;
  updatedAt?: string;
}

export interface PackageTest {
  id: string;
  packageId: string;
  testId: string;
  test?: Test;
}

// Doctor Types
export interface Doctor {
  id: string;
  name: string;
  degree?: string;
  type?: string;
  specialization?: string;
  mobile?: string;
  email?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// Franchise Types
export interface Franchise {
  id: string;
  franchiseId: string;
  name: string;
  code?: string;
  mobile?: string;
  email?: string;
  address?: string;
  isActive: boolean;
  credentials?: FranchiseCredentials;
  createdAt?: string;
  updatedAt?: string;
}

export interface FranchiseCredentials {
  username?: string;
  password?: string;
  email?: string;
}

// Corporate Types
export interface Corporate {
  id: string;
  name: string;
  code?: string;
  mobile?: string;
  email?: string;
  address?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// Collection Center Types
export interface CollectionCenter {
  id: string;
  centerId: string;
  name: string;
  code?: string;
  mobile?: string;
  email?: string;
  address?: string;
  isActive: boolean;
  credentials?: CollectionCenterCredentials;
  createdAt?: string;
  updatedAt?: string;
}

export interface CollectionCenterCredentials {
  username?: string;
  password?: string;
  email?: string;
}

// Role Types
export interface Role {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  permissions?: string[];
  createdAt?: string;
  updatedAt?: string;
}

// User Types
export interface User {
  id: string;
  username: string;
  email: string;
  roleId?: string;
  role?: Role;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// Result Types
export interface TestResult {
  id: string;
  patientTestId: string;
  parameterName: string;
  value: string;
  unit?: string;
  normalRange?: string;
  status?: string;
  remarks?: string;
}

// Error Response
export interface ErrorResponse {
  success: false;
  message: string;
  error?: string;
  statusCode?: number;
}

// Success Response
export interface SuccessResponse<T = any> {
  success: true;
  message?: string;
  data?: T;
  pagination?: PaginationInfo;
}

// Union type for API responses
export type ApiResult<T = any> = SuccessResponse<T> | ErrorResponse;

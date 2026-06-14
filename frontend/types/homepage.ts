// Types for homepage API data

export interface AboutContent {
  id: number;
  sectionType: "vision" | "mission" | "doctor_view";
  content: string;
  updatedAt?: string;
}

export interface LabService {
  id: number;
  name: string;
  category: string;
  description: string;
  imageUrl?: string;
  isActive: boolean;
}

export interface HealthPackage {
  id: number;
  name: string;
  tests: string;
  price: number;
  originalPrice?: number;
  isPopular: boolean;
  isActive: boolean;
}

export interface Blog {
  id: number;
  title: string;
  summary: string;
  content: string;
  imageUrl: string;
  isPublished: boolean;
  createdAt: string;
}

export interface JobOpening {
  id: number;
  title: string;
  description: string;
  isOpen: boolean;
  createdAt: string;
}

export interface Capability {
  id: number;
  title: string;
  description: string;
  icon?: string;
  isActive: boolean;
  sortOrder: number;
}

export interface HomeVisitBooking {
  fullName: string;
  mobile: string;
  address: string;
  preferredDate: string;
  preferredTime: string;
  testRequired: string;
}

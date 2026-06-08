import axios from "axios";
import {
  AboutContent,
  Blog,
  Capability,
  HealthPackage,
  HomeVisitBooking,
  JobOpening,
  LabService,
} from "@/types/homepage";

import API_BASE_URL from "@/src/api/config";

console.log('🔧 Homepage API Base:', API_BASE_URL);

export async function getAboutContent(): Promise<AboutContent[]> {
  const { data } = await axios.get(`${API_BASE_URL}/homepage/about`);
  return data;
}

export async function getServices(): Promise<LabService[]> {
  const { data } = await axios.get(`${API_BASE_URL}/homepage/services`);
  return data;
}

export async function getPackages(): Promise<HealthPackage[]> {
  const { data } = await axios.get(`${API_BASE_URL}/homepage/packages`);
  return data;
}

export async function getBlogs(): Promise<Blog[]> {
  const { data } = await axios.get(`${API_BASE_URL}/homepage/blogs`);
  return data;
}

export async function getJobs(): Promise<JobOpening[]> {
  const { data } = await axios.get(`${API_BASE_URL}/homepage/jobs`);
  return data;
}

export async function getCapabilities(): Promise<Capability[]> {
  const { data } = await axios.get(`${API_BASE_URL}/homepage/capabilities`);
  return data;
}

export async function createBooking(booking: HomeVisitBooking): Promise<void> {
  await axios.post(`${API_BASE_URL}/homepage/bookings`, booking);
}

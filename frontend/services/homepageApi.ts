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

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export async function getAboutContent(): Promise<AboutContent[]> {
  const { data } = await axios.get(`${API_BASE}/homepage/about`);
  return data;
}

export async function getServices(): Promise<LabService[]> {
  const { data } = await axios.get(`${API_BASE}/homepage/services`);
  return data;
}

export async function getPackages(): Promise<HealthPackage[]> {
  const { data } = await axios.get(`${API_BASE}/homepage/packages`);
  return data;
}

export async function getBlogs(): Promise<Blog[]> {
  const { data } = await axios.get(`${API_BASE}/homepage/blogs`);
  return data;
}

export async function getJobs(): Promise<JobOpening[]> {
  const { data } = await axios.get(`${API_BASE}/homepage/jobs`);
  return data;
}

export async function getCapabilities(): Promise<Capability[]> {
  const { data } = await axios.get(`${API_BASE}/homepage/capabilities`);
  return data;
}

export async function createBooking(booking: HomeVisitBooking): Promise<void> {
  await axios.post(`${API_BASE}/homepage/bookings`, booking);
}

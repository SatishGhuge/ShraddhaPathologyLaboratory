"use client";

import Navbar from "./Navbar";
import UtilityBar from "./UtilityBar";
import Hero from "./Hero";
import TrustBar from "./TrustBar";
import ServicesSection from "./ServicesSection";
import AboutSection from "./AboutSection";
import PackagesSection from "./PackagesSection";
import HomeVisitSection from "./HomeVisitSection";
import WhyChooseUs from "./WhyChooseUs";
//import CapabillitiesSection from "./CapabillitiesSection";
import FindLabSection from "./FindLabSection";
import ReportAccess from "./ReportAccess";
import BlogSection from "./BlogSection";
import CarrersSection from "./CarrersSection";
import Footer from "./Footer";

export default function Home() {
  return (
    <div className="w-full overflow-x-hidden font-sans">
      <UtilityBar />
      <Navbar />
      <Hero />
      <TrustBar />
      <ServicesSection />
      <AboutSection />
      <PackagesSection />
      <HomeVisitSection />
      <WhyChooseUs />
     
      <FindLabSection />
      <ReportAccess />
      <BlogSection />
      <CarrersSection />
      <Footer />
    </div>
  );
}

"use client";

import { useParams } from "next/navigation";
import { DollarSign } from "lucide-react";
import Header from "@/src/components/Header";
import PageHeader from "@/src/components/BreadCrumb";
import ChargesManager from "@/src/components/ChargesManager";
import { useState, useEffect } from "react";

export default function ReferralDoctorCharges() {
  const params = useParams();
  const doctorId = params.doctorId as string;
  const [doctor, setDoctor] = useState<any>(null);

  useEffect(() => {
    fetchDoctor();
  }, [doctorId]);

  const fetchDoctor = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/master/doctors/${doctorId}`);
      const result = await response.json();
      if (result.success) {
        setDoctor(result.data);
      }
    } catch (error) {
      console.error("Error fetching doctor:", error);
    }
  };

  return (
    <>
      <Header />
      <div className="p-6 bg-white min-h-screen">
        <PageHeader 
          title={`Dr. ${doctor?.name || 'Doctor'} - Test Charges`} 
          icon={DollarSign} 
          path="Master" 
        />

        <ChargesManager
          entityId={doctorId}
          entityName={doctor?.name || "Doctor"}
          entityType="doctor"
          apiPath="/master/doctors"
        />
      </div>
    </>
  );
}

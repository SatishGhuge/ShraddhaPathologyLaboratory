"use client";

import { useRouter, useParams } from "next/navigation";
import { DollarSign } from "lucide-react";
import Header from "@/src/components/Header";
import PageHeader from "@/src/components/BreadCrumb";
import ChargesManager from "@/src/components/ChargesManager";
import { useState, useEffect } from "react";

export default function OrganizationCharges() {
  const router = useRouter();
  const params = useParams();
  const organizationId = params.organizationId as string;
  const [organization, setOrganization] = useState<any>(null);

  useEffect(() => {
    fetchOrganization();
  }, [organizationId]);

  const fetchOrganization = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/master/organizations/${organizationId}`);
      const result = await response.json();
      if (result.success) {
        setOrganization(result.data);
      }
    } catch (error) {
      console.error("Error fetching organization:", error);
    }
  };

  if (!organizationId) {
    return <div className="p-6 text-red-600">Error: Organization ID not found</div>;
  }

  return (
    <>
      <Header />
      <div className="p-6 bg-white min-h-screen">
        <PageHeader 
          title={`${organization?.name || 'Organization'} - Test Charges`} 
          icon={DollarSign} 
          path="Master" 
        />

        <ChargesManager
          entityId={organizationId}
          entityName={organization?.name || "Organization"}
          entityType="organization"
          apiPath="/master/organizations"
        />
      </div>
    </>
  );
}

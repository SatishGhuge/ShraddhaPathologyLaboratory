"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Header from "@/src/components/Header";
import ReferralDoctorModal from "@/src/components/ReferralDoctorModal";
import { getDoctors } from "@/src/api/master";

export default function EditReferralForm() {
  const router = useRouter();
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const [editingDoctor, setEditingDoctor] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Load doctor data when component mounts
  useEffect(() => {
    if (id) {
      setLoading(true);
      getDoctors()
        .then((doctors) => {
          const doc = doctors.find((d) => d.id === parseInt(id));
          setEditingDoctor(doc || null);
        })
        .catch((err) => console.error("Failed to load doctor:", err))
        .finally(() => setLoading(false));
    }
  }, [id]);

  const handleDoctorUpdated = () => {
    router.push("/master/referral-doctor-list");
  };

  if (loading) {
    return (
      <>
        <Header />
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-gray-600">Loading...</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="min-h-screen bg-white flex justify-center items-start p-6">
        <ReferralDoctorModal
          isOpen={true}
          onClose={() => router.push("/master/referral-doctor-list")}
          onDoctorAdded={handleDoctorUpdated}
          editingDoctor={editingDoctor}
        />
      </div>
    </>
  );
}

"use client";

import React from "react";
import Header from "@/src/components/Header";
import MachineList from "@/src/pages/Configuration/Machines/MachineList";

const ConfigurationMachinesPage: React.FC = () => {
  return (
    <>
      <Header />
      <MachineList />
    </>
  );
};

export default ConfigurationMachinesPage;

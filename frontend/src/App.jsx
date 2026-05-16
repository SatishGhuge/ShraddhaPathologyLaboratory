import { useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import Header from "./components/Header.jsx";
import AdminLogin from "./components/AdminLogin.jsx";
import HomePage from "./components/Home.jsx";
import SeedDataViewer from "./components/SeedDataViewer.jsx";
import CollectionDashboard from "./pages/Dashboard/collectiondashboard.jsx";
import PatientDashboard from "./pages/Dashboard/patientdashboard.jsx";
import LabDashboard from "./pages/Dashboard/labdashboard.jsx";
import FranchiseDashboard from "./pages/Dashboard/franchisedashboard.jsx";
import TestList from "./pages/Master/TestList.jsx";
import AddTest from "./pages/Master/AddTest.jsx";
import TestCharges from "./pages/Master/TestCharges.jsx";
import DepartmentList from "./pages/Master/DepartmentList.jsx";
import AddDepartment from "./pages/Master/AddDepartment.jsx";
import PackageList from "./pages/Master/PackageList.jsx";
import AddPackage from "./pages/Master/AddPackage.jsx";
import AddPackageCharges from "./pages/Master/AddPackageCharges.jsx";
import RoleList from "./pages/Master/RoleList.jsx";
import AddRole from "./pages/Master/AddRole.jsx";
import CenterList from "./pages/Master/CenterList.jsx";
import AddCenter from "./pages/Master/AddCenter.jsx";
import UserList  from "./pages/Master/UserList.jsx";
import AddUser from "./pages/Master/AddUser.jsx";
import Charges from "./pages/Master/Charges.jsx";
import CorporateWiseCharges from "./pages/Master/Corporatewisecharges.jsx";
import ReferralDoctoreList from "./pages/Master/ReferralDoctoreList.jsx";
import AddReferralDoctor from "./pages/Master/AddReferralDoctor.jsx";
import SpecimenType from "./pages/Master/SpecimenType.jsx";
import Units from "./pages/Master/Units.jsx";
import MicrobiologyOrganism from "./pages/Master/MicrobiologyOrganism.jsx";
import FranchiseList from "./pages/Master/FranchiseList.jsx";
import AddFranchise from "./pages/Master/AddFranchise.jsx";
import CorporateList from "./pages/Master/CorporateList.jsx";
import AddCorporate from "./pages/Master/AddCorporate.jsx";
import OutsourcingList from "./pages/Master/OutsourcingList.jsx";
import AddOutsourcing from "./pages/Master/AddOutsourcing.jsx";
import TestTemplets from "./pages/Master/TestTemplets.jsx"; 

import Result from "./pages/result/result.jsx";
import PatientResult from "./pages/result/patient_result.jsx";
import CenterWiseCostReport from "./pages/Reports/Cost-Related-Report/CenterWiseCostReport.jsx";
import B2BTestwiseCostReport from "./pages/Reports/Cost-Related-Report/B2bTestWiseCostReport.jsx";
import DailyCollection from "./pages/Reports/MIS-Reports/DailyCollection.jsx";
import PaymentReceiptReport from "./pages/Reports/MIS-Reports/PaymentReceiptReport.jsx";
import TestComplimentReport from "./pages/Reports/MIS-Reports/TestComplimentReport.jsx";
import ComplementAllDoctorReport from "./pages/Reports/MIS-Reports/ComplementAllDoctorReport.jsx";
import ReportDashboard from "./pages/Reports/MIS-Reports/ReportDashboard.jsx";
import TurnAroundTime from "./pages/Reports/Other-Reports/TurnAroundTime.jsx";
import Worksheet from "./pages/Reports/Other-Reports/Worksheet.jsx";
import DetailedWorksheet from "./pages/Reports/Other-Reports/DetailedWorksheet.jsx";
import UserLoginReport from "./pages/Reports/Other-Reports/UserLoginReport.jsx";
import DiscountReport from "./pages/Reports/Other-Reports/DiscountReport.jsx";
import MonthlyCollectionSummary from "./pages/Reports/Other-Reports/MonthlyCollectionSummary.jsx";
import SampleRejectionReport from "./pages/Reports/Other-Reports/SampleRejectionReport.jsx";
import HospitalBills from "./pages/Reports/Other-Reports/HospitalBills.jsx";
import BulkSettlement from "./pages/Reports/BulkSettlement.jsx";
import B2bBulkSettlement from "./pages/Reports/B2bBulkSettlement.jsx";
import ServiceCount from "./pages/Reports/ServiceCount.jsx";
import GroupSummary from "./pages/Reports/GroupSummary.jsx";
import TestReport from "./pages/Reports/TestReport.jsx";
import PatientList from "./pages/Reports/PatientList.jsx";
import PatientRegistration from "./pages/patient/PatientRegistration.jsx";
import Searchforbooking from "./pages/patient/searchforbooking.jsx";
import OutsourceTests from "./pages/patient/outsourcingfortest.jsx";
import SignatureList from "./pages/config/signature.jsx";





function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => !!localStorage.getItem("token"));

  return (
      <Router>
      <Routes>

      
          {/* Home Page - Default */}
        <Route path="/" element={<HomePage />} />

        {/* Admin Login */}
        <Route
          path="/login"
          element={<AdminLogin onLogin={() => setIsLoggedIn(true)} />}
        />

        {/* Seed Data Viewer - Public Access */}
        <Route
          path="/seed-data"
          element={<SeedDataViewer />}
        />

        {/* Lab Dashboard */}
        <Route
          path="/labdashboard"
          element={
            isLoggedIn ? <LabDashboard /> : <Navigate to="/login" replace />
          }
        />

        {/* Collection Dashboard */}
        <Route
          path="/Dashboard/collectiondashboard"
          element={
            isLoggedIn ? <CollectionDashboard /> : <Navigate to="/login" replace />
          }
        />

        {/* Franchise Dashboard */}
        <Route
          path="/Dashboard/franchisedashboard"
          element={
            isLoggedIn ? <FranchiseDashboard /> : <Navigate to="/login" replace />
          }
        />

        {/* Patient Dashboard */}
        <Route
          path="/patientdashboard"
          element={
            isLoggedIn ? <PatientDashboard /> : <Navigate to="/login" replace />
          }
        />

        {/* Optional home/header */}
        {/* HOME LAYOUT */}
        <Route
          path="/home"
          element={
            isLoggedIn ? <Header /> : <Navigate to="/login" replace />
          }
        />

        {/* Test List */}
        <Route
             path="/master/testlist"
             element={isLoggedIn ? <TestList /> : <Navigate to="/login" replace />}
        />

         {/* Add Test */}
           <Route
              path="/master/testlist/add"
              element={isLoggedIn ? <AddTest /> : <Navigate to="/login" replace />}
            />

            {/*  Edit Test */}
           <Route
              path="/master/testlist/edit/:id"
              element={isLoggedIn ? <AddTest /> : <Navigate to="/login" replace />}
            />

            {/*  View Test */}
           <Route
              path="/master/testlist/view/:id"
              element={isLoggedIn ? <AddTest /> : <Navigate to="/login" replace />}
            />

            {/* Test Charges */}
           <Route
              path="/master/test-charges/:testId"
              element={isLoggedIn ? <TestCharges /> : <Navigate to="/login" replace />}
            />

              {/* Department List */}
             <Route
               path="/master/departmentlist"
               element={isLoggedIn ? <DepartmentList /> : <Navigate to="/login" replace />}
             />

              {/* Add Department */}  
              <Route
              path="/master/departmentlist/add"
              element={isLoggedIn ? <AddDepartment /> : <Navigate to="/login" replace />}
            />

            {/* Edit Department */}  
            <Route
              path="/master/departmentlist/edit/:id"
              element={isLoggedIn ? <AddDepartment /> : <Navigate to="/login" replace />}
            />

            {/* View Department */}  
            <Route
              path="/master/departmentlist/view/:id"
              element={isLoggedIn ? <AddDepartment /> : <Navigate to="/login" replace />}
            />
           
              {/* Package List */}    
              <Route
              path="/master/packagelist"
              element={isLoggedIn ? <PackageList /> : <Navigate to="/login" replace />}
            />

              {/* Add Package */}
              <Route
              path="/master/packagelist/add"
              element={isLoggedIn ? <AddPackage /> : <Navigate to="/login" replace />}
            />

            {/* Edit Package */}  
            <Route
              path="/master/packagelist/edit/:id"
              element={isLoggedIn ? <AddPackage /> : <Navigate to="/login" replace />}
            />

            {/* View Package */}  
            <Route
              path="/master/packagelist/view/:id"
              element={isLoggedIn ? <AddPackage /> : <Navigate to="/login" replace />}
            />

            {/* Package Charges */}  
            <Route
              path="/master/packagelist/charges/:id"
              element={isLoggedIn ? <AddPackageCharges /> : <Navigate to="/login" replace />}
            />

              {/* Role List */}
              <Route
              path="/master/rolelist"
              element={isLoggedIn ? <RoleList /> : <Navigate to="/login" replace />} 
            />  

            {/* Add Role */}
            <Route
              path="/master/rolelist/add"
              element={isLoggedIn ? <AddRole /> : <Navigate to="/login" replace />}
            />

            {/* Edit Role */}
            <Route
              path="/master/rolelist/edit/:id"
              element={isLoggedIn ? <AddRole /> : <Navigate to="/login" replace />}
            />

            {/* View Role */}
            <Route
              path="/master/rolelist/view/:id"
              element={isLoggedIn ? <AddRole /> : <Navigate to="/login" replace />}
            />

              {/* Center List */}
              <Route
              path="/master/centerlist"
              element={isLoggedIn ? <CenterList /> : <Navigate to="/login" replace />} 
            />

              {/* Add Center */}
              <Route
              path="/master/center/add"
              element={isLoggedIn ? <AddCenter /> : <Navigate to="/login" replace />}
            />

            {/* Edit Center */}
            <Route
              path="/master/center/edit/:id"
              element={isLoggedIn ? <AddCenter /> : <Navigate to="/login" replace />}
            />

            {/* View Center */}
            <Route
              path="/master/center/view/:id"
              element={isLoggedIn ? <AddCenter /> : <Navigate to="/login" replace />}
            />

                {/* Franchise List */}      
              <Route
              path="/master/franchise"
              element={isLoggedIn ? <FranchiseList /> : <Navigate to="/login" replace />} 
            />

              {/* Add Franchise */}
              <Route
              path="/master/franchise/add"
              element={isLoggedIn ? <AddFranchise /> : <Navigate to="/login" replace />}
            />

            {/* Edit Franchise */}
            <Route
              path="/master/franchise/edit/:id"
              element={isLoggedIn ? <AddFranchise /> : <Navigate to="/login" replace />}
            />

            {/* View Franchise */}
            <Route
              path="/master/franchise/view/:id"
              element={isLoggedIn ? <AddFranchise /> : <Navigate to="/login" replace />}
            />

            {/* Corporate List */}
            <Route
              path="/master/corporatelist"
              element={isLoggedIn ? <CorporateList /> : <Navigate to="/login" replace />}
            />

            {/* Add Corporate */}
            <Route
              path="/master/corporate/add"
              element={isLoggedIn ? <AddCorporate /> : <Navigate to="/login" replace />}
            />

            {/* Edit Corporate */}
            <Route
              path="/master/corporate/edit/:id"
              element={isLoggedIn ? <AddCorporate /> : <Navigate to="/login" replace />}
            />

            {/* View Corporate */}
            <Route
              path="/master/corporate/view/:id"
              element={isLoggedIn ? <AddCorporate /> : <Navigate to="/login" replace />}
            />

            {/* Outsourcing List */}
            <Route
              path="/master/outsourcing"
              element={isLoggedIn ? <OutsourcingList /> : <Navigate to="/login" replace />}
            />

            {/* Add Outsourcing */}
            <Route
              path="/master/outsourcing/add"
              element={isLoggedIn ? <AddOutsourcing /> : <Navigate to="/login" replace />}
            />

            {/* Edit Outsourcing */}
            <Route
              path="/master/outsourcing/edit/:id"
              element={isLoggedIn ? <AddOutsourcing /> : <Navigate to="/login" replace />}
            />

            {/* View Outsourcing */}
            <Route
              path="/master/outsourcing/view/:id"
              element={isLoggedIn ? <AddOutsourcing /> : <Navigate to="/login" replace />}
            />

              {/* User List */}
              <Route
              path="/master/userlist"
              element={isLoggedIn ? <UserList /> : <Navigate to="/login" replace />} 
            />
            
              {/* Add User */}
              <Route
              path="/master/user/add"
              element={isLoggedIn ? <AddUser /> : <Navigate to="/login" replace />}
            />  
             
              {/* Edit User */}
              <Route
              path="/master/user/edit/:id"                  
              element={isLoggedIn ? <AddUser /> : <Navigate to="/login" replace />}
            />

              {/* Charges */}            
              <Route
              path="/master/charges"
              element={isLoggedIn ? <Charges /> : <Navigate to="/login" replace />}
            />

              {/* Corporate Wise Charges */}
              <Route
              path="/master/corporate-wise-charges"
              element={isLoggedIn ? <CorporateWiseCharges /> : <Navigate to="/login" replace />}
            />

                {/* Referral Doctor List */}
              <Route
              path="/master/referral-doctor-list"
              element={isLoggedIn ? <ReferralDoctoreList /> : <Navigate to="/login" replace />}
            />  

                {/* Add Referral Doctor */}
              <Route
              path="/master/referral-doctor/add"
              element={isLoggedIn ? <AddReferralDoctor /> : <Navigate to="/login" replace />}
            />

                {/* Edit Referral Doctor */}
              <Route
              path="/master/referral-doctor/edit/:id"
              element={isLoggedIn ? <AddReferralDoctor /> : <Navigate to="/login" replace />}
            />

                  {/* Specimen Type */}
              <Route
              path="/master/specimen-type"
              element={isLoggedIn ? <SpecimenType /> : <Navigate to="/login" replace />}
            />
            
              {/* Units */}
              <Route
              path="/master/units"
              element={isLoggedIn ? <Units /> : <Navigate to="/login" replace />}
            />
                {/* Microbiology Organism */} 
              <Route
              path="/master/microbiology-organism"
              element={isLoggedIn ? <MicrobiologyOrganism /> : <Navigate to="/login" replace />}
            />
                {/* Test Templets */ }
              <Route
              path="/master/test-templets"
              element={isLoggedIn ? <TestTemplets /> : <Navigate to="/login" replace />}
            />

              {/* Result*/}
        <Route
          path="/result"
          element={isLoggedIn ? <Result /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/result/patientresult/:patientTestId"
          element={isLoggedIn ? <PatientResult /> : <Navigate to="/login" replace />}
        />

             {/* Report*/}
        <Route
          path="/reports/center-wise-cost-report"
          element={isLoggedIn ? <CenterWiseCostReport /> : <Navigate to="/login" replace />}
        />

        <Route
          path="/reports/b2b-testwise-cost-report"
          element={isLoggedIn ? <B2BTestwiseCostReport /> : <Navigate to="/login" replace />}
        />

        <Route
          path="/reports/daily-collection"
          element={isLoggedIn ? <DailyCollection /> : <Navigate to="/login" replace />}
        />

        <Route
          path="/reports/payment-receipt"
          element={isLoggedIn ? <PaymentReceiptReport /> : <Navigate to="/login" replace />}
        />

        <Route
          path="/reports/test-compliment"
          element={isLoggedIn ? <TestComplimentReport /> : <Navigate to="/login" replace />}
        />

        <Route
          path="/reports/complement-all-doctors"
          element={isLoggedIn ? <ComplementAllDoctorReport /> : <Navigate to="/login" replace />}
        />

        <Route 
            path="/reports/report-dashboard"
            element={isLoggedIn ? <ReportDashboard /> : <Navigate to="/login" replace />}
        />

        <Route
          path="/reports/turn-around-time"
          element={isLoggedIn ? <TurnAroundTime /> : <Navigate to="/login" replace />}
        />

        <Route
          path="/reports/worksheet"
          element={isLoggedIn ? <Worksheet /> : <Navigate to="/login" replace />}
        />

        <Route
          path="/reports/detailed-worksheet"
          element={isLoggedIn ? <DetailedWorksheet /> : <Navigate to="/login" replace />}
        />

        <Route
          path="/reports/user-login-report"
          element={isLoggedIn ? <UserLoginReport /> : <Navigate to="/login" replace />}
        />

        <Route
          path="/reports/discount-report"
          element={isLoggedIn ? <DiscountReport /> : <Navigate to="/login" replace />}
        />

        <Route
          path="/reports/monthly-collection-summary"
          element={isLoggedIn ? <MonthlyCollectionSummary /> : <Navigate to="/login" replace />}
        />

        <Route
          path="/reports/sample-rejection-report"
          element={isLoggedIn ? <SampleRejectionReport /> : <Navigate to="/login" replace />}
        />

        <Route
          path="/reports/hospital-bills"
          element={isLoggedIn ? <HospitalBills /> : <Navigate to="/login" replace />}
        />

        <Route
          path="/reports/bulk-settlement"
          element={isLoggedIn ? <BulkSettlement /> : <Navigate to="/login" replace />}
        />

        <Route
          path="/reports/b2b-bulk-settlement"
          element={isLoggedIn ? <B2bBulkSettlement /> : <Navigate to="/login" replace />}
        />

        <Route
          path="/reports/service-count"
          element={isLoggedIn ? <ServiceCount /> : <Navigate to="/login" replace />}
        />

        <Route
          path="/reports/group-summary"
          element={isLoggedIn ? <GroupSummary /> : <Navigate to="/login" replace />}
        />

        <Route
          path="/reports/test-report"
          element={isLoggedIn ? <TestReport /> : <Navigate to="/login" replace />}
        />

        <Route
          path="/reports/patient-list"
          element={isLoggedIn ? <PatientList /> : <Navigate to="/login" replace />}
        />
          
        <Route
          path="/patient/registration"
          element={isLoggedIn ? <PatientRegistration /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/patient/search-booking"
          element={isLoggedIn ? <Searchforbooking /> : <Navigate to="/login" replace />}   
        />

        <Route
          path="/patient/outsourcing-for-test"
          element={isLoggedIn ? <OutsourceTests /> : <Navigate to="/login" replace />}   
        />

        <Route
          path="/config/signature"
          element={isLoggedIn ? <SignatureList /> : <Navigate to="/login" replace />}   
        />


        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
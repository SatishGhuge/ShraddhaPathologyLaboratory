"use client";

import { Home, FileText, BarChart3, IndianRupee, FolderOpen, Settings, UserPlus, Search, Send, FileSignature } from "lucide-react";

// Icon mapping for breadcrumb paths
const iconMap = {
  "Reports": FileText,
  "MIS Reports": BarChart3,
  "Cost Related Reports": IndianRupee,
  "Other Reports": FolderOpen,
  "Master": Settings,
  "Patient": UserPlus,
  "Patient Registration": UserPlus,
  "Search for Booking": Search,
  "Outsourcing for Test": Send,
  "Configuration": Settings,
  "Signature": FileSignature,
};

export default function PageHeader({ title, icon: Icon, path = "" }: { title: string; icon?: React.ComponentType<any>; path?: string }) {
  // Split path by " / " to get breadcrumb items
  const pathItems = path ? path.split(" / ").filter(item => item.trim()) : [];

  return (
    <div className="mb-3 space-y-1">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Home size={16} />
        <span>Home</span>

        {pathItems.map((item, i) => {
          const ItemIcon = iconMap[item] || FileText;
          return (
            <div key={i} className="flex items-center gap-2">
              <span>/</span>
              <ItemIcon size={16} />
              <span>{item}</span>
            </div>
          );
        })}
      </div>

      {/* Page Title */}
      <div className="flex items-center gap-2">
        <Icon size={22} className="text-blue-600" />
        <h2 className="text-xl sm:text-2xl font-bold text-slate-800">{title}</h2>
      </div>

    </div>
  );
}

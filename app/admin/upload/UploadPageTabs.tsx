"use client";

import { useState } from "react";
import { UploadPageClient } from "./UploadPageClient";
import { ClinicorpSyncTab } from "@/components/upload/ClinicorpSyncTab";
import type { ClinicaOption } from "@/components/shared/ClinicaSelect";

type Tab = "xlsx" | "clinicorp";

type Props = {
  clinicas: ClinicaOption[];
};

export function UploadPageTabs({ clinicas }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("clinicorp");

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-white">Importar dados</h2>
        <p className="mt-1 text-sm text-white/80">
          Importe dados via API do Clinicorp ou faça upload manual de planilha XLSX.
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-1 rounded-lg bg-white/5 p-1">
        <button
          type="button"
          onClick={() => setActiveTab("clinicorp")}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "clinicorp"
              ? "bg-primary-600 text-white shadow-sm"
              : "text-white/70 hover:text-white hover:bg-white/10"
          }`}
        >
          Clinicorp API
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("xlsx")}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "xlsx"
              ? "bg-primary-600 text-white shadow-sm"
              : "text-white/70 hover:text-white hover:bg-white/10"
          }`}
        >
          Upload XLSX
        </button>
      </div>

      {/* Tab content */}
      {activeTab === "clinicorp" ? (
        <ClinicorpSyncTab clinicas={clinicas} />
      ) : (
        <UploadPageClient clinicas={clinicas} compact />
      )}
    </div>
  );
}

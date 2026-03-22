import { getClinicasAtivas, getMonthlyUploadStatus } from "./actions";
import { UploadPageClient } from "./UploadPageClient";
import { MonthlyUploadStatus } from "@/components/upload/MonthlyUploadStatus";
import { UploadPageTabs } from "./UploadPageTabs";

export const dynamic = "force-dynamic";

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default async function UploadPage() {
  const mes = currentMonth();
  const [clinicas, uploadStatus] = await Promise.all([
    getClinicasAtivas(),
    getMonthlyUploadStatus(mes),
  ]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <UploadPageTabs clinicas={clinicas} />
      </div>
      <div className="lg:col-span-1">
        <MonthlyUploadStatus initialStatus={uploadStatus} initialMes={mes} />
      </div>
    </div>
  );
}

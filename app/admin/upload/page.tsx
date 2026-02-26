import { getClinicasAtivas } from "./actions";
import { UploadPageClient } from "./UploadPageClient";

export default async function UploadPage() {
  const clinicas = await getClinicasAtivas();

  return (
    <UploadPageClient clinicas={clinicas} />
  );
}

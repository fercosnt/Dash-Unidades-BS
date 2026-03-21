import { fetchTaxasVigentes } from "./actions";
import { TaxasCartaoClient } from "./TaxasCartaoClient";

export default async function TaxasCartaoPage() {
  const taxas = await fetchTaxasVigentes();

  return (
    <TaxasCartaoClient taxas={taxas} />
  );
}

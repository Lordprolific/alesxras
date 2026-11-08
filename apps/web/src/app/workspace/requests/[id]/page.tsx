import { ProcurementRequestDetail } from "@/components/procurement-request-detail";

export default async function ProcurementRequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProcurementRequestDetail id={id} />;
}

export function calculateCommission(
  orderId: string,
  total: number,
  commissionTypes: Record<string, string>,
  commissionAmounts: Record<string, string>,
): string {
  const type = commissionTypes[orderId] || "auto";
  if (type === "flat") {
    return commissionAmounts[orderId] || "0.00";
  }
  if (type === "auto") {
    return "calculating...";
  }

  let percentage = 0.25;
  if (type === "10") percentage = 0.1;
  else if (type === "25") percentage = 0.25;

  return (total * percentage).toFixed(2);
}

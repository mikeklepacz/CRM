import { storage } from "../../storage";

const defaultStatuses = [
  { name: "1 – Contacted", displayOrder: 1, lightBgColor: "#dbeafe", lightTextColor: "#1e40af", darkBgColor: "#1e3a8a", darkTextColor: "#bfdbfe", isActive: true },
  { name: "2 – Interested", displayOrder: 2, lightBgColor: "#fef3c7", lightTextColor: "#92400e", darkBgColor: "#78350f", darkTextColor: "#fef3c7", isActive: true },
  { name: "3 – Sample Sent", displayOrder: 3, lightBgColor: "#e0e7ff", lightTextColor: "#3730a3", darkBgColor: "#312e81", darkTextColor: "#c7d2fe", isActive: true },
  { name: "4 – Follow-Up", displayOrder: 4, lightBgColor: "#fed7aa", lightTextColor: "#9a3412", darkBgColor: "#7c2d12", darkTextColor: "#fed7aa", isActive: true },
  { name: "5 – Closed Won", displayOrder: 5, lightBgColor: "#d1fae5", lightTextColor: "#065f46", darkBgColor: "#064e3b", darkTextColor: "#a7f3d0", isActive: true },
  { name: "6 – Closed Lost", displayOrder: 6, lightBgColor: "#fee2e2", lightTextColor: "#991b1b", darkBgColor: "#7f1d1d", darkTextColor: "#fecaca", isActive: true },
  { name: "7 – Warm", displayOrder: 7, lightBgColor: "#fef9c3", lightTextColor: "#854d0e", darkBgColor: "#78350f", darkTextColor: "#fef9c3", isActive: true },
];

export async function seedDefaultStatuses(): Promise<any[]> {
  const createdStatuses = [];
  for (const statusData of defaultStatuses) {
    const status = await storage.createStatus(statusData as any);
    createdStatuses.push(status);
  }
  return createdStatuses;
}

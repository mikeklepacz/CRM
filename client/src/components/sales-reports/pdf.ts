import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import JSZip from "jszip";
import { format } from "date-fns";

import type { AgentSalesData, SalesReportData } from "./types";

export function generateFullCompanyReport(data: SalesReportData): jsPDF {
  const doc = new jsPDF();

  doc.setFontSize(20);
  doc.text("Hemp Wick Sales Commission Report", 14, 20);

  doc.setFontSize(12);
  doc.text(`Period: ${format(new Date(data.summary.dateRange.start), "MMM dd, yyyy")} - ${format(new Date(data.summary.dateRange.end), "MMM dd, yyyy")}`, 14, 30);
  doc.text(`Generated: ${format(new Date(), "MMM dd, yyyy HH:mm")}`, 14, 37);

  doc.setFontSize(14);
  doc.text("Summary", 14, 50);

  doc.setFontSize(10);
  const summaryData = [
    ["Total Agents with Sales", data.summary.totalAgents.toString()],
    ["Total Orders", data.summary.totalOrders.toString()],
    ["Total Revenue", `$${data.summary.totalRevenue.toFixed(2)}`],
    ["Total Commissions Paid", `$${data.summary.totalCommissionsPaid.toFixed(2)}`],
  ];

  autoTable(doc, {
    startY: 55,
    head: [["Metric", "Value"]],
    body: summaryData,
    theme: "striped",
    headStyles: { fillColor: [41, 128, 185] },
  });

  doc.setFontSize(14);
  const lastY = (doc as any).lastAutoTable.finalY || 100;
  doc.text("Agent Breakdown", 14, lastY + 15);

  const agentData = data.agents.map((agent) => [
    agent.firstName && agent.lastName ? `${agent.firstName} ${agent.lastName}` : agent.agentName,
    agent.totalOrders.toString(),
    `$${agent.totalSales.toFixed(2)}`,
    `$${agent.totalCommission.toFixed(2)}`,
  ]);

  autoTable(doc, {
    startY: lastY + 20,
    head: [["Agent Name", "Orders", "Sales", "Commission"]],
    body: agentData,
    theme: "striped",
    headStyles: { fillColor: [41, 128, 185] },
  });

  return doc;
}

export function generateAgentReport(agent: AgentSalesData, dateRange: { start: string; end: string }): jsPDF {
  const doc = new jsPDF();

  doc.setFontSize(20);
  const agentDisplayName = agent.firstName && agent.lastName ? `${agent.firstName} ${agent.lastName}` : agent.agentName;
  doc.text(`Commission Report: ${agentDisplayName}`, 14, 20);

  doc.setFontSize(12);
  doc.text(`Period: ${format(new Date(dateRange.start), "MMM dd, yyyy")} - ${format(new Date(dateRange.end), "MMM dd, yyyy")}`, 14, 30);
  doc.text(`Generated: ${format(new Date(), "MMM dd, yyyy HH:mm")}`, 14, 37);

  doc.setFontSize(14);
  doc.text("Summary", 14, 50);

  doc.setFontSize(10);
  const summaryData = [
    ["Total Orders", agent.totalOrders.toString()],
    ["Total Sales", `$${agent.totalSales.toFixed(2)}`],
    ["Total Commission Earned", `$${agent.totalCommission.toFixed(2)}`],
  ];

  autoTable(doc, {
    startY: 55,
    head: [["Metric", "Value"]],
    body: summaryData,
    theme: "striped",
    headStyles: { fillColor: [41, 128, 185] },
  });

  doc.setFontSize(14);
  const lastY = (doc as any).lastAutoTable.finalY || 100;
  doc.text("Order Details", 14, lastY + 15);

  const orderData = agent.orders.map((order) => [
    order.orderNumber,
    format(new Date(order.orderDate), "MMM dd, yyyy"),
    order.billingCompany || order.billingEmail || "N/A",
    `$${order.total.toFixed(2)}`,
    order.commissionType === "auto" ? "Auto" : `${order.commissionType}%`,
    `$${order.commissionAmount.toFixed(2)}`,
  ]);

  autoTable(doc, {
    startY: lastY + 20,
    head: [["Order #", "Date", "Customer", "Total", "Comm Type", "Commission"]],
    body: orderData,
    theme: "striped",
    headStyles: { fillColor: [41, 128, 185] },
    styles: { fontSize: 8 },
  });

  return doc;
}

export async function downloadReportBlobs(pdfs: Array<{ filename: string; blob: Blob }>, periodStart: string) {
  if (pdfs.length === 1) {
    const link = document.createElement("a");
    link.href = URL.createObjectURL(pdfs[0].blob);
    link.download = pdfs[0].filename;
    link.click();
    return;
  }

  const zip = new JSZip();
  pdfs.forEach((pdf) => {
    zip.file(pdf.filename, pdf.blob);
  });

  const zipBlob = await zip.generateAsync({ type: "blob" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(zipBlob);
  link.download = `Sales_Reports_${format(new Date(periodStart), "yyyy-MM")}.zip`;
  link.click();
}

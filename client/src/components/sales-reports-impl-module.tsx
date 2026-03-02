import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";

import { useToast } from "@/hooks/use-toast";
import { ReportsPanel } from "./sales-reports/reports-panel";
import { ReferralWidget } from "./sales-reports/referral-widget";
import { downloadReportBlobs, generateAgentReport, generateFullCompanyReport } from "./sales-reports/pdf";
import type { ReferralCommissionsResponse, SalesReportData } from "./sales-reports/types";

export function SalesReports() {
  const { toast } = useToast();
  const [generating, setGenerating] = useState(false);

  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const [startDate, setStartDate] = useState(format(firstDayOfMonth, "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(lastDayOfMonth, "yyyy-MM-dd"));
  const [selectedReports, setSelectedReports] = useState<Set<string>>(new Set(["full"]));

  const {
    data: reportData,
    isLoading,
    refetch,
  } = useQuery<SalesReportData>({
    queryKey: ["/api/reports/sales-data", startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams({ startDate, endDate });
      const response = await fetch(`/api/reports/sales-data?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch sales data");
      }
      return response.json();
    },
    enabled: false,
  });

  const { data: referralData, isLoading: isLoadingReferrals } = useQuery<ReferralCommissionsResponse>({
    queryKey: ["/api/reports/referral-commissions"],
  });

  const handleLoadData = () => {
    refetch();
  };

  const toggleReport = (reportId: string) => {
    const newSelected = new Set(selectedReports);
    if (newSelected.has(reportId)) {
      newSelected.delete(reportId);
    } else {
      newSelected.add(reportId);
    }
    setSelectedReports(newSelected);
  };

  const handleGeneratePDFs = async () => {
    if (!reportData) {
      toast({ title: "No data", description: "Please load data first", variant: "destructive" });
      return;
    }

    if (selectedReports.size === 0) {
      toast({ title: "No reports selected", description: "Please select at least one report to generate", variant: "destructive" });
      return;
    }

    setGenerating(true);

    try {
      const pdfs: Array<{ filename: string; blob: Blob }> = [];

      if (selectedReports.has("full")) {
        const doc = generateFullCompanyReport(reportData);
        pdfs.push({
          filename: `Full_Company_Report_${format(new Date(reportData.summary.dateRange.start), "yyyy-MM")}.pdf`,
          blob: doc.output("blob"),
        });
      }

      for (const agent of reportData.agents) {
        if (selectedReports.has(agent.agentName)) {
          const doc = generateAgentReport(agent, reportData.summary.dateRange);
          const agentFileName = agent.firstName && agent.lastName ? `${agent.firstName}_${agent.lastName}` : agent.agentName.replace(/\s+/g, "_");
          pdfs.push({
            filename: `${agentFileName}_Report_${format(new Date(reportData.summary.dateRange.start), "yyyy-MM")}.pdf`,
            blob: doc.output("blob"),
          });
        }
      }

      await downloadReportBlobs(pdfs, reportData.summary.dateRange.start);
      toast({ title: "Success", description: `Generated ${pdfs.length} report${pdfs.length > 1 ? "s" : ""}` });
    } catch (error) {
      console.error("Error generating PDFs:", error);
      toast({ title: "Error", description: "Failed to generate reports", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <ReferralWidget data={referralData} isLoading={isLoadingReferrals} />
      <ReportsPanel
        startDate={startDate}
        endDate={endDate}
        isLoading={isLoading}
        generating={generating}
        selectedReports={selectedReports}
        reportData={reportData}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        onLoadData={handleLoadData}
        onToggleReport={toggleReport}
        onGeneratePDFs={handleGeneratePDFs}
      />
    </div>
  );
}

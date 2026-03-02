import { Calendar, FileDown, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SalesReportData } from "./types";

interface ReportsPanelProps {
  startDate: string;
  endDate: string;
  isLoading: boolean;
  generating: boolean;
  selectedReports: Set<string>;
  reportData: SalesReportData | undefined;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onLoadData: () => void;
  onToggleReport: (reportId: string) => void;
  onGeneratePDFs: () => void;
}

export function ReportsPanel({
  startDate,
  endDate,
  isLoading,
  generating,
  selectedReports,
  reportData,
  onStartDateChange,
  onEndDateChange,
  onLoadData,
  onToggleReport,
  onGeneratePDFs,
}: ReportsPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Sales Commission Reports</CardTitle>
        <CardDescription>Generate PDF reports for yourself (accountant) and your sales agents</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-sm font-medium">Select Date Range</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-date">Start Date</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="start-date" type="date" value={startDate} onChange={(e) => onStartDateChange(e.target.value)} className="pl-10" data-testid="input-start-date" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-date">End Date</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="end-date" type="date" value={endDate} onChange={(e) => onEndDateChange(e.target.value)} className="pl-10" data-testid="input-end-date" />
              </div>
            </div>
          </div>
          <Button onClick={onLoadData} disabled={isLoading} data-testid="button-load-data">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              "Load Data"
            )}
          </Button>
        </div>

        {reportData && (
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Select Reports to Generate</h3>

            {reportData.summary.totalOrders === 0 ? (
              <p className="text-sm text-muted-foreground">No sales data found for this period.</p>
            ) : (
              <>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2 p-3 rounded-lg border hover-elevate active-elevate-2">
                    <Checkbox id="report-full" checked={selectedReports.has("full")} onCheckedChange={() => onToggleReport("full")} data-testid="checkbox-full-report" />
                    <Label htmlFor="report-full" className="flex-1 cursor-pointer text-sm font-medium">
                      Full Company Report (for Accountant)
                    </Label>
                    <span className="text-xs text-muted-foreground">
                      {reportData.summary.totalAgents} agents, {reportData.summary.totalOrders} orders
                    </span>
                  </div>

                  {reportData.agents.map((agent) => (
                    <div key={agent.agentName} className="flex items-center space-x-2 p-3 rounded-lg border hover-elevate active-elevate-2">
                      <Checkbox
                        id={`report-${agent.agentName}`}
                        checked={selectedReports.has(agent.agentName)}
                        onCheckedChange={() => onToggleReport(agent.agentName)}
                        data-testid={`checkbox-agent-${agent.agentName}`}
                      />
                      <Label htmlFor={`report-${agent.agentName}`} className="flex-1 cursor-pointer">
                        <div className="text-sm font-medium">{agent.firstName && agent.lastName ? `${agent.firstName} ${agent.lastName}` : agent.agentName}</div>
                        <div className="text-xs text-muted-foreground">{agent.email}</div>
                      </Label>
                      <div className="text-right text-xs text-muted-foreground">
                        <div>{agent.totalOrders} orders</div>
                        <div className="font-medium">${agent.totalCommission.toFixed(2)} commission</div>
                      </div>
                    </div>
                  ))}
                </div>

                <Button onClick={onGeneratePDFs} disabled={generating || selectedReports.size === 0} className="w-full" data-testid="button-generate-pdfs">
                  {generating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating PDFs...
                    </>
                  ) : (
                    <>
                      <FileDown className="mr-2 h-4 w-4" />
                      Generate {selectedReports.size} Report{selectedReports.size > 1 ? "s" : ""}
                    </>
                  )}
                </Button>

                {selectedReports.size > 1 && <p className="text-xs text-muted-foreground text-center">Multiple reports will be downloaded as a ZIP file</p>}
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

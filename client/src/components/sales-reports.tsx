import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { FileDown, Loader2, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import JSZip from "jszip";
import { format } from "date-fns";

interface AgentSalesData {
  agentName: string;
  agentId: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  totalOrders: number;
  totalSales: number;
  totalCommission: number;
  orders: Array<{
    id: string;
    orderNumber: string;
    orderDate: string;
    billingCompany: string;
    billingEmail: string;
    total: number;
    commissionType: string;
    commissionAmount: number;
    status: string;
  }>;
}

interface SalesReportData {
  summary: {
    totalAgents: number;
    totalOrders: number;
    totalRevenue: number;
    totalCommissionsPaid: number;
    dateRange: {
      start: string;
      end: string;
    };
  };
  agents: AgentSalesData[];
}

export function SalesReports() {
  const { toast } = useToast();
  const [generating, setGenerating] = useState(false);
  
  // Default to current month
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  
  const [startDate, setStartDate] = useState(format(firstDayOfMonth, 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(lastDayOfMonth, 'yyyy-MM-dd'));
  
  // Track which reports to generate
  const [selectedReports, setSelectedReports] = useState<Set<string>>(new Set(['full']));
  
  // Fetch sales data for the selected date range
  const { data: reportData, isLoading, refetch } = useQuery<SalesReportData>({
    queryKey: ['/api/reports/sales-data', startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate,
        endDate,
      });
      const response = await fetch(`/api/reports/sales-data?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch sales data');
      }
      return response.json();
    },
    enabled: false, // Only fetch when user clicks "Load Data"
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
  
  const generateFullCompanyReport = (data: SalesReportData): jsPDF => {
    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(20);
    doc.text("Hemp Wick Sales Commission Report", 14, 20);
    
    // Date range
    doc.setFontSize(12);
    doc.text(`Period: ${format(new Date(data.summary.dateRange.start), 'MMM dd, yyyy')} - ${format(new Date(data.summary.dateRange.end), 'MMM dd, yyyy')}`, 14, 30);
    doc.text(`Generated: ${format(new Date(), 'MMM dd, yyyy HH:mm')}`, 14, 37);
    
    // Summary section
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
      theme: 'striped',
      headStyles: { fillColor: [41, 128, 185] },
    });
    
    // Agent breakdown
    doc.setFontSize(14);
    const lastY = (doc as any).lastAutoTable.finalY || 100;
    doc.text("Agent Breakdown", 14, lastY + 15);
    
    const agentData = data.agents.map(agent => [
      agent.firstName && agent.lastName ? `${agent.firstName} ${agent.lastName}` : agent.agentName,
      agent.totalOrders.toString(),
      `$${agent.totalSales.toFixed(2)}`,
      `$${agent.totalCommission.toFixed(2)}`,
    ]);
    
    autoTable(doc, {
      startY: lastY + 20,
      head: [["Agent Name", "Orders", "Sales", "Commission"]],
      body: agentData,
      theme: 'striped',
      headStyles: { fillColor: [41, 128, 185] },
    });
    
    return doc;
  };
  
  const generateAgentReport = (agent: AgentSalesData, dateRange: { start: string; end: string }): jsPDF => {
    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(20);
    const agentDisplayName = agent.firstName && agent.lastName 
      ? `${agent.firstName} ${agent.lastName}` 
      : agent.agentName;
    doc.text(`Commission Report: ${agentDisplayName}`, 14, 20);
    
    // Date range
    doc.setFontSize(12);
    doc.text(`Period: ${format(new Date(dateRange.start), 'MMM dd, yyyy')} - ${format(new Date(dateRange.end), 'MMM dd, yyyy')}`, 14, 30);
    doc.text(`Generated: ${format(new Date(), 'MMM dd, yyyy HH:mm')}`, 14, 37);
    
    // Agent summary
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
      theme: 'striped',
      headStyles: { fillColor: [41, 128, 185] },
    });
    
    // Order details
    doc.setFontSize(14);
    const lastY = (doc as any).lastAutoTable.finalY || 100;
    doc.text("Order Details", 14, lastY + 15);
    
    const orderData = agent.orders.map(order => [
      order.orderNumber,
      format(new Date(order.orderDate), 'MMM dd, yyyy'),
      order.billingCompany || order.billingEmail || 'N/A',
      `$${order.total.toFixed(2)}`,
      order.commissionType === 'auto' ? 'Auto' : `${order.commissionType}%`,
      `$${order.commissionAmount.toFixed(2)}`,
    ]);
    
    autoTable(doc, {
      startY: lastY + 20,
      head: [["Order #", "Date", "Customer", "Total", "Comm Type", "Commission"]],
      body: orderData,
      theme: 'striped',
      headStyles: { fillColor: [41, 128, 185] },
      styles: { fontSize: 8 },
    });
    
    return doc;
  };
  
  const handleGeneratePDFs = async () => {
    if (!reportData) {
      toast({
        title: "No data",
        description: "Please load data first",
        variant: "destructive",
      });
      return;
    }
    
    if (selectedReports.size === 0) {
      toast({
        title: "No reports selected",
        description: "Please select at least one report to generate",
        variant: "destructive",
      });
      return;
    }
    
    setGenerating(true);
    
    try {
      const pdfs: Array<{ filename: string; blob: Blob }> = [];
      
      // Generate full company report if selected
      if (selectedReports.has('full')) {
        const doc = generateFullCompanyReport(reportData);
        const blob = doc.output('blob');
        pdfs.push({
          filename: `Full_Company_Report_${format(new Date(reportData.summary.dateRange.start), 'yyyy-MM')}.pdf`,
          blob,
        });
      }
      
      // Generate individual agent reports
      for (const agent of reportData.agents) {
        if (selectedReports.has(agent.agentName)) {
          const doc = generateAgentReport(agent, reportData.summary.dateRange);
          const blob = doc.output('blob');
          const agentFileName = agent.firstName && agent.lastName 
            ? `${agent.firstName}_${agent.lastName}` 
            : agent.agentName.replace(/\s+/g, '_');
          pdfs.push({
            filename: `${agentFileName}_Report_${format(new Date(reportData.summary.dateRange.start), 'yyyy-MM')}.pdf`,
            blob,
          });
        }
      }
      
      // If only one PDF, download it directly
      if (pdfs.length === 1) {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(pdfs[0].blob);
        link.download = pdfs[0].filename;
        link.click();
      } else {
        // Multiple PDFs - create a ZIP file
        const zip = new JSZip();
        pdfs.forEach(pdf => {
          zip.file(pdf.filename, pdf.blob);
        });
        
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(zipBlob);
        link.download = `Sales_Reports_${format(new Date(reportData.summary.dateRange.start), 'yyyy-MM')}.zip`;
        link.click();
      }
      
      toast({
        title: "Success",
        description: `Generated ${pdfs.length} report${pdfs.length > 1 ? 's' : ''}`,
      });
    } catch (error) {
      console.error("Error generating PDFs:", error);
      toast({
        title: "Error",
        description: "Failed to generate reports",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Sales Commission Reports</CardTitle>
          <CardDescription>
            Generate PDF reports for yourself (accountant) and your sales agents
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Date Range Selection */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Select Date Range</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start-date">Start Date</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="pl-10"
                    data-testid="input-start-date"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-date">End Date</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="end-date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="pl-10"
                    data-testid="input-end-date"
                  />
                </div>
              </div>
            </div>
            <Button 
              onClick={handleLoadData} 
              disabled={isLoading}
              data-testid="button-load-data"
            >
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
          
          {/* Report Selection */}
          {reportData && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Select Reports to Generate</h3>
              
              {reportData.summary.totalOrders === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No sales data found for this period.
                </p>
              ) : (
                <>
                  <div className="space-y-3">
                    {/* Full Company Report */}
                    <div className="flex items-center space-x-2 p-3 rounded-lg border hover-elevate active-elevate-2">
                      <Checkbox
                        id="report-full"
                        checked={selectedReports.has('full')}
                        onCheckedChange={() => toggleReport('full')}
                        data-testid="checkbox-full-report"
                      />
                      <Label
                        htmlFor="report-full"
                        className="flex-1 cursor-pointer text-sm font-medium"
                      >
                        Full Company Report (for Accountant)
                      </Label>
                      <span className="text-xs text-muted-foreground">
                        {reportData.summary.totalAgents} agents, {reportData.summary.totalOrders} orders
                      </span>
                    </div>
                    
                    {/* Individual Agent Reports */}
                    {reportData.agents.map((agent) => (
                      <div
                        key={agent.agentName}
                        className="flex items-center space-x-2 p-3 rounded-lg border hover-elevate active-elevate-2"
                      >
                        <Checkbox
                          id={`report-${agent.agentName}`}
                          checked={selectedReports.has(agent.agentName)}
                          onCheckedChange={() => toggleReport(agent.agentName)}
                          data-testid={`checkbox-agent-${agent.agentName}`}
                        />
                        <Label
                          htmlFor={`report-${agent.agentName}`}
                          className="flex-1 cursor-pointer"
                        >
                          <div className="text-sm font-medium">
                            {agent.firstName && agent.lastName 
                              ? `${agent.firstName} ${agent.lastName}`
                              : agent.agentName}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {agent.email}
                          </div>
                        </Label>
                        <div className="text-right text-xs text-muted-foreground">
                          <div>{agent.totalOrders} orders</div>
                          <div className="font-medium">${agent.totalCommission.toFixed(2)} commission</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <Button 
                    onClick={handleGeneratePDFs}
                    disabled={generating || selectedReports.size === 0}
                    className="w-full"
                    data-testid="button-generate-pdfs"
                  >
                    {generating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating PDFs...
                      </>
                    ) : (
                      <>
                        <FileDown className="mr-2 h-4 w-4" />
                        Generate {selectedReports.size} Report{selectedReports.size > 1 ? 's' : ''}
                      </>
                    )}
                  </Button>
                  
                  {selectedReports.size > 1 && (
                    <p className="text-xs text-muted-foreground text-center">
                      Multiple reports will be downloaded as a ZIP file
                    </p>
                  )}
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

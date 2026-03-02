import { useState } from "react";
import { AlertCircle, Loader2, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";

export function EhubReplyScannerCard() {
  const { toast } = useToast();
  const [isScanning, setIsScanning] = useState(false);
  const [scanResults, setScanResults] = useState<any>(null);
  const [waitDays, setWaitDays] = useState(3);
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);

  const handleScan = async (dryRun: boolean) => {
    setIsScanning(true);
    try {
      const res = await fetch("/api/ehub/scan-replies", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dryRun,
          waitDays,
          selectedEmails: dryRun ? undefined : selectedEmails.length > 0 ? selectedEmails : undefined,
        }),
      });

      if (!res.ok) throw new Error("Scan failed");

      const result = await res.json();
      setScanResults(result);

      if (dryRun) {
        toast({
          title: "Scan Complete",
          description: result.message,
        });
      } else {
        toast({
          title: "Enrollment Complete",
          description: result.message,
        });
        setSelectedEmails([]);
        setSelectAll(false);
        setTimeout(() => handleScan(true), 1000);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to scan for replies",
        variant: "destructive",
      });
    } finally {
      setIsScanning(false);
    }
  };

  const toggleEmail = (email: string) => {
    setSelectedEmails((prev) => (prev.includes(email) ? prev.filter((e) => e !== email) : [...prev, email]));
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedEmails([]);
    } else {
      const eligibleEmails =
        scanResults?.details
          .filter((d: any) => d.isNew && d.status !== "has_reply" && d.status !== "blacklisted")
          .map((d: any) => d.email) || [];
      setSelectedEmails(eligibleEmails);
    }
    setSelectAll(!selectAll);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gmail Reply Scanner</CardTitle>
        <CardDescription>Scan your Gmail sent folder for draft recipients and enroll them into Manual Follow-Ups</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <Label htmlFor="wait-days">Wait Days</Label>
            <Input
              id="wait-days"
              type="number"
              min="1"
              value={waitDays}
              onChange={(e) => setWaitDays(parseInt(e.target.value) || 3)}
              data-testid="input-wait-days"
            />
          </div>
          <div className="flex gap-2 items-end">
            <Button onClick={() => handleScan(true)} disabled={isScanning} data-testid="button-scan-preview">
              {isScanning ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
              Scan
            </Button>
            {scanResults && selectedEmails.length > 0 && (
              <Button onClick={() => handleScan(false)} disabled={isScanning} variant="default" data-testid="button-enroll-selected">
                Enroll {selectedEmails.length} Selected
              </Button>
            )}
          </div>
        </div>

        {scanResults && (
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="w-4 h-4" />
              <AlertTitle>Scan Results</AlertTitle>
              <AlertDescription>
                Scanned {scanResults.scanned} emails. Found {scanResults.details.filter((d: any) => d.isNew).length} new contacts.
              </AlertDescription>
            </Alert>

            {scanResults.details.filter((d: any) => d.isNew && d.status !== "has_reply" && d.status !== "blacklisted").length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox checked={selectAll} onCheckedChange={handleSelectAll} data-testid="checkbox-select-all" />
                  <Label className="cursor-pointer" onClick={handleSelectAll}>
                    Select All ({scanResults.details.filter((d: any) => d.isNew && d.status !== "has_reply" && d.status !== "blacklisted").length})
                  </Label>
                </div>

                <ScrollArea className="h-[300px] border rounded-md p-4">
                  <div className="space-y-2">
                    {scanResults.details
                      .filter((d: any) => d.isNew && d.status !== "has_reply" && d.status !== "blacklisted")
                      .map((detail: any, idx: number) => (
                        <div key={idx} className="flex items-center gap-2 p-2 hover:bg-muted rounded">
                          <Checkbox
                            checked={selectedEmails.includes(detail.email)}
                            onCheckedChange={() => toggleEmail(detail.email)}
                            data-testid={`checkbox-email-${idx}`}
                          />
                          <div className="flex-1">
                            <div className="font-medium">{detail.email}</div>
                            <div className="text-sm text-muted-foreground">{detail.message}</div>
                          </div>
                          <Badge variant={detail.status === "new" ? "default" : "secondary"}>{detail.status}</Badge>
                        </div>
                      ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {scanResults.details.filter((d: any) => !d.isNew || d.status === "has_reply" || d.status === "blacklisted").length > 0 && (
              <div className="space-y-2">
                <Label>Already Enrolled or Excluded</Label>
                <ScrollArea className="h-[200px] border rounded-md p-4">
                  <div className="space-y-2">
                    {scanResults.details
                      .filter((d: any) => !d.isNew || d.status === "has_reply" || d.status === "blacklisted")
                      .map((detail: any, idx: number) => (
                        <div key={idx} className="p-2 hover:bg-muted rounded">
                          <div className="flex items-center justify-between">
                            <div className="font-medium">{detail.email}</div>
                            <Badge variant="secondary">{detail.status}</Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">{detail.message}</div>
                        </div>
                      ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

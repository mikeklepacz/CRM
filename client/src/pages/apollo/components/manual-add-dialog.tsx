import { AlertCircle, Linkedin, Loader2, Mail, Search, Sparkles, Users } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { PreviewResult } from "../types";

type ManualAddDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyName: string;
  onCompanyNameChange: (value: string) => void;
  companyWebsite: string;
  onCompanyWebsiteChange: (value: string) => void;
  previewResult: PreviewResult | null;
  previewLoading: boolean;
  enriching: boolean;
  onPreview: () => void;
  onEnrich: () => void;
  onCancel: () => void;
};

export function ManualAddDialog({
  open,
  onOpenChange,
  companyName,
  onCompanyNameChange,
  companyWebsite,
  onCompanyWebsiteChange,
  previewResult,
  previewLoading,
  enriching,
  onPreview,
  onEnrich,
  onCancel,
}: ManualAddDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Company Manually</DialogTitle>
          <DialogDescription>
            Enter a company name and optional website to search Apollo for contacts
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="manualCompanyName">Company Name *</Label>
            <Input
              id="manualCompanyName"
              placeholder="Enter company name..."
              value={companyName}
              onChange={(e) => onCompanyNameChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onPreview()}
              data-testid="input-manual-company-name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="manualCompanyWebsite">Website (optional)</Label>
            <Input
              id="manualCompanyWebsite"
              placeholder="e.g., example.com"
              value={companyWebsite}
              onChange={(e) => onCompanyWebsiteChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onPreview()}
              data-testid="input-manual-company-website"
            />
            <p className="text-xs text-muted-foreground">
              Providing a website improves search accuracy
            </p>
          </div>

          <Button
            onClick={onPreview}
            disabled={previewLoading || !companyName.trim()}
            className="w-full"
            data-testid="button-manual-preview"
          >
            {previewLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Search className="h-4 w-4 mr-2" />
            )}
            Search Apollo
          </Button>

          {previewResult && (
            <div className="border-t pt-4 space-y-4">
              {previewResult.company ? (
                <>
                  <div className="border rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      {previewResult.company.logo_url && (
                        <img
                          src={previewResult.company.logo_url}
                          alt={previewResult.company.name}
                          className="h-12 w-12 rounded object-contain bg-white"
                        />
                      )}
                      <div className="flex-1">
                        <h4 className="font-semibold flex items-center gap-2">
                          {previewResult.company.name}
                          {previewResult.company.linkedin_url && (
                            <a href={previewResult.company.linkedin_url} target="_blank" rel="noopener noreferrer">
                              <Linkedin className="h-4 w-4 text-blue-600" />
                            </a>
                          )}
                        </h4>
                        <div className="text-sm text-muted-foreground space-y-1">
                          {previewResult.company.industry && <p>{previewResult.company.industry}</p>}
                          {previewResult.company.estimated_num_employees && (
                            <p>{previewResult.company.estimated_num_employees} employees</p>
                          )}
                          {(previewResult.company.city || previewResult.company.state || previewResult.company.country) && (
                            <p>
                              {[previewResult.company.city, previewResult.company.state, previewResult.company.country]
                                .filter(Boolean)
                                .join(", ")}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Available Contacts ({previewResult.totalContacts} total, showing {previewResult.contacts.length})
                    </h4>
                    {previewResult.contacts.length > 0 ? (
                      <div className="space-y-2 max-h-[200px] overflow-y-auto">
                        {previewResult.contacts.map((person) => (
                          <div key={person.id} className="border rounded-lg p-3 flex items-center justify-between">
                            <div>
                              <p className="font-medium">
                                {person.first_name} {person.last_name?.replace(/\*+/g, "***")}
                              </p>
                              <p className="text-sm text-muted-foreground">{person.title}</p>
                              {person.seniority && (
                                <Badge variant="outline" className="mt-1 text-xs">
                                  {person.seniority}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {person.has_email && (
                                <Tooltip>
                                  <TooltipTrigger>
                                    <Mail className="h-4 w-4 text-green-600" />
                                  </TooltipTrigger>
                                  <TooltipContent>Has email</TooltipContent>
                                </Tooltip>
                              )}
                              {person.linkedin_url && (
                                <a href={person.linkedin_url} target="_blank" rel="noopener noreferrer">
                                  <Linkedin className="h-4 w-4 text-blue-600" />
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          No contacts found matching your target criteria.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>

                  <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button
                      variant="outline"
                      onClick={onCancel}
                      disabled={enriching}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={onEnrich}
                      disabled={enriching || previewResult.contacts.length === 0}
                      data-testid="button-manual-enrich"
                    >
                      {enriching ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4 mr-2" />
                      )}
                      Enrich {previewResult.contacts.length} Contacts
                    </Button>
                  </div>
                </>
              ) : (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No matching company found in Apollo. Try with a different name or add a website domain.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

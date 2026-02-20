import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertCircle, Linkedin, Loader2, Mail, Sparkles, Users } from "lucide-react";
import { extractDomain } from "../constants";
import type { PreviewResult, StoreContact } from "../types";

export function PreviewDialog({
  contact,
  preview,
  isLoading,
  onEnrich,
  isEnriching,
}: {
  contact: StoreContact | null;
  preview: PreviewResult | null;
  isLoading: boolean;
  onEnrich: () => void;
  isEnriching: boolean;
}) {
  if (!contact) return null;

  return (
    <div className="space-y-4">
      <div className="bg-muted p-4 rounded-lg">
        <h3 className="font-semibold">{contact.name}</h3>
        <p className="text-sm text-muted-foreground">{contact.email || "No email"}</p>
        {contact.website && <p className="text-sm text-muted-foreground">{extractDomain(contact.website)}</p>}
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-8 gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Searching Apollo...</p>
        </div>
      ) : preview?.company ? (
        <div className="space-y-4">
          <div className="border rounded-lg p-4">
            <div className="flex items-start gap-3">
              {preview.company.logo_url && (
                <img
                  src={preview.company.logo_url}
                  alt={preview.company.name}
                  className="h-12 w-12 rounded object-contain bg-white"
                />
              )}
              <div className="flex-1">
                <h4 className="font-semibold flex items-center gap-2">
                  {preview.company.name}
                  {preview.company.linkedin_url && (
                    <a href={preview.company.linkedin_url} target="_blank" rel="noopener noreferrer">
                      <Linkedin className="h-4 w-4 text-blue-600" />
                    </a>
                  )}
                </h4>
                <div className="text-sm text-muted-foreground space-y-1">
                  {preview.company.industry && <p>{preview.company.industry}</p>}
                  {preview.company.estimated_num_employees && <p>{preview.company.estimated_num_employees} employees</p>}
                  {(preview.company.city || preview.company.state || preview.company.country) && (
                    <p>{[preview.company.city, preview.company.state, preview.company.country].filter(Boolean).join(", ")}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Available Contacts ({preview.totalContacts} total, showing {preview.contacts.length})
            </h4>
            {preview.contacts.length > 0 ? (
              <div className="space-y-2">
                {preview.contacts.map((person) => (
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
                <AlertDescription>No contacts found matching your target criteria.</AlertDescription>
              </Alert>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => {}}>
              Cancel
            </Button>
            <Button onClick={onEnrich} disabled={isEnriching || preview.contacts.length === 0} data-testid="button-enrich">
              {isEnriching ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
              Enrich {preview.contacts.length} Contacts
            </Button>
          </div>
        </div>
      ) : (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>No matching company found in Apollo. Try with a different domain or company name.</AlertDescription>
        </Alert>
      )}
    </div>
  );
}


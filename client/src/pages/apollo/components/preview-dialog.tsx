import { useEffect, useMemo, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertCircle, Building2, Globe, Linkedin, Loader2, Mail, Sparkles, Users } from "lucide-react";
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
  onEnrich: (selectedPersonIds: string[]) => void;
  isEnriching: boolean;
}) {
  if (!contact) return null;

  const [selectedPeople, setSelectedPeople] = useState<Set<string>>(new Set());
  const [showContactsWithoutEmail, setShowContactsWithoutEmail] = useState(false);

  const emailReadyContacts = useMemo(
    () => (preview?.contacts || []).filter((person) => person.has_email),
    [preview]
  );
  const visibleContacts = useMemo(
    () => (preview?.contacts || []).filter((person) => showContactsWithoutEmail || person.has_email),
    [preview, showContactsWithoutEmail]
  );

  useEffect(() => {
    const defaultSelection = new Set(emailReadyContacts.map((person) => person.id));
    setSelectedPeople(defaultSelection);
  }, [preview?.company?.id, emailReadyContacts]);

  const togglePerson = (personId: string) => {
    setSelectedPeople((prev) => {
      const next = new Set(prev);
      if (next.has(personId)) next.delete(personId);
      else next.add(personId);
      return next;
    });
  };

  const selectedEmailReadyCount = emailReadyContacts.filter((person) => selectedPeople.has(person.id)).length;

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
                  <div className="flex items-center gap-3 pt-1">
                    {preview.company.website_url && (
                      <a
                        href={preview.company.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:underline"
                      >
                        <Globe className="h-3.5 w-3.5" />
                        Website
                      </a>
                    )}
                    {preview.company.linkedin_url && (
                      <a
                        href={preview.company.linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:underline"
                      >
                        <Linkedin className="h-3.5 w-3.5" />
                        Company LinkedIn
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="border rounded-lg p-4 space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              About The Company
            </h4>
            {preview.company.short_description ? (
              <p className="text-sm text-muted-foreground">{preview.company.short_description}</p>
            ) : (
              <p className="text-sm text-muted-foreground">No company description returned by Apollo for this result.</p>
            )}
            {preview.company.keywords && preview.company.keywords.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Keywords</p>
                <div className="flex flex-wrap gap-1.5">
                  {preview.company.keywords.map((keyword) => (
                    <Badge key={keyword} variant="secondary" className="text-xs">
                      {keyword}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2 gap-3 flex-wrap">
              <h4 className="font-medium flex items-center gap-2">
                <Users className="h-4 w-4" />
                Available Contacts ({preview.totalContacts} total, {emailReadyContacts.length} with email, showing {visibleContacts.length})
              </h4>
              <div className="flex items-center gap-4">
                <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                  <Checkbox
                    checked={showContactsWithoutEmail}
                    onCheckedChange={(checked) => setShowContactsWithoutEmail(checked === true)}
                  />
                  Show contacts without email
                </label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedPeople(new Set(emailReadyContacts.map((person) => person.id)))}
                  disabled={emailReadyContacts.length === 0}
                >
                  Select All Email-Ready
                </Button>
                <Button variant="outline" size="sm" onClick={() => setSelectedPeople(new Set())}>
                  Clear
                </Button>
              </div>
            </div>
            {visibleContacts.length > 0 ? (
              <div className="space-y-2">
                {visibleContacts.map((person) => {
                  const isEmailReady = !!person.has_email;
                  const isSelected = selectedPeople.has(person.id);
                  return (
                    <div key={person.id} className="border rounded-lg p-3 flex items-center justify-between gap-2">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => togglePerson(person.id)}
                          disabled={!isEmailReady}
                          data-testid={`checkbox-preview-person-${person.id}`}
                        />
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
                      </div>
                      <div className="flex items-center gap-2">
                        {isEmailReady ? (
                          <Tooltip>
                            <TooltipTrigger>
                              <Mail className="h-4 w-4 text-green-600" />
                            </TooltipTrigger>
                            <TooltipContent>Email available</TooltipContent>
                          </Tooltip>
                        ) : (
                          <Badge variant="outline" className="text-xs">No email</Badge>
                        )}
                        {person.linkedin_url && (
                          <a
                            href={person.linkedin_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-primary hover:underline text-xs"
                          >
                            <Linkedin className="h-4 w-4 text-blue-600" />
                            LinkedIn
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>No contacts found matching your target criteria.</AlertDescription>
              </Alert>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              onClick={() => onEnrich(Array.from(selectedPeople))}
              disabled={isEnriching || selectedEmailReadyCount === 0}
              data-testid="button-enrich"
            >
              {isEnriching ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
              Enrich {selectedEmailReadyCount} Contact{selectedEmailReadyCount === 1 ? "" : "s"}
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

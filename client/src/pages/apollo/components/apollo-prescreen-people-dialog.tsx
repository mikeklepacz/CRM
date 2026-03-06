import { ExternalLink, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type PreviewPerson = {
  id: string;
  first_name?: string;
  last_name?: string;
  title?: string;
  seniority?: string;
  has_email?: boolean;
  linkedin_url?: string;
};

type PreviewCompany = {
  name?: string;
  industry?: string;
  estimated_num_employees?: number;
  website_url?: string;
  linkedin_url?: string;
};

export function ApolloPrescreenPeopleDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loading: boolean;
  error?: string;
  companyName?: string;
  previewCompany?: PreviewCompany | null;
  people: PreviewPerson[];
  totalContacts: number;
}) {
  const { open, onOpenChange, loading, error, companyName, previewCompany, people, totalContacts } = props;
  const withEmail = people.filter((p) => p.has_email).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Pre-screen People Preview</DialogTitle>
          <DialogDescription>{companyName || "Company"} - pre-enrichment people visibility</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="text-sm text-destructive">{error}</div>
        ) : !previewCompany ? (
          <div className="text-sm text-muted-foreground">No Apollo company match found for this row.</div>
        ) : (
          <div className="space-y-3">
            <div className="border rounded-md p-3 space-y-2">
              <div className="font-medium">{previewCompany.name || companyName || "-"}</div>
              <div className="text-xs text-muted-foreground">
                {previewCompany.industry || "-"} | Employees: {previewCompany.estimated_num_employees ?? "-"}
              </div>
              <div className="flex items-center gap-3 text-xs">
                {previewCompany.website_url ? (
                  <a href={previewCompany.website_url} target="_blank" rel="noreferrer" className="text-primary inline-flex items-center gap-1">
                    Website <ExternalLink className="h-3 w-3" />
                  </a>
                ) : null}
                {previewCompany.linkedin_url ? (
                  <a href={previewCompany.linkedin_url} target="_blank" rel="noreferrer" className="text-primary inline-flex items-center gap-1">
                    LinkedIn <ExternalLink className="h-3 w-3" />
                  </a>
                ) : null}
              </div>
            </div>

            <div className="text-sm">
              Available Contacts: {totalContacts} total, {withEmail} with email, showing {people.length}
            </div>

            <ScrollArea className="h-[46vh] border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Seniority</TableHead>
                    <TableHead>Email Ready</TableHead>
                    <TableHead className="text-right">LinkedIn</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {people.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                        No contacts returned for this company.
                      </TableCell>
                    </TableRow>
                  ) : (
                    people.map((person) => (
                      <TableRow key={person.id}>
                        <TableCell>{`${person.first_name || ""} ${person.last_name || ""}`.trim() || "-"}</TableCell>
                        <TableCell>{person.title || "-"}</TableCell>
                        <TableCell>{person.seniority || "-"}</TableCell>
                        <TableCell>
                          <Badge variant={person.has_email ? "default" : "outline"}>
                            {person.has_email ? "Yes" : "No"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {person.linkedin_url ? (
                            <a href={person.linkedin_url} target="_blank" rel="noreferrer" className="text-primary inline-flex items-center gap-1">
                              Open <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

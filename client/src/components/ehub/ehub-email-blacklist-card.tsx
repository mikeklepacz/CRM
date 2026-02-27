import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function EhubEmailBlacklistCard() {
  const { toast } = useToast();
  const [newBlacklistEmail, setNewBlacklistEmail] = useState("");
  const [newBlacklistReason, setNewBlacklistReason] = useState("");

  const { data: blacklist, isLoading: isLoadingBlacklist } = useQuery<
    Array<{
      id: string;
      email: string;
      reason: string | null;
      createdAt: string;
    }>
  >({
    queryKey: ["/api/ehub/blacklist"],
  });

  const addToBlacklistMutation = useMutation({
    mutationFn: async (data: { email: string; reason?: string }) => {
      return await apiRequest("POST", "/api/ehub/blacklist", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ehub/blacklist"] });
      toast({
        title: "Email Blacklisted",
        description: "The email has been added to the blacklist",
      });
      setNewBlacklistEmail("");
      setNewBlacklistReason("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add email to blacklist",
        variant: "destructive",
      });
    },
  });

  const removeFromBlacklistMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/ehub/blacklist/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ehub/blacklist"] });
      toast({
        title: "Email Removed",
        description: "The email has been removed from the blacklist",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove email from blacklist",
        variant: "destructive",
      });
    },
  });

  const handleAddToBlacklist = () => {
    if (!newBlacklistEmail.trim()) {
      toast({
        title: "Error",
        description: "Email address is required",
        variant: "destructive",
      });
      return;
    }

    addToBlacklistMutation.mutate({
      email: newBlacklistEmail.trim(),
      reason: newBlacklistReason.trim() || undefined,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Email Blacklist</CardTitle>
        <CardDescription>Permanently exclude email addresses from enrollment</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <div className="flex-1">
            <Input
              placeholder="Email address"
              value={newBlacklistEmail}
              onChange={(e) => setNewBlacklistEmail(e.target.value)}
              data-testid="input-blacklist-email"
            />
          </div>
          <div className="flex-1">
            <Input
              placeholder="Reason (optional)"
              value={newBlacklistReason}
              onChange={(e) => setNewBlacklistReason(e.target.value)}
              data-testid="input-blacklist-reason"
            />
          </div>
          <Button onClick={handleAddToBlacklist} disabled={addToBlacklistMutation.isPending} data-testid="button-add-blacklist">
            {addToBlacklistMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
            Add
          </Button>
        </div>

        {isLoadingBlacklist ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : blacklist && blacklist.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Added</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {blacklist.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="font-medium">{entry.email}</TableCell>
                  <TableCell>{entry.reason || "-"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFromBlacklistMutation.mutate(entry.id)}
                      disabled={removeFromBlacklistMutation.isPending}
                      data-testid={`button-remove-blacklist-${entry.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8 text-muted-foreground">No blacklisted emails</div>
        )}
      </CardContent>
    </Card>
  );
}

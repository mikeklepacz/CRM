import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Upload, FileSpreadsheet, Loader2 } from "lucide-react";
import Papa from "papaparse";
import { isUnauthorizedError } from "@/lib/authUtils";

export function CsvUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [uniqueKey, setUniqueKey] = useState<string>("");
  const [preview, setPreview] = useState<any[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async (data: { headers: string[]; rows: any[]; uniqueKey: string; filename: string }) => {
      return await apiRequest("POST", "/api/csv/upload", data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "CSV uploaded and clients updated successfully",
      });
      setFile(null);
      setHeaders([]);
      setUniqueKey("");
      setPreview([]);
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);

    Papa.parse(selectedFile, {
      header: true,
      preview: 5,
      complete: (results) => {
        if (results.meta.fields) {
          setHeaders(results.meta.fields);
          setPreview(results.data);
        }
      },
      error: (error) => {
        toast({
          title: "Parse error",
          description: error.message,
          variant: "destructive",
        });
      },
    });
  };

  const handleUpload = () => {
    if (!file || !uniqueKey) {
      toast({
        title: "Missing information",
        description: "Please select a file and unique key",
        variant: "destructive",
      });
      return;
    }

    Papa.parse(file, {
      header: true,
      complete: (results) => {
        uploadMutation.mutate({
          headers: results.meta.fields || [],
          rows: results.data,
          uniqueKey,
          filename: file.name,
        });
      },
      error: (error) => {
        toast({
          title: "Parse error",
          description: error.message,
          variant: "destructive",
        });
      },
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          Upload CSV
        </CardTitle>
        <CardDescription>
          Upload client data from CSV. The system will detect headers and update existing records based on your unique key.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="csv-file">CSV File</Label>
          <div className="flex items-center gap-2">
            <input
              id="csv-file"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
              data-testid="input-csv-file"
            />
            <Button
              variant="outline"
              onClick={() => document.getElementById('csv-file')?.click()}
              data-testid="button-select-csv"
            >
              <Upload className="h-4 w-4 mr-2" />
              {file ? file.name : "Select CSV File"}
            </Button>
          </div>
        </div>

        {headers.length > 0 && (
          <div className="space-y-2">
            <Label htmlFor="unique-key">Unique Key Column</Label>
            <Select value={uniqueKey} onValueChange={setUniqueKey}>
              <SelectTrigger id="unique-key" data-testid="select-unique-key">
                <SelectValue placeholder="Select unique identifier column" />
              </SelectTrigger>
              <SelectContent>
                {headers.map((header) => (
                  <SelectItem key={header} value={header} data-testid={`option-unique-key-${header}`}>
                    {header}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Choose a column that uniquely identifies each client (e.g., Email, Link, Company ID)
            </p>
          </div>
        )}

        {preview.length > 0 && (
          <div className="space-y-2">
            <Label>Preview (First 5 Rows)</Label>
            <div className="border rounded-md overflow-auto max-h-48">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    {headers.map((header) => (
                      <th key={header} className="px-4 py-2 text-left font-medium">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, idx) => (
                    <tr key={idx} className="border-t">
                      {headers.map((header) => (
                        <td key={header} className="px-4 py-2">
                          {row[header]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <Button
          onClick={handleUpload}
          disabled={!file || !uniqueKey || uploadMutation.isPending}
          className="w-full"
          data-testid="button-upload-csv"
        >
          {uploadMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Upload & Merge Data
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

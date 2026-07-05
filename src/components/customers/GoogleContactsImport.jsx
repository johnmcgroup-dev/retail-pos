import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, Loader2, CheckCircle2, Download } from "lucide-react";

export default function GoogleContactsImport({ open, onClose, company }) {
  const queryClient = useQueryClient();
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);

  const importMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Please select a CSV file");
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      const extracted = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: "object",
          properties: {
            customers: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  email: { type: "string" },
                  phone: { type: "string" },
                  address: { type: "string" },
                },
              },
            },
          },
        },
      });

      const list = extracted.output?.customers || extracted.output || [];
      const cleaned = (Array.isArray(list) ? list : [])
        .filter((c) => c && c.name)
        .map((c) => ({
          company_id: company?.id,
          name: c.name,
          email: c.email || "",
          phone: c.phone || "",
          address: c.address || "",
          customer_type: "retail",
          status: "active",
        }));

      if (cleaned.length === 0) throw new Error("No valid contacts found in the file");

      await base44.entities.Customer.bulkCreate(cleaned);
      return { imported: cleaned.length };
    },
    onSuccess: (data) => {
      setResult(data);
      queryClient.invalidateQueries(["customers"]);
    },
  });

  const handleClose = () => {
    setFile(null);
    setResult(null);
    importMutation.reset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import from Google Contacts</DialogTitle>
        </DialogHeader>

        {result ? (
          <div className="py-4 text-center">
            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <p className="font-semibold text-slate-900">{result.imported} customers imported</p>
            <p className="text-sm text-slate-500 mt-1">Your Google Contacts have been added.</p>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <Alert className="bg-blue-50 border-blue-200">
              <AlertDescription className="text-blue-800 text-xs">
                Export your contacts from Google Contacts (Export → CSV), then upload the file here.{" "}
                <a
                  href="https://contacts.google.com"
                  target="_blank"
                  rel="noreferrer"
                  className="underline font-medium"
                >
                  Open Google Contacts
                </a>
              </AlertDescription>
            </Alert>

            <div>
              <Label className="text-sm font-semibold mb-2 block">Google Contacts CSV file</Label>
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-lg p-6 cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-colors">
                <Upload className="w-8 h-8 text-slate-400 mb-2" />
                <span className="text-sm text-slate-600">
                  {file ? file.name : "Click to choose a CSV file"}
                </span>
                <input
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files[0])}
                />
              </label>
            </div>

            {importMutation.isError && (
              <Alert variant="destructive">
                <AlertDescription>{importMutation.error.message}</AlertDescription>
              </Alert>
            )}
          </div>
        )}

        <DialogFooter>
          {result ? (
            <Button onClick={handleClose} className="w-full">
              Done
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={handleClose} disabled={importMutation.isPending}>
                Cancel
              </Button>
              <Button
                onClick={() => importMutation.mutate()}
                disabled={!file || importMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {importMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                Import
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
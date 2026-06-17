import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, FileSpreadsheet, CheckCircle2, XCircle, Download, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const REQUIRED_COLUMNS = ["name", "selling_price"];
const OPTIONAL_COLUMNS = ["description", "category", "sku", "cost_price", "wholesale_price", "tax_rate", "unit", "reorder_level", "status", "barcode"];

function parseCSV(text) {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/[^a-z_]/g, ""));
  return lines.slice(1).filter(l => l.trim()).map(line => {
    const values = line.split(",").map(v => v.trim().replace(/^"|"$/g, ""));
    const row = {};
    headers.forEach((h, i) => { row[h] = values[i] || ""; });
    return row;
  });
}

export default function BulkImport() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const fileRef = useRef(null);
  const [preview, setPreview] = useState([]);
  const [errors, setErrors] = useState([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const [fileName, setFileName] = useState("");

  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: () => base44.entities.Company.list(),
  });

  const company = companies[0];

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setResult(null);
    setErrors([]);
    setPreview([]);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result;
      const rows = parseCSV(text);
      const errs = [];

      if (rows.length === 0) {
        errs.push("File is empty or has no data rows.");
        setErrors(errs);
        return;
      }

      const firstRow = rows[0];
      REQUIRED_COLUMNS.forEach(col => {
        if (!(col in firstRow)) errs.push(`Missing required column: "${col}"`);
      });

      rows.forEach((row, i) => {
        if (!row.name) errs.push(`Row ${i + 2}: Missing product name`);
        if (!row.selling_price || isNaN(Number(row.selling_price))) errs.push(`Row ${i + 2}: Invalid selling_price`);
      });

      setErrors(errs);
      setPreview(rows.slice(0, 5));
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!company) return;
    const file = fileRef.current?.files?.[0];
    if (!file) return;

    setImporting(true);
    let success = 0;
    let failed = 0;

    const text = await file.text();
    const rows = parseCSV(text);

    for (const row of rows) {
      try {
        const barcodes = row.barcode ? row.barcode.split("|").map(b => b.trim()).filter(Boolean) : [];
        await base44.entities.Product.create({
          company_id: company.id,
          name: row.name,
          description: row.description || "",
          category: row.category || "",
          sku: row.sku || "",
          cost_price: parseFloat(row.cost_price) || 0,
          selling_price: parseFloat(row.selling_price),
          wholesale_price: parseFloat(row.wholesale_price) || 0,
          tax_rate: parseFloat(row.tax_rate) || 0,
          unit: row.unit || "piece",
          reorder_level: parseInt(row.reorder_level) || 10,
          status: row.status || "active",
          barcodes,
        });
        success++;
      } catch {
        failed++;
      }
    }

    setResult({ success, failed });
    setImporting(false);
    queryClient.invalidateQueries(["products"]);
    toast({ title: `Import complete: ${success} added${failed > 0 ? `, ${failed} failed` : ""}` });
  };

  const downloadTemplate = () => {
    const header = ["name", "selling_price", "cost_price", "category", "sku", "description", "unit", "reorder_level", "tax_rate", "barcode"].join(",");
    const example = ["Sample Product", "19.99", "10.00", "Electronics", "SKU001", "A sample product", "piece", "10", "0", "1234567890"].join(",");
    const blob = new Blob([header + "\n" + example], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "products_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Bulk Import Products</h1>
        <p className="text-slate-500 mt-1">Upload a CSV spreadsheet to import multiple products at once</p>
      </div>

      <Alert className="bg-blue-50 border-blue-200">
        <FileSpreadsheet className="h-4 w-4 text-blue-600" />
        <AlertDescription className="flex items-center justify-between">
          <span className="text-blue-800">Download the CSV template to see the required format.</span>
          <Button size="sm" variant="outline" onClick={downloadTemplate} className="gap-2 flex-shrink-0 ml-4">
            <Download className="w-4 h-4" />
            Template
          </Button>
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Column Reference</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {REQUIRED_COLUMNS.map(c => (
              <Badge key={c} className="bg-red-100 text-red-700">* {c}</Badge>
            ))}
            {OPTIONAL_COLUMNS.map(c => (
              <Badge key={c} variant="secondary">{c}</Badge>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-2">
            <span className="text-red-600">* Required.</span> For multiple barcodes, separate with <code className="bg-slate-100 px-1 rounded">|</code> in the barcode column.
          </p>
        </CardContent>
      </Card>

      <Card
        className="border-2 border-dashed border-slate-300 hover:border-blue-400 transition-colors cursor-pointer"
        onClick={() => fileRef.current?.click()}
      >
        <CardContent className="p-12 text-center">
          <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <p className="text-lg font-semibold text-slate-700">
            {fileName || "Click to upload CSV file"}
          </p>
          <p className="text-sm text-slate-500 mt-1">Supports .csv files</p>
          <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} className="hidden" />
        </CardContent>
      </Card>

      {errors.length > 0 && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>
            <p className="font-semibold mb-1">Please fix these issues:</p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              {errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {preview.length > 0 && errors.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              Preview (first {preview.length} rows)
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50">
                  {Object.keys(preview[0]).map(k => (
                    <th key={k} className="text-left p-3 text-slate-600 font-medium">{k}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.map((row, i) => (
                  <tr key={i} className="border-b hover:bg-slate-50">
                    {Object.values(row).map((v, j) => (
                      <td key={j} className="p-3 text-slate-700">{v}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {result && (
        <Alert className={result.failed === 0 ? "bg-green-50 border-green-200" : "bg-yellow-50 border-yellow-200"}>
          <CheckCircle2 className={`h-4 w-4 ${result.failed === 0 ? "text-green-600" : "text-yellow-600"}`} />
          <AlertDescription>
            <strong>{result.success} products imported successfully.</strong>
            {result.failed > 0 && <span className="text-red-600 ml-2">{result.failed} failed.</span>}
          </AlertDescription>
        </Alert>
      )}

      {preview.length > 0 && errors.length === 0 && !result && (
        <Button
          onClick={handleImport}
          disabled={importing || !company}
          className="w-full h-12 bg-green-600 hover:bg-green-700 text-base gap-2"
        >
          {importing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
          {importing ? "Importing..." : "Import Products"}
        </Button>
      )}
    </div>
  );
}
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
const OPTIONAL_COLUMNS = ["description", "category", "sku", "cost_price", "wholesale_price", "tax_rate", "unit", "reorder_level", "status", "barcode", "stock_quantity"];

const PRODUCT_SCHEMA = {
  type: "object",
  properties: {
    name: { type: "string" },
    selling_price: { type: "number" },
    cost_price: { type: "number" },
    wholesale_price: { type: "number" },
    category: { type: "string" },
    sku: { type: "string" },
    description: { type: "string" },
    unit: { type: "string" },
    reorder_level: { type: "number" },
    tax_rate: { type: "number" },
    barcode: { type: "string" },
    stock_quantity: { type: "number" },
  },
};

function parseCSV(text) {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/[^a-z_]/g, ""));
  return lines.slice(1).filter((l) => l.trim()).map((line) => {
    const values = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
    const row = {};
    headers.forEach((h, i) => { row[h] = values[i] || ""; });
    return row;
  });
}

function normalizeRows(output) {
  if (!output) return [];
  if (Array.isArray(output)) return output;
  if (Array.isArray(output.products)) return output.products;
  if (Array.isArray(output.rows)) return output.rows;
  if (Array.isArray(output.data)) return output.data;
  return [];
}

export default function BulkImport() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const fileRef = useRef(null);
  const [preview, setPreview] = useState([]);
  const [allRows, setAllRows] = useState([]);
  const [errors, setErrors] = useState([]);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const [fileName, setFileName] = useState("");

  const { data: companies = [] } = useQuery({ queryKey: ["companies"], queryFn: () => base44.entities.Company.list() });
  const { data: user } = useQuery({ queryKey: ["me"], queryFn: () => base44.auth.me(), staleTime: 5 * 60 * 1000 });
  const companyId = user?.company_id || user?.tenant_id || companies[0]?.id;

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setResult(null); setErrors([]); setPreview([]); setAllRows([]);
    setParsing(true);
    try {
      let rows = [];
      const isCSV = /\.csv$/i.test(file.name);
      if (isCSV) {
        const text = await file.text();
        rows = parseCSV(text);
      } else {
        // Excel (.xlsx/.xls) — parse via the file extraction integration
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        const res = await base44.integrations.Core.ExtractDataFromUploadedFile({ file_url, json_schema: PRODUCT_SCHEMA });
        if (res.status === "error") {
          setErrors([res.details || "Could not read the spreadsheet."]);
          setParsing(false);
          return;
        }
        rows = normalizeRows(res.output);
        // normalize keys to lowercase
        rows = rows.map((r) => {
          const o = {};
          Object.keys(r || {}).forEach((k) => { o[k.trim().toLowerCase().replace(/[^a-z_]/g, "")] = r[k]; });
          return o;
        });
      }

      const errs = [];
      if (rows.length === 0) errs.push("File is empty or has no data rows.");
      rows.forEach((row, i) => {
        if (!row.name) errs.push(`Row ${i + 2}: Missing product name`);
        if (!row.selling_price || isNaN(Number(row.selling_price))) errs.push(`Row ${i + 2}: Invalid selling_price`);
      });
      setErrors(errs);
      setAllRows(rows);
      setPreview(rows.slice(0, 5));
    } catch (err) {
      setErrors([err?.message || "Failed to read the file."]);
    } finally {
      setParsing(false);
    }
  };

  const handleImport = async () => {
    if (!companyId) return;
    setImporting(true);
    let success = 0;
    let failed = 0;

    for (const row of allRows) {
      try {
        const barcodes = row.barcode ? String(row.barcode).split("|").map((b) => b.trim()).filter(Boolean) : [];
        const product = await base44.entities.Product.create({
          company_id: companyId,
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
        const stock = parseFloat(row.stock_quantity) || 0;
        if (product.id && stock > 0) {
          await base44.entities.Inventory.create({
            company_id: companyId,
            product_id: product.id,
            quantity: stock,
            last_updated: new Date().toISOString(),
          });
        }
        success++;
      } catch {
        failed++;
      }
    }

    setResult({ success, failed });
    setImporting(false);
    queryClient.invalidateQueries(["products"]);
    queryClient.invalidateQueries(["inventory"]);
    toast({ title: `Import complete: ${success} added${failed ? `, ${failed} failed` : ""}` });
  };

  const downloadTemplate = () => {
    const header = ["name", "selling_price", "cost_price", "category", "sku", "description", "unit", "reorder_level", "tax_rate", "barcode", "stock_quantity"].join(",");
    const example = ["Sample Product", "19.99", "10.00", "Electronics", "SKU001", "A sample product", "piece", "10", "0", "1234567890", "50"].join(",");
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
        <p className="text-slate-500 mt-1">Upload a CSV or Excel (.xlsx) spreadsheet to import multiple products at once</p>
      </div>

      <Alert className="bg-blue-50 border-blue-200">
        <FileSpreadsheet className="h-4 w-4 text-blue-600" />
        <AlertDescription className="flex items-center justify-between">
          <span className="text-blue-800">Download the template to see the required format (works in Excel and Google Sheets).</span>
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
            {REQUIRED_COLUMNS.map((c) => (
              <Badge key={c} className="bg-red-100 text-red-700">* {c}</Badge>
            ))}
            {OPTIONAL_COLUMNS.map((c) => (
              <Badge key={c} variant="secondary">{c}</Badge>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-2">
            <span className="text-red-600">* Required.</span> For multiple barcodes, separate with <code className="bg-slate-100 px-1 rounded">|</code> in the barcode column. Include <code>stock_quantity</code> to set opening stock.
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
            {fileName || "Click to upload a spreadsheet"}
          </p>
          <p className="text-sm text-slate-500 mt-1">Supports .csv and .xlsx files</p>
          {parsing && <p className="text-sm text-blue-600 mt-2 flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Reading file...</p>}
          <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleFile} className="hidden" />
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
              Preview ({allRows.length} rows — showing first {preview.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50">
                  {Object.keys(preview[0]).map((k) => (
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
          disabled={importing || !companyId}
          className="w-full h-12 bg-green-600 hover:bg-green-700 text-base gap-2"
        >
          {importing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
          {importing ? "Importing..." : `Import ${allRows.length} Products`}
        </Button>
      )}
    </div>
  );
}
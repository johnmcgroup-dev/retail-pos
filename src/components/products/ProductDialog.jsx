import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload, X, Image as ImageIcon, Camera, Package, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import CameraCapture from "./CameraCapture";
import DrawerSelect from "@/components/shared/DrawerSelect";

export default function ProductDialog({ open, onClose, product, companies, inventoryItem, products = [], onSwitchToExisting }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    company_id: "",
    name: "",
    description: "",
    category: "",
    sku: "",
    barcodes: [],
    cost_price: 0,
    selling_price: 0,
    wholesale_price: 0,
    tax_rate: 0,
    unit: "piece",
    reorder_level: 10,
    track_expiration: false,
    default_expiry_days: 0,
    status: "active",
    image_url: "",
    images: [],
    stock_quantity: 0
  });

  const [barcodeInput, setBarcodeInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [duplicateError, setDuplicateError] = useState(null);

  const { data: currentUser } = useQuery({
    queryKey: ["me"],
    queryFn: () => base44.auth.me(),
    staleTime: 5 * 60 * 1000,
  });

  // Managed categories for the category dropdown
  const companyId = formData.company_id || currentUser?.company_id || currentUser?.tenant_id || companies[0]?.id;
  const { data: managedCategories = [] } = useQuery({
    queryKey: ["categories", companyId],
    queryFn: () => base44.entities.Category.filter({ company_id: companyId, is_active: true }, "sort_order"),
    enabled: !!companyId,
  });

  useEffect(() => {
    setDuplicateError(null);
    if (product) {
      setFormData({
        ...product,
        stock_quantity: inventoryItem?.quantity ?? 0
      });
    } else if (companies.length > 0) {
      const myId = currentUser?.company_id || currentUser?.tenant_id;
      const defaultCompanyId = (myId && companies.find(c => c.id === myId)?.id) || companies[0].id;
      setFormData(prev => ({
        ...prev,
        company_id: defaultCompanyId,
        stock_quantity: inventoryItem?.quantity ?? 0
      }));
    }
  }, [product, companies, inventoryItem, currentUser]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const { stock_quantity, ...productData } = data;
      let savedProduct;
      if (product) {
        savedProduct = await base44.entities.Product.update(product.id, productData);
      } else {
        savedProduct = await base44.entities.Product.create(productData);
      }

      // Manage inventory stock quantity
      if (stock_quantity !== undefined && stock_quantity !== null) {
        const companyId = productData.company_id || companies[0]?.id;
        if (companyId && savedProduct.id) {
          if (inventoryItem) {
            // Update existing inventory
            await base44.entities.Inventory.update(inventoryItem.id, {
              quantity: stock_quantity,
              last_updated: new Date().toISOString()
            });
          } else {
            // Create new inventory record
            await base44.entities.Inventory.create({
              company_id: companyId,
              product_id: savedProduct.id,
              quantity: stock_quantity,
              last_updated: new Date().toISOString()
            });
          }
        }
      }

      return savedProduct;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["products"]);
      queryClient.invalidateQueries(["inventory"]);
      onClose();
    },
  });

  const checkDuplicate = () => {
    const nameLower = formData.name?.trim().toLowerCase();
    const skuLower = formData.sku?.trim().toLowerCase();
    const barcodes = (formData.barcodes || []).map(b => b.trim()).filter(Boolean);

    return products.find(p => {
      if (nameLower && p.name?.trim().toLowerCase() === nameLower) return true;
      if (skuLower && p.sku?.trim().toLowerCase() === skuLower) return true;
      if (barcodes.length > 0) {
        const pBarcodes = (p.barcodes || []).map(b => b.trim());
        return barcodes.some(b => pBarcodes.includes(b));
      }
      return false;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Only check for duplicates when creating a new product
    if (!product) {
      const existing = checkDuplicate();
      if (existing) {
        setDuplicateError(existing);
        return;
      }
    }

    setDuplicateError(null);
    saveMutation.mutate(formData);
  };

  const handleImageUpload = async (e) => {
    // Accept either a change event (from <input type="file">) or a raw File (from CameraCapture)
    const file = e?.target?.files ? e.target.files[0] : e;
    if (!file) return;

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("File size must be less than 5MB");
      return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      setUploadError("Please upload an image file");
      return;
    }

    setUploading(true);
    setUploadError("");

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData({
        ...formData,
        image_url: file_url,
        images: [...(formData.images || []), file_url]
      });
    } catch (error) {
      setUploadError("Failed to upload image. Please try again.");
      console.error("Upload error:", error);
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index) => {
    const newImages = formData.images.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      images: newImages,
      image_url: newImages[0] || ""
    });
  };

  const addBarcode = () => {
    if (barcodeInput.trim()) {
      setFormData({
        ...formData,
        barcodes: [...(formData.barcodes || []), barcodeInput.trim()]
      });
      setBarcodeInput("");
    }
  };

  const removeBarcode = (index) => {
    setFormData({
      ...formData,
      barcodes: formData.barcodes.filter((_, i) => i !== index)
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{product ? "Edit Product" : "Add New Product"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {duplicateError && (
            <Alert className="bg-amber-50 border-amber-300">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                <p className="font-semibold mb-2">Product couldn't be registered because it already exists in the system.</p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (onSwitchToExisting) onSwitchToExisting(duplicateError);
                    setDuplicateError(null);
                  }}
                  className="h-7"
                >
                  Go to existing product
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Image Upload Section */}
          <div className="border-2 border-dashed border-slate-300 rounded-lg p-4">
            <Label className="mb-2 block">Product Images</Label>
            
            {formData.images && formData.images.length > 0 ? (
              <div className="grid grid-cols-4 gap-3 mb-3">
                {formData.images.map((img, index) => (
                  <div key={index} className="relative group">
                    <img src={img} alt={`Product ${index + 1}`} className="w-full h-24 object-cover rounded-lg" />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 mb-3">
                <ImageIcon className="w-12 h-12 text-slate-400 mb-2" />
                <p className="text-sm text-slate-500">No images uploaded</p>
              </div>
            )}

            <div className="flex items-center gap-2">
              <Input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={uploading}
                className="hidden"
                id="image-upload"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById('image-upload').click()}
                disabled={uploading}
                className="flex-1"
              >
                <Upload className="w-4 h-4 mr-2" />
                {uploading ? "Uploading..." : "Upload"}
              </Button>
              <div className="flex-1">
                <CameraCapture
                  onCapture={handleImageUpload}
                  disabled={uploading}
                  label={uploading ? "Uploading..." : "Camera"}
                />
              </div>
            </div>
            
            {uploadError && (
              <Alert variant="destructive" className="mt-2">
                <AlertDescription>{uploadError}</AlertDescription>
              </Alert>
            )}
            <p className="text-xs text-slate-500 mt-2">Max file size: 5MB. Supported: JPG, PNG, GIF</p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Product Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div>
              <Label>SKU</Label>
              <Input
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                placeholder="e.g., PRD-001"
              />
            </div>

            <div>
              <Label>Category</Label>
              {managedCategories.length > 0 ? (
                <DrawerSelect
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                  options={[
                    { value: "", label: "— No category —" },
                    ...managedCategories.map(c => ({ value: c.name, label: c.name })),
                  ]}
                  placeholder="Select a category"
                  label="Category"
                  triggerClassName="w-full h-9 px-3 py-2 border border-slate-300 rounded-md text-sm"
                />
              ) : (
                <Input
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="e.g., Electronics"
                />
              )}
            </div>

            <div>
              <Label>Unit</Label>
              <DrawerSelect
                value={formData.unit}
                onValueChange={(value) => setFormData({ ...formData, unit: value })}
                options={[
                  { value: "piece", label: "Piece" },
                  { value: "kg", label: "Kilogram" },
                  { value: "liter", label: "Liter" },
                  { value: "meter", label: "Meter" },
                  { value: "box", label: "Box" },
                  { value: "pack", label: "Pack" },
                ]}
                triggerClassName="w-full h-9 px-3 py-2 border border-slate-300 rounded-md text-sm"
                label="Unit"
              />
            </div>

            <div>
              <Label>Cost Price</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.cost_price}
                onChange={(e) => setFormData({ ...formData, cost_price: parseFloat(e.target.value) || 0 })}
              />
            </div>

            <div>
              <Label>Selling Price *</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.selling_price}
                onChange={(e) => setFormData({ ...formData, selling_price: parseFloat(e.target.value) || 0 })}
                required
              />
            </div>

            <div>
              <Label>Wholesale Price</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.wholesale_price}
                onChange={(e) => setFormData({ ...formData, wholesale_price: parseFloat(e.target.value) || 0 })}
              />
            </div>

            <div>
              <Label>Tax Rate (%)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.tax_rate}
                onChange={(e) => setFormData({ ...formData, tax_rate: parseFloat(e.target.value) || 0 })}
              />
            </div>

            <div>
              <Label>Reorder Level</Label>
              <Input
                type="number"
                value={formData.reorder_level}
                onChange={(e) => setFormData({ ...formData, reorder_level: parseInt(e.target.value) || 0 })}
              />
            </div>

            <div>
              <Label>Stock Quantity</Label>
              <Input
                type="number"
                value={formData.stock_quantity}
                onChange={(e) => setFormData({ ...formData, stock_quantity: parseInt(e.target.value) || 0 })}
                placeholder="e.g., 100"
              />
              <p className="text-xs text-slate-500 mt-1">
                {inventoryItem
                  ? "Updates the current stock level for this product."
                  : "Sets the initial stock quantity in inventory."}
              </p>
            </div>

            <div>
              <Label>Default Shelf Life (Days)</Label>
              <Input
                type="number"
                value={formData.default_expiry_days}
                onChange={(e) => setFormData({ ...formData, default_expiry_days: parseInt(e.target.value) || 0 })}
                placeholder="e.g., 365"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="track_expiration"
                checked={formData.track_expiration}
                onChange={(e) => setFormData({ ...formData, track_expiration: e.target.checked })}
                className="w-4 h-4"
              />
              <Label htmlFor="track_expiration" className="cursor-pointer">Track Expiration Dates</Label>
            </div>

            <div>
              <Label>Status</Label>
              <DrawerSelect
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
                options={[
                  { value: "active", label: "Active" },
                  { value: "inactive", label: "Inactive" },
                  { value: "discontinued", label: "Discontinued" },
                ]}
                triggerClassName="w-full h-9 px-3 py-2 border border-slate-300 rounded-md text-sm"
                label="Status"
              />
            </div>
          </div>

          <div>
            <Label>Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              placeholder="Product description..."
            />
          </div>

          <div>
            <Label>Barcodes (Multi-barcode Support)</Label>
            <div className="flex gap-2 mb-2">
              <Input
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                placeholder="Enter barcode"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addBarcode())}
              />
              <Button type="button" onClick={addBarcode} variant="outline">
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.barcodes?.map((barcode, index) => (
                <div key={index} className="bg-slate-100 px-3 py-1 rounded-full flex items-center gap-2">
                  <span className="text-sm">{barcode}</span>
                  <button
                    type="button"
                    onClick={() => removeBarcode(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saveMutation.isPending || uploading}>
              {saveMutation.isPending ? "Saving..." : "Save Product"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
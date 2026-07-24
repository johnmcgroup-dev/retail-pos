import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Package, Edit, Trash2, Upload, AlertTriangle, Sparkles, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import ProductDialog from "../components/products/ProductDialog";
import PullToRefresh from "@/components/shared/PullToRefresh";
import SearchInput from "../components/shared/SearchInput";

export default function Products() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: () => base44.entities.Product.list("-created_date"),
  });

  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: () => base44.entities.Company.list(),
  });

  const { data: inventory = [] } = useQuery({
    queryKey: ["inventory"],
    queryFn: () => base44.entities.Inventory.list(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Product.delete(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries(["products"]);
      const previousProducts = queryClient.getQueryData(["products"]);
      queryClient.setQueryData(["products"], (old = []) => old.filter(p => p.id !== id));
      return { previousProducts };
    },
    onError: (_err, _id, context) => {
      queryClient.setQueryData(["products"], context.previousProducts);
    },
    onSettled: () => {
      queryClient.invalidateQueries(["products"]);
    },
  });

  const generateImageMutation = useMutation({
    mutationFn: async (product) => {
      const prompt = `Professional e-commerce product photograph of ${product.name}${product.description ? `, ${product.description.slice(0, 80)}` : ""}${product.category ? `, ${product.category} category` : ""}, clean white background, studio lighting, high resolution, centered, no text`;
      const { url } = await base44.integrations.Core.GenerateImage({ prompt });
      return base44.entities.Product.update(product.id, { image_url: url });
    },
    onSuccess: () => queryClient.invalidateQueries(["products"]),
  });

  const filteredProducts = products.filter(p => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;
    return (
      p.name?.toLowerCase().includes(term) ||
      p.sku?.toLowerCase().includes(term) ||
      p.category?.toLowerCase().includes(term) ||
      (p.barcodes || []).some(b => b.toLowerCase().includes(term))
    );
  });

  const handleEdit = (product) => {
    setEditingProduct(product);
    setShowDialog(true);
  };

  const handleDelete = (id) => {
    if (confirm("Are you sure you want to delete this product?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
    setEditingProduct(null);
  };

  const handleSwitchToExisting = (existingProduct) => {
    setEditingProduct(existingProduct);
  };

  const getInventoryForProduct = (productId) => inventory.find(inv => inv.product_id === productId);
  const getStockLevel = (productId) => getInventoryForProduct(productId)?.quantity ?? 0;

  return (
    <PullToRefresh onRefresh={async () => { await queryClient.invalidateQueries(["products"]); }} className="p-6 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Products</h1>
          <p className="text-slate-500 mt-1">Manage your product catalog</p>
        </div>
        <div className="flex gap-2">
          <Link to="/Stocking">
            <Button variant="outline" className="gap-2">
              <Package className="w-4 h-4" />
              Stock Products
            </Button>
          </Link>
          <Link to="/BulkImport">
            <Button variant="outline" className="gap-2">
              <Upload className="w-4 h-4" />
              Bulk Import
            </Button>
          </Link>
          <Button onClick={() => setShowDialog(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Add Product
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="relative">
            <SearchInput
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-10"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredProducts.map((product) => (
          <Card key={product.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="aspect-square bg-gradient-to-br from-slate-100 to-slate-200 rounded-lg mb-4 flex items-center justify-center">
                {product.image_url ? (
                  <img src={product.image_url} alt={product.name} className="w-full h-full object-cover rounded-lg" />
                ) : (
                  <button
                    onClick={() => generateImageMutation.mutate(product)}
                    disabled={generateImageMutation.isPending}
                    className="flex flex-col items-center justify-center w-full h-full gap-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    {generateImageMutation.isPending && generateImageMutation.variables?.id === product.id ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5" />
                        <span className="text-xs font-medium">Generate</span>
                      </>
                    )}
                  </button>
                )}
              </div>
              
              <h3 className="font-bold text-slate-900 mb-2">{product.name}</h3>
              
              {product.category && (
                <Badge variant="secondary" className="mb-2">
                  {product.category}
                </Badge>
              )}
              
              <div className="space-y-1 text-sm text-slate-600 mb-3">
                <p>SKU: {product.sku || "N/A"}</p>
                <p className="font-semibold text-lg text-blue-600">
                  ₦{product.selling_price?.toFixed(2)}
                </p>
                {product.cost_price && (
                  <p className="text-xs">Cost: ₦{product.cost_price.toFixed(2)}</p>
                )}
              </div>

              {/* Stock Level Display */}
              <div className="flex items-center justify-between mb-3 p-2 rounded-lg bg-slate-50">
                <span className="text-xs text-slate-500">In Stock</span>
                {(() => {
                  const qty = getStockLevel(product.id);
                  const reorderLevel = product.reorder_level || 0;
                  const isLow = qty <= reorderLevel;
                  return (
                    <Badge className={qty === 0 ? "bg-red-100 text-red-700" : isLow ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700"}>
                      {qty === 0 ? (
                        <span className="flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> No stock</span>
                      ) : (
                        <span className="flex items-center gap-1">{isLow && <AlertTriangle className="w-3 h-3" />}{qty} {product.unit || "pcs"}</span>
                      )}
                    </Badge>
                  );
                })()}
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(product)}
                  className="flex-1"
                >
                  <Edit className="w-4 h-4 mr-1" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(product.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center py-12">
          <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">No products found</p>
        </div>
      )}

      <ProductDialog
        open={showDialog}
        onClose={handleCloseDialog}
        product={editingProduct}
        companies={companies}
        products={products}
        onSwitchToExisting={handleSwitchToExisting}
        inventoryItem={editingProduct ? getInventoryForProduct(editingProduct.id) : null}
      />
    </PullToRefresh>
  );
}
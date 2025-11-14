import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Link2, ExternalLink } from "lucide-react";

export default function ProductMapping({ connections }) {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");

  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: () => base44.entities.Product.list(),
  });

  const { data: externalProducts = [] } = useQuery({
    queryKey: ["externalProducts"],
    queryFn: () => base44.entities.ExternalProduct.list(),
  });

  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: () => base44.entities.Company.list(),
  });

  const createMappingMutation = useMutation({
    mutationFn: (data) => base44.entities.ExternalProduct.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(["externalProducts"]);
    },
  });

  const filteredProducts = products.filter(p =>
    p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.sku?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getMappedConnection = (productId) => {
    const mapping = externalProducts.find(ep => ep.internal_product_id === productId);
    if (!mapping) return null;
    return connections.find(c => c.id === mapping.connection_id);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Product Mapping</CardTitle>
        <p className="text-sm text-slate-500">
          Link POS products with external platform products for synchronization
        </p>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <Input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="space-y-2">
          {filteredProducts.map((product) => {
            const mappedConnection = getMappedConnection(product.id);
            const mapping = externalProducts.find(ep => ep.internal_product_id === product.id);

            return (
              <div
                key={product.id}
                className="p-4 border border-slate-200 rounded-lg hover:border-blue-300 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold text-slate-900">{product.name}</h4>
                    <p className="text-sm text-slate-500">SKU: {product.sku || 'N/A'}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {mappedConnection ? (
                      <div className="flex items-center gap-2">
                        <Badge className="bg-green-100 text-green-700">
                          <Link2 className="w-3 h-3 mr-1" />
                          Linked to {mappedConnection.platform_type}
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            // Could open edit dialog
                          }}
                        >
                          <ExternalLink className="w-3 h-3" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (connections.length > 0 && companies[0]) {
                            createMappingMutation.mutate({
                              company_id: companies[0].id,
                              connection_id: connections[0].id,
                              internal_product_id: product.id,
                              external_product_id: `ext_${product.id}`,
                              sync_enabled: true,
                              sync_status: "synced",
                              last_synced: new Date().toISOString()
                            });
                          }
                        }}
                      >
                        <Link2 className="w-4 h-4 mr-2" />
                        Link Product
                      </Button>
                    )}
                  </div>
                </div>
                {mapping && (
                  <div className="mt-2 text-xs text-slate-500">
                    External ID: {mapping.external_product_id} | 
                    Last synced: {mapping.last_synced ? new Date(mapping.last_synced).toLocaleDateString() : 'Never'}
                  </div>
                )}
              </div>
            );
          })}
          {filteredProducts.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              <p>No products found</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
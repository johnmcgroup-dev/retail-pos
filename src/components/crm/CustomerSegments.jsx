import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Edit, Trash2, Users, Target } from "lucide-react";

const segmentColors = [
  { value: "blue", label: "Blue", class: "bg-blue-100 text-blue-700 border-blue-200" },
  { value: "green", label: "Green", class: "bg-green-100 text-green-700 border-green-200" },
  { value: "purple", label: "Purple", class: "bg-purple-100 text-purple-700 border-purple-200" },
  { value: "orange", label: "Orange", class: "bg-orange-100 text-orange-700 border-orange-200" },
  { value: "pink", label: "Pink", class: "bg-pink-100 text-pink-700 border-pink-200" },
  { value: "yellow", label: "Yellow", class: "bg-yellow-100 text-yellow-700 border-yellow-200" },
];

export default function CustomerSegments({ segments, customers }) {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editingSegment, setEditingSegment] = useState(null);
  const [segmentForm, setSegmentForm] = useState({
    name: "",
    description: "",
    segment_type: "custom",
    color: "blue",
    status: "active"
  });

  const saveSegmentMutation = useMutation({
    mutationFn: async (data) => {
      // Get company_id from first customer
      const company_id = customers[0]?.company_id;
      
      if (editingSegment) {
        return base44.entities.CustomerSegment.update(editingSegment.id, data);
      }
      return base44.entities.CustomerSegment.create({ ...data, company_id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["customerSegments"]);
      setShowDialog(false);
      setEditingSegment(null);
      resetForm();
    },
  });

  const deleteSegmentMutation = useMutation({
    mutationFn: (id) => base44.entities.CustomerSegment.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(["customerSegments"]);
    },
  });

  const resetForm = () => {
    setSegmentForm({
      name: "",
      description: "",
      segment_type: "custom",
      color: "blue",
      status: "active"
    });
  };

  const handleEdit = (segment) => {
    setEditingSegment(segment);
    setSegmentForm(segment);
    setShowDialog(true);
  };

  const handleSave = () => {
    saveSegmentMutation.mutate(segmentForm);
  };

  const handleDelete = (id) => {
    if (confirm("Are you sure you want to delete this segment?")) {
      deleteSegmentMutation.mutate(id);
    }
  };

  const getSegmentColorClass = (color) => {
    return segmentColors.find(c => c.value === color)?.class || "bg-gray-100 text-gray-700";
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Customer Segments</h2>
          <p className="text-slate-500 mt-1">Organize customers into targeted groups</p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setShowDialog(true);
          }}
          className="bg-purple-600 hover:bg-purple-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Segment
        </Button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {segments.map((segment) => (
          <Card key={segment.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${getSegmentColorClass(segment.color)}`} />
                  <Badge variant={segment.status === 'active' ? 'default' : 'secondary'}>
                    {segment.status}
                  </Badge>
                </div>
                <Badge variant="outline">{segment.segment_type}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-bold text-lg text-slate-900">{segment.name}</h3>
                <p className="text-sm text-slate-600 mt-1">{segment.description}</p>
              </div>

              <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
                <Users className="w-5 h-5 text-slate-600" />
                <div>
                  <p className="text-xs text-slate-500">Customer Count</p>
                  <p className="font-bold text-slate-900">{segment.customer_count || 0}</p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(segment)}
                  className="flex-1"
                >
                  <Edit className="w-4 h-4 mr-1" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(segment.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {segments.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Target className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">No customer segments created yet</p>
          </CardContent>
        </Card>
      )}

      {/* Segment Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSegment ? "Edit Segment" : "Create New Segment"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Segment Name *</Label>
              <Input
                value={segmentForm.name}
                onChange={(e) => setSegmentForm({ ...segmentForm, name: e.target.value })}
                placeholder="e.g., High Value Customers"
              />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={segmentForm.description}
                onChange={(e) => setSegmentForm({ ...segmentForm, description: e.target.value })}
                placeholder="Describe this segment..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Segment Type</Label>
                <Select 
                  value={segmentForm.segment_type} 
                  onValueChange={(value) => setSegmentForm({ ...segmentForm, segment_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="behavioral">Behavioral</SelectItem>
                    <SelectItem value="demographic">Demographic</SelectItem>
                    <SelectItem value="value_based">Value Based</SelectItem>
                    <SelectItem value="loyalty_based">Loyalty Based</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Color</Label>
                <Select 
                  value={segmentForm.color} 
                  onValueChange={(value) => setSegmentForm({ ...segmentForm, color: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {segmentColors.map((color) => (
                      <SelectItem key={color.value} value={color.value}>
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${color.class}`} />
                          {color.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Status</Label>
              <Select 
                value={segmentForm.status} 
                onValueChange={(value) => setSegmentForm({ ...segmentForm, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave}
              disabled={saveSegmentMutation.isPending || !segmentForm.name}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {saveSegmentMutation.isPending ? "Saving..." : "Save Segment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
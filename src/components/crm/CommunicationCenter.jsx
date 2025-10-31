import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
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
import { Plus, Mail, Phone, MessageSquare, User, Calendar } from "lucide-react";
import { format } from "date-fns";

const commIcons = {
  email: Mail,
  phone: Phone,
  sms: MessageSquare,
  in_person: User,
  chat: MessageSquare,
  social_media: MessageSquare
};

export default function CommunicationCenter({ communications, customers }) {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [logForm, setLogForm] = useState({
    customer_id: "",
    communication_type: "phone",
    direction: "outbound",
    subject: "",
    notes: "",
    outcome: "successful",
    communication_date: new Date().toISOString().split('T')[0]
  });

  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: () => base44.entities.Company.list(),
  });

  const saveLogMutation = useMutation({
    mutationFn: async (data) => {
      const company_id = companies[0]?.id;
      const customer = customers.find(c => c.id === data.customer_id);
      const user = await base44.auth.me();
      
      return base44.entities.CommunicationLog.create({
        ...data,
        company_id,
        customer_name: customer?.name || "",
        handled_by: user.email,
        communication_date: new Date(data.communication_date).toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["communicationLogs"]);
      setShowDialog(false);
      resetForm();
    },
  });

  const resetForm = () => {
    setLogForm({
      customer_id: "",
      communication_type: "phone",
      direction: "outbound",
      subject: "",
      notes: "",
      outcome: "successful",
      communication_date: new Date().toISOString().split('T')[0]
    });
  };

  const handleSave = () => {
    saveLogMutation.mutate(logForm);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Communication Logs</h2>
          <p className="text-slate-500 mt-1">Track all customer interactions</p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setShowDialog(true);
          }}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Log Communication
        </Button>
      </div>

      <div className="space-y-3">
        {communications.map((comm) => {
          const Icon = commIcons[comm.communication_type] || MessageSquare;
          
          return (
            <Card key={comm.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    comm.direction === 'inbound' ? 'bg-green-100' : 'bg-blue-100'
                  }`}>
                    <Icon className={`w-6 h-6 ${
                      comm.direction === 'inbound' ? 'text-green-600' : 'text-blue-600'
                    }`} />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-semibold text-slate-900">{comm.subject}</h4>
                        <p className="text-sm text-slate-600">{comm.customer_name}</p>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant={comm.direction === 'inbound' ? 'default' : 'secondary'}>
                          {comm.direction}
                        </Badge>
                        <Badge variant="outline">{comm.communication_type}</Badge>
                      </div>
                    </div>
                    
                    <p className="text-sm text-slate-700 mb-3">{comm.notes}</p>
                    
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(comm.communication_date), "MMM d, yyyy h:mm a")}
                      </div>
                      <div>Handled by: {comm.handled_by}</div>
                      <Badge className={
                        comm.outcome === 'successful' ? 'bg-green-100 text-green-700' :
                        comm.outcome === 'follow_up_required' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-700'
                      }>
                        {comm.outcome}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {communications.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <MessageSquare className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">No communication logs yet</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Log Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Log Customer Communication</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Customer *</Label>
              <Select 
                value={logForm.customer_id} 
                onValueChange={(value) => setLogForm({ ...logForm, customer_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Communication Type *</Label>
                <Select 
                  value={logForm.communication_type} 
                  onValueChange={(value) => setLogForm({ ...logForm, communication_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="phone">Phone Call</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                    <SelectItem value="in_person">In Person</SelectItem>
                    <SelectItem value="chat">Chat</SelectItem>
                    <SelectItem value="social_media">Social Media</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Direction *</Label>
                <Select 
                  value={logForm.direction} 
                  onValueChange={(value) => setLogForm({ ...logForm, direction: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inbound">Inbound</SelectItem>
                    <SelectItem value="outbound">Outbound</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Subject *</Label>
              <Input
                value={logForm.subject}
                onChange={(e) => setLogForm({ ...logForm, subject: e.target.value })}
                placeholder="Brief description of the communication"
              />
            </div>

            <div>
              <Label>Notes *</Label>
              <Textarea
                value={logForm.notes}
                onChange={(e) => setLogForm({ ...logForm, notes: e.target.value })}
                placeholder="Detailed notes about the interaction..."
                rows={4}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Outcome</Label>
                <Select 
                  value={logForm.outcome} 
                  onValueChange={(value) => setLogForm({ ...logForm, outcome: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="successful">Successful</SelectItem>
                    <SelectItem value="follow_up_required">Follow-up Required</SelectItem>
                    <SelectItem value="no_response">No Response</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="escalated">Escalated</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Date *</Label>
                <Input
                  type="date"
                  value={logForm.communication_date}
                  onChange={(e) => setLogForm({ ...logForm, communication_date: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave}
              disabled={saveLogMutation.isPending || !logForm.customer_id || !logForm.subject}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {saveLogMutation.isPending ? "Saving..." : "Save Log"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
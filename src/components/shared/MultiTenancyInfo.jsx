import React from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, Users, Database } from "lucide-react";

export default function MultiTenancyInfo() {
  return (
    <div className="p-4 md:p-6 space-y-4">
      <Alert className="bg-blue-50 border-blue-200">
        <Shield className="h-5 w-5 text-blue-600" />
        <AlertDescription className="text-blue-900">
          <strong className="block mb-2">Multi-Tenant Architecture</strong>
          <p className="text-sm">
            This system supports multiple companies/tenants simultaneously. Each company has:
          </p>
          <ul className="text-sm mt-2 space-y-1 ml-4 list-disc">
            <li><strong>Isolated Data:</strong> All records are filtered by company_id - no company can see another's data</li>
            <li><strong>Separate Users:</strong> Each company has its own set of users and admins</li>
            <li><strong>Independent Settings:</strong> Currency, payment gateways, and configurations per company</li>
            <li><strong>Offline Support:</strong> Each device caches only the data for the logged-in company</li>
          </ul>
        </AlertDescription>
      </Alert>

      <Alert className="bg-green-50 border-green-200">
        <Users className="h-5 w-5 text-green-600" />
        <AlertDescription className="text-green-900">
          <strong className="block mb-2">How It Works</strong>
          <p className="text-sm">
            When a user logs in, they are automatically associated with their company. All queries are filtered:
          </p>
          <code className="block bg-green-100 p-2 rounded mt-2 text-xs">
            base44.entities.Product.filter({'{'}company_id: user.company_id{'}'})
          </code>
        </AlertDescription>
      </Alert>

      <Alert className="bg-purple-50 border-purple-200">
        <Database className="h-5 w-5 text-purple-600" />
        <AlertDescription className="text-purple-900">
          <strong className="block mb-2">Data Isolation Guarantee</strong>
          <p className="text-sm">
            Every entity (Products, Sales, Customers, Inventory, etc.) includes a company_id field. 
            The platform ensures complete data separation between tenants at the database level.
          </p>
        </AlertDescription>
      </Alert>
    </div>
  );
}
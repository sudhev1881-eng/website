"use client";

import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/toast";

export function AdminSettings() {
  return (
    <div>
      <PageHeader
        title="Settings"
        description="Platform configuration and admin preferences."
        actions={<Button onClick={() => toast.success("Settings saved")}>Save Changes</Button>}
      />

      <div className="space-y-6">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Platform</CardTitle>
            <CardDescription>General platform settings.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:max-w-md">
            <Input label="Platform Name" defaultValue="StudentLink" />
            <Input label="Support Email" defaultValue="support@studentlink.app" />
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Default Plan</label>
              <Select defaultValue="student">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Student (Free)</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="university">University</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>NFC Cards</CardTitle>
            <CardDescription>Card issuance and management settings.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:max-w-md">
            <Input label="Card Prefix" defaultValue="SL" />
            <Input label="Max Cards per Student" type="number" defaultValue="2" />
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Storage Limits</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:max-w-md">
            <Input label="Resume Max Size (MB)" type="number" defaultValue="10" />
            <Input label="Image Max Size (MB)" type="number" defaultValue="5" />
            <Input label="Total Storage (GB)" type="number" defaultValue="100" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

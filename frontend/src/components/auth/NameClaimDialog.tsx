"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface NameClaimDialogProps {
  open: boolean;
  email: string;
  onSubmit: (firstName: string, lastName: string) => Promise<void>;
  onCancel: () => void;
  submitting?: boolean;
}

export function NameClaimDialog({
  open,
  email,
  onSubmit,
  onCancel,
  submitting,
}: NameClaimDialogProps) {
  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(firstName.trim().toUpperCase(), lastName.trim().toUpperCase());
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Confirm your name</DialogTitle>
          <DialogDescription>
            Signed in as <strong>{email}</strong>. Enter your legal first and last name
            <strong> in capitals</strong> exactly as your university registered you for NFC.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            label="First name"
            placeholder="ALEX"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value.toUpperCase())}
            className="uppercase"
            required
            autoComplete="given-name"
          />
          <Input
            label="Last name"
            placeholder="MORGAN"
            value={lastName}
            onChange={(e) => setLastName(e.target.value.toUpperCase())}
            className="uppercase"
            required
            autoComplete="family-name"
          />
          <p className="text-xs text-muted-foreground">
            Example: <code>ALEX MORGAN</code> — must match the name stored by your admin.
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || !firstName || !lastName}>
              {submitting ? "Matching…" : "Claim my profile"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

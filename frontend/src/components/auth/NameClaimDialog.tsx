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
    <Dialog open={open} onOpenChange={(o) => !o && !submitting && onCancel()}>
      <DialogContent className="max-w-md" onInteractOutside={(e) => submitting && e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Confirm your legal name</DialogTitle>
          <DialogDescription>
            {email ? (
              <>
                Signed in as <strong className="text-foreground">{email}</strong>.
              </>
            ) : (
              <>Signed in with Google.</>
            )}{" "}
            Enter your first and last name in <strong className="text-foreground">CAPS</strong> exactly
            as your school registered you for NFC.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            label="First name"
            placeholder="JAMES"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value.toUpperCase())}
            className="uppercase tracking-wide"
            required
            autoFocus
            autoComplete="given-name"
            disabled={submitting}
          />
          <Input
            label="Last name"
            placeholder="WILSON"
            value={lastName}
            onChange={(e) => setLastName(e.target.value.toUpperCase())}
            className="uppercase tracking-wide"
            required
            autoComplete="family-name"
            disabled={submitting}
          />
          <p className="text-xs text-muted-foreground">
            Name must match what your admin registered (CAPS). If you weren&apos;t
            added yet, contact your admin or email{" "}
            <a
              className="text-primary underline-offset-2 hover:underline"
              href="mailto:support@studentlink.app"
            >
              support@studentlink.app
            </a>
            .
          </p>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={submitting}
              disabled={!firstName || !lastName}
            >
              Claim my profile
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

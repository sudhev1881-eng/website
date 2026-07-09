"use client";

import { Nfc, Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { adminNfcCards } from "@/data/mock-admin";

const statusVariant = {
  active: "success" as const,
  unassigned: "warning" as const,
  deactivated: "outline" as const,
};

export function AdminNfcCards() {
  return (
    <div>
      <PageHeader
        title="NFC Cards"
        description="Manage NFC card inventory and assignments."
        actions={
          <Button>
            <Plus className="h-4 w-4" />
            Issue Cards
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {adminNfcCards.map((card) => (
          <Card key={card.id} hover className="shadow-card">
            <CardContent className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <Nfc className="h-5 w-5 text-primary" />
                <Badge variant={statusVariant[card.status]}>{card.status}</Badge>
              </div>
              <p className="font-mono text-lg font-bold">{card.cardNumber}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {card.student ?? "Unassigned"}
              </p>
              <p className="text-xs text-muted-foreground">{card.university}</p>
              <div className="mt-4 flex items-center justify-between border-t border-border pt-4 text-sm">
                <span className="text-muted-foreground">{card.taps} taps</span>
                <span className="text-muted-foreground">Issued {card.issuedAt}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

"use client";

import * as React from "react";
import { Nfc, Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/toast";
import { api, type AdminNfcCard } from "@/lib/api";

const statusVariant: Record<string, "success" | "warning" | "outline"> = {
  active: "success",
  unassigned: "warning",
  deactivated: "outline",
};

export function AdminNfcCards() {
  const [cards, setCards] = React.useState<AdminNfcCard[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [cardNumber, setCardNumber] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  const loadCards = React.useCallback(() => {
    setLoading(true);
    api.admin
      .nfcCards()
      .then(setCards)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    loadCards();
  }, [loadCards]);

  const handleIssue = async () => {
    if (!cardNumber.trim()) return;
    setSubmitting(true);
    try {
      const card = await api.admin.createNfcCard({ cardNumber: cardNumber.trim() });
      setCards((prev) => [card, ...prev]);
      setCardNumber("");
      setDialogOpen(false);
      toast.success("NFC card issued");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to issue card");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="NFC Cards"
        description="Card inventory on the server. Program cards from the Students module — the browser calls the API, and the API writes via the USB reader on the Ubuntu server."
        actions={
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            Issue Cards
          </Button>
        }
      />

      {cards.length === 0 ? (
        <p className="text-sm text-muted-foreground">No NFC cards issued yet.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => (
            <Card key={card.id} hover className="shadow-card">
              <CardContent className="p-6">
                <div className="mb-4 flex items-center justify-between">
                  <Nfc className="h-5 w-5 text-primary" />
                  <Badge variant={statusVariant[card.status] ?? "outline"}>{card.status}</Badge>
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
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Issue NFC Card</DialogTitle>
            <DialogDescription>
              Add a new card to inventory. Program it to a student from the Students module.
            </DialogDescription>
          </DialogHeader>
          <Input
            placeholder="SL-2025-0001"
            value={cardNumber}
            onChange={(e) => setCardNumber(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleIssue} disabled={submitting || !cardNumber.trim()}>
              {submitting ? "Issuing…" : "Issue Card"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

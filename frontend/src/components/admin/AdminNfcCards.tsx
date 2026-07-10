"use client";

import * as React from "react";
import { Nfc, Plus, Pencil, Trash2 } from "lucide-react";
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
  const [editCard, setEditCard] = React.useState<AdminNfcCard | null>(null);
  const [deleteCard, setDeleteCard] = React.useState<AdminNfcCard | null>(null);
  const [cardNumber, setCardNumber] = React.useState("");
  const [cardStatus, setCardStatus] = React.useState("unassigned");
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

  React.useEffect(() => {
    if (editCard) {
      setCardNumber(editCard.cardNumber);
      setCardStatus(editCard.status);
    }
  }, [editCard]);

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

  const handleEdit = async () => {
    if (!editCard) return;
    setSubmitting(true);
    try {
      const updated = await api.admin.updateNfcCard(editCard.id, { status: cardStatus });
      setCards((prev) => prev.map((c) => (c.id === editCard.id ? updated : c)));
      setEditCard(null);
      toast.success("Card updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update card");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteCard) return;
    setSubmitting(true);
    try {
      await api.admin.deleteNfcCard(deleteCard.id);
      setCards((prev) => prev.filter((c) => c.id !== deleteCard.id));
      setDeleteCard(null);
      toast.success("Card removed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete card");
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
        description="Card inventory and profile URL assignments. Program physical tags externally with the URL from the Students tab."
        actions={
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            Issue Card
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
                  <div className="flex items-center gap-1">
                    <Badge variant={statusVariant[card.status] ?? "outline"}>{card.status}</Badge>
                    <Button variant="ghost" size="sm" onClick={() => setEditCard(card)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeleteCard(card)}><Trash2 className="h-4 w-4 text-error" /></Button>
                  </div>
                </div>
                <p className="font-mono text-lg font-bold">{card.cardNumber}</p>
                <p className="mt-2 text-sm text-muted-foreground">{card.student ?? "Unassigned"}</p>
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
            <DialogDescription>Add a card to inventory, then assign a profile URL from Students.</DialogDescription>
          </DialogHeader>
          <Input placeholder="SL-2025-0001" value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleIssue} disabled={submitting || !cardNumber.trim()}>Issue</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editCard)} onOpenChange={(open) => !open && setEditCard(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Edit Card {editCard?.cardNumber}</DialogTitle></DialogHeader>
          <select
            className="flex h-11 w-full rounded-xl border border-border bg-background px-4 text-sm"
            value={cardStatus}
            onChange={(e) => setCardStatus(e.target.value)}
          >
            <option value="active">active</option>
            <option value="unassigned">unassigned</option>
            <option value="deactivated">deactivated</option>
          </select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditCard(null)}>Cancel</Button>
            <Button onClick={handleEdit} disabled={submitting}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleteCard)} onOpenChange={(open) => !open && setDeleteCard(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete card {deleteCard?.cardNumber}?</DialogTitle>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteCard(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={submitting}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

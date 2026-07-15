// Formulário para convidar novo membro. E-mail + escolha de papel.

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResponsiveDialog } from "@/components/frisby/responsive-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateInvitation, useRoles } from "@/hooks/api";
import { apiErrorMessage } from "@/lib/api/error-messages";
import type { Role } from "@/lib/api/types";

interface InvitationFormProps {
  entityId: string | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InvitationForm({ entityId, open, onOpenChange }: InvitationFormProps) {
  const [email, setEmail] = useState("");
  const [roleId, setRoleId] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  const rolesQ = useRoles(entityId);
  const createInvitation = useCreateInvitation(entityId);

  const pending = createInvitation.isPending;

  useEffect(() => {
    if (open) {
      setEmail("");
      setRoleId(undefined);
      setError(null);
    }
  }, [open]);

  const roles = (rolesQ.data ?? []).sort((a, b) => {
    const order = { OWNER: 0, ADMIN: 1, PROVIDER: 2, FINANCE: 2, MEMBER: 3, VIEWER: 4 };
    return (order[a.type as keyof typeof order] ?? 5) - (order[b.type as keyof typeof order] ?? 5);
  });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) {
      setError("Informe um e-mail.");
      return;
    }
    if (!roleId) {
      setError("Escolha um papel.");
      return;
    }
    setError(null);

    try {
      await createInvitation.mutateAsync({ email, roleId });
      toast.success(`Convite enviado para ${email}`);
      onOpenChange(false);
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(v) => !pending && onOpenChange(v)}
      title="Convidar membro"
      description="Enviar um convite para participar desta entidade"
    >
      <form onSubmit={onSubmit} className="space-y-4 pb-1">
        <div className="space-y-1.5">
          <Label htmlFor="inv-email">E-mail</Label>
          <Input
            id="inv-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="pessoa@exemplo.com"
            autoFocus
          />
        </div>

        <div className="space-y-1.5">
          <Label>Papel</Label>
          <Select value={roleId ?? ""} onValueChange={setRoleId}>
            <SelectTrigger>
              <SelectValue placeholder="Escolha um papel" />
            </SelectTrigger>
            <SelectContent>
              {roles.map((role) => (
                <SelectItem key={role.id} value={role.id}>
                  {role.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-lg border border-expense/40 bg-expense/5 px-3 py-2 text-xs text-expense"
          >
            {error}
          </div>
        )}

        <Button type="submit" className="w-full" disabled={pending}>
          {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Enviar convite
        </Button>
      </form>
    </ResponsiveDialog>
  );
}

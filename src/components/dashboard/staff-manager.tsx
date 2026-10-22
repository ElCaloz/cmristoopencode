"use client";

import { CalendarPlus, Pencil, UserPlus, UsersRound } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { formatCents, formatDate, formatTime, todayISODate } from "@/lib/utils";
import {
  addShiftAction,
  cancelShiftAction,
  inviteStaffAction,
  updateStaffAction,
} from "@/server/staff/actions";
import {
  initialStaffActionState,
  type StaffActionState,
  type StaffData,
  type StaffMemberRow,
} from "@/server/staff/types";

type Props = {
  data: StaffData;
  canManageMembers: boolean;
  canManageStaff: boolean;
};

const statusLabels: Record<string, string> = {
  invited: "Invitato",
  active: "Attivo",
  suspended: "Sospeso",
};

export function StaffManager({ data, canManageMembers, canManageStaff }: Props) {
  const [selected, setSelected] = useState<StaffMemberRow | null>(null);
  const [formVersion, setFormVersion] = useState(0);

  const [inviteState, inviteAction, invitePending] = useActionState(
    async (prevState: StaffActionState, formData: FormData) => {
      const result = await inviteStaffAction(prevState, formData);
      if (result.status === "success") {
        setFormVersion((value) => value + 1);
      }
      return result;
    },
    initialStaffActionState,
  );
  const [updateState, updateAction, updatePending] = useActionState(
    async (prevState: StaffActionState, formData: FormData) => {
      const result = await updateStaffAction(prevState, formData);
      if (result.status === "success") {
        setSelected(null);
      }
      return result;
    },
    initialStaffActionState,
  );
  const [shiftState, shiftAction, shiftPending] = useActionState(
    async (prevState: StaffActionState, formData: FormData) => {
      const result = await addShiftAction(prevState, formData);
      if (result.status === "success") {
        setFormVersion((value) => value + 1);
      }
      return result;
    },
    initialStaffActionState,
  );

  useEffect(() => {
    if (inviteState.status === "success") {
      toast.success(inviteState.message ?? "Invito inviato.");
    } else if (inviteState.status === "error" && inviteState.message) {
      toast.error(inviteState.message);
    }
  }, [inviteState]);

  useEffect(() => {
    if (updateState.status === "success") {
      toast.success(updateState.message ?? "Membro aggiornato.");
    } else if (updateState.status === "error" && updateState.message) {
      toast.error(updateState.message);
    }
  }, [updateState]);

  useEffect(() => {
    if (shiftState.status === "success") {
      toast.success(shiftState.message ?? "Turno aggiunto.");
    } else if (shiftState.status === "error" && shiftState.message) {
      toast.error(shiftState.message);
    }
  }, [shiftState]);

  return (
    <div className="space-y-5">
      {canManageMembers ? (
        <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center gap-2">
            <UserPlus className="size-4" />
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Invita un membro
            </h2>
          </div>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            L&apos;invito crea l&apos;utente e la membership; il nuovo membro
            riceve un&apos;email per impostare la password. Non puoi assegnare
            ruoli pari o superiori al tuo.
          </p>
          <form
            key={formVersion}
            action={inviteAction}
            className="mt-4 grid gap-3 sm:grid-cols-4"
          >
            <Field
              label="Email"
              htmlFor="staff-email"
              error={inviteState.fieldErrors?.email}
              className="sm:col-span-2"
            >
              <Input
                id="staff-email"
                name="email"
                type="email"
                placeholder="nome@ristorante.it"
                required
              />
            </Field>
            <Field label="Ruolo" htmlFor="staff-role">
              <Select id="staff-role" name="roleId" required>
                {data.roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Accesso" htmlFor="staff-scope">
              <Select id="staff-scope" name="scope" defaultValue="restaurant">
                <option value="restaurant">Solo questa sede</option>
                <option value="organization">Tutte le sedi</option>
              </Select>
            </Field>
            <div className="sm:col-span-4">
              <Button type="submit" disabled={invitePending}>
                <UserPlus />
                Invita
              </Button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center gap-2">
          <UsersRound className="size-4" />
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Staff della sede
          </h2>
          <Badge variant="secondary">{data.staff.length} membri</Badge>
        </div>

        {data.staff.length === 0 ? (
          <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
            Nessun membro collegato a questa sede.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-zinc-100 dark:divide-zinc-800">
            {data.staff.map((member) => (
              <li
                key={member.membershipId}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {member.fullName}
                    </p>
                    <Badge variant="muted">{member.roleName}</Badge>
                    <Badge
                      variant={
                        member.status === "active"
                          ? "success"
                          : member.status === "suspended"
                            ? "danger"
                            : "warning"
                      }
                    >
                      {statusLabels[member.status] ?? member.status}
                    </Badge>
                    {member.restaurantId ? (
                      <Badge variant="outline">Solo sede</Badge>
                    ) : (
                      <Badge variant="outline">Organizzazione</Badge>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    {member.email || "Email non disponibile"}
                    {member.phone ? ` · ${member.phone}` : ""}
                    {member.hiredAt ? ` · assunto il ${formatDate(member.hiredAt)}` : ""}
                    {member.hourlyRateCents !== null
                      ? ` · ${formatCents(member.hourlyRateCents)}/h`
                      : ""}
                  </p>
                </div>
                {canManageMembers ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelected(member);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  >
                    <Pencil />
                    Modifica
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      {canManageMembers && selected ? (
        <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Modifica {selected.fullName}
          </h2>
          <form
            action={updateAction}
            className="mt-4 grid gap-3 sm:grid-cols-3"
            key={selected.membershipId}
          >
            <input type="hidden" name="membershipId" value={selected.membershipId} />
            <Field label="Ruolo" htmlFor="update-role">
              <Select id="update-role" name="roleId" defaultValue={selected.roleId}>
                {data.roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Stato" htmlFor="update-status">
              <Select id="update-status" name="status" defaultValue={selected.status}>
                <option value="invited">Invitato</option>
                <option value="active">Attivo</option>
                <option value="suspended">Sospeso</option>
              </Select>
            </Field>
            <Field
              label="Telefono"
              htmlFor="update-phone"
              error={updateState.fieldErrors?.phone}
            >
              <Input
                id="update-phone"
                name="phone"
                defaultValue={selected.phone}
                maxLength={40}
              />
            </Field>
            <Field label="Data assunzione" htmlFor="update-hired-at">
              <Input
                id="update-hired-at"
                name="hiredAt"
                type="date"
                defaultValue={selected.hiredAt ?? ""}
              />
            </Field>
            <Field
              label="Costo orario (€)"
              htmlFor="update-hourly-rate"
              error={updateState.fieldErrors?.hourlyRate}
            >
              <Input
                id="update-hourly-rate"
                name="hourlyRate"
                placeholder="es. 12,50"
                defaultValue={
                  selected.hourlyRateCents === null
                    ? ""
                    : (selected.hourlyRateCents / 100)
                        .toFixed(2)
                        .replace(".", ",")
                }
              />
            </Field>
            <Field label="Note interne" htmlFor="update-notes">
              <Input
                id="update-notes"
                name="notes"
                defaultValue={selected.notes}
                maxLength={1000}
              />
            </Field>
            <div className="flex flex-wrap gap-2 sm:col-span-3">
              <Button type="submit" disabled={updatePending}>
                Salva
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setSelected(null)}
              >
                Chiudi
              </Button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center gap-2">
          <CalendarPlus className="size-4" />
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Turni
          </h2>
        </div>

        {canManageStaff ? (
          <form action={shiftAction} className="mt-4 grid gap-3 sm:grid-cols-5">
            <Field
              label="Membro"
              htmlFor="shift-member"
              error={shiftState.fieldErrors?.membershipId}
            >
              <Select id="shift-member" name="membershipId" required>
                {data.staff.map((member) => (
                  <option key={member.membershipId} value={member.membershipId}>
                    {member.fullName}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="Data"
              htmlFor="shift-date"
              error={shiftState.fieldErrors?.date}
            >
              <Input
                id="shift-date"
                name="date"
                type="date"
                defaultValue={todayISODate()}
                required
              />
            </Field>
            <Field
              label="Inizio"
              htmlFor="shift-start"
              error={shiftState.fieldErrors?.startsAt}
            >
              <Input id="shift-start" name="startsAt" type="time" required />
            </Field>
            <Field
              label="Fine"
              htmlFor="shift-end"
              error={shiftState.fieldErrors?.endsAt}
            >
              <Input id="shift-end" name="endsAt" type="time" required />
            </Field>
            <Field
              label="Nota"
              htmlFor="shift-note"
              error={shiftState.fieldErrors?.roleNote}
            >
              <Input id="shift-note" name="roleNote" maxLength={120} />
            </Field>
            <div className="sm:col-span-5">
              <Button type="submit" variant="outline" disabled={shiftPending}>
                Aggiungi turno
              </Button>
            </div>
          </form>
        ) : null}

        {data.shifts.length === 0 ? (
          <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
            Nessun turno pianificato negli ultimi giorni.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-zinc-100 dark:divide-zinc-800">
            {data.shifts.map((shift) => (
              <li
                key={shift.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <div>
                  <p className="text-sm text-zinc-900 dark:text-zinc-100">
                    {shift.staffName}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {formatDate(shift.startsAt)} · {formatTime(shift.startsAt)}–
                    {formatTime(shift.endsAt)}
                    {shift.roleNote ? ` · ${shift.roleNote}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      shift.status === "cancelled"
                        ? "danger"
                        : shift.status === "confirmed"
                          ? "success"
                          : "secondary"
                    }
                  >
                    {shift.status === "cancelled"
                      ? "Annullato"
                      : shift.status === "confirmed"
                        ? "Confermato"
                        : "Pianificato"}
                  </Badge>
                  {canManageStaff && shift.status !== "cancelled" ? (
                    <form action={cancelShiftAction}>
                      <input type="hidden" name="shiftId" value={shift.id} />
                      <Button type="submit" size="sm" variant="outline">
                        Annulla
                      </Button>
                    </form>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

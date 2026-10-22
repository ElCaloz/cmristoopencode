export type StaffActionState = {
  status?: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Record<string, string | undefined>;
};

export const initialStaffActionState: StaffActionState = { status: "idle" };

export type StaffMemberRow = {
  membershipId: string;
  userId: string;
  fullName: string;
  email: string;
  phone: string;
  roleId: string;
  roleKey: string;
  roleName: string;
  restaurantId: string | null;
  restaurantName: string | null;
  status: "invited" | "active" | "suspended";
  hiredAt: string | null;
  hourlyRateCents: number | null;
  notes: string;
  createdAt: string;
};

export type RoleOption = {
  id: string;
  key: string;
  name: string;
};

export type ShiftRow = {
  id: string;
  membershipId: string;
  staffName: string;
  startsAt: string;
  endsAt: string;
  roleNote: string;
  status: "scheduled" | "confirmed" | "cancelled";
};

export type StaffData = {
  staff: StaffMemberRow[];
  roles: RoleOption[];
  shifts: ShiftRow[];
};

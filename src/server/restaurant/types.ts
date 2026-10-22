export type LocationActionState = {
  status?: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Record<string, string | undefined>;
};

export const initialLocationActionState: LocationActionState = { status: "idle" };

export type LocationRow = {
  id: string;
  name: string;
  slug: string;
  status: "active" | "paused" | "closed";
  description: string;
  cuisine: string;
  address: string | null;
  phone: string | null;
  createdAt: string;
};

export type OrganizationRestaurantsData = {
  organizationId: string;
  organizationName: string;
  planName: string | null;
  locationsLimit: number | null;
  locations: LocationRow[];
};

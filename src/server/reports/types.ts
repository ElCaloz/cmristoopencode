export type ReportData = {
  period: { from: string; to: string };
  kpis: {
    revenueCents: number;
    orders: number;
    averageTicketCents: number;
    tipsCents: number;
    onlineOrders: number;
    onlineRevenueCents: number;
    newCustomers: number;
    loyaltyPoints: number;
    activeStaff: number;
    shifts: number;
  };
  daily: Array<{ day: string; label: string; revenueCents: number; orders: number }>;
  paymentMethods: Array<{ method: string; label: string; amountCents: number }>;
  topItems: Array<{ name: string; quantity: number; revenueCents: number }>;
  locations: Array<{ id: string; name: string; revenueCents: number; orders: number }>;
};

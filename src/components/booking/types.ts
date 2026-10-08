import type { MediaView } from "@/domain/media/image";

/** The slice of a shop the booking flow needs in the browser (never the whole row). */
export type FlowBusiness = {
  id: string;
  name: string;
  short: string;
  mark: string | null;
  logo: MediaView | null;
  category: "barber" | "beauty" | "other";
  timezone: string;
  currency: string;
  locale: string;
  maxAdvanceDays: number;
};

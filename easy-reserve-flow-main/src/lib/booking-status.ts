export type BookingStatus = "pending" | "accepted" | "in_progress" | "completed" | "cancelled";

export const STATUS_LABEL: Record<BookingStatus, string> = {
  pending: "Pending",
  accepted: "Accepted",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const STATUS_STYLE: Record<BookingStatus, string> = {
  pending: "bg-warning text-warning-foreground hover:bg-warning",
  accepted: "bg-primary text-primary-foreground hover:bg-primary",
  in_progress: "bg-[image:var(--gradient-primary)] text-primary-foreground",
  completed: "bg-success text-success-foreground hover:bg-success",
  cancelled: "bg-destructive text-destructive-foreground hover:bg-destructive",
};

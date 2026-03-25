import { createClient } from "@/lib/supabase";
import { deductStockForWork, deductHardwareStockForWork } from "@/lib/work-helpers";

/**
 * Transition a work's status with business rules.
 * Returns true if successful, false if blocked.
 */
export async function transitionWorkStatus(
  workId: string,
  oldStatus: string,
  newStatus: string
): Promise<boolean> {
  const supabase = createClient();

  // Rule: cannot go back from in_progress to ideation
  if (oldStatus === "in_progress" && newStatus === "ideation") return false;
  if (oldStatus === "completed" && (newStatus === "ideation" || newStatus === "in_progress")) return false;
  if (oldStatus === "sold") return false;

  // Deduct stock when transitioning to in_progress
  if (oldStatus === "ideation" && newStatus === "in_progress") {
    await deductStockForWork(workId);
    await deductHardwareStockForWork(workId);
  }

  await supabase.from("works").update({ status: newStatus }).eq("id", workId);

  // Check if order should auto-complete
  const { data: work } = await supabase
    .from("works")
    .select("order_id")
    .eq("id", workId)
    .single();
  if (work?.order_id && newStatus === "completed") {
    await checkOrderAutoComplete(work.order_id);
  }

  return true;
}

/**
 * Check if all works in an order are completed.
 * If so, auto-transition order to "pending" (待出貨).
 */
export async function checkOrderAutoComplete(orderId: string) {
  const supabase = createClient();
  const { data: works } = await supabase
    .from("works")
    .select("status")
    .eq("order_id", orderId);

  if (works && works.length > 0 && works.every((w) => w.status === "completed" || w.status === "sold")) {
    await supabase
      .from("orders")
      .update({ status: "pending" })
      .eq("id", orderId)
      .in("status", ["preparing"]);
  }
}

/**
 * When order transitions to "delivered", mark all works as "sold".
 */
export async function handleOrderDelivered(orderId: string) {
  const supabase = createClient();
  await supabase
    .from("works")
    .update({ status: "sold" })
    .eq("order_id", orderId);
}

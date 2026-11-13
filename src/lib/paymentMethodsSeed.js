/** Serialize Mongo payment_method docs for JSON APIs (no auto-seed — admin adds gateways manually). */

export function serializePaymentMethods(methods) {
  return (methods || []).map((m) => ({
    ...m,
    _id: m._id?.toString?.() || m._id,
  }));
}

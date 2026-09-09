export function serializeSession(session, { created = false, resumed = false } = {}) {
  return {
    id: session.id,
    restaurantId: session.restaurantId,
    anonymousSessionId: session.anonymousSessionId,
    tableId: session.tableId ?? session.table?.id ?? null,
    tableNumber: session.table?.tableNumber ?? null,
    tableLabel:
      session.table?.tableNumber != null
        ? `Table ${String(session.table.tableNumber).padStart(2, '0')}`
        : null,
    startedAt: session.startedAt,
    endedAt: session.endedAt,
    created,
    resumed,
  };
}

/** Admin-configured lobby freeplay amount ($ SC). */
export async function getFreeplayAmountSC(db) {
  const settingsDoc = await db.collection('system_settings').findOne({ key: 'general' });
  if (settingsDoc?.freeplayAmountSC !== undefined && settingsDoc?.freeplayAmountSC !== null) {
    const n = Number(settingsDoc.freeplayAmountSC);
    if (Number.isFinite(n) && n >= 0) return n;
  }
  return 5;
}

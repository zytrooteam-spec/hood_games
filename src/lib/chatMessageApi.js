/** Keep chat list payloads small — images load via /api/chat/attachment. */

export function serializeChatMessageForApi(msg) {
  if (!msg) return msg;
  const id = String(msg._id?.toString?.() || msg._id || msg.id || '');
  const rawImage = msg.imageUrl;
  const hasImage = Boolean(rawImage && String(rawImage).length > 0);
  let imageUrl = null;
  if (hasImage) {
    const s = String(rawImage);
    imageUrl = s.startsWith('data:') || s.length > 2048 ? `/api/chat/attachment?id=${encodeURIComponent(id)}` : s;
  }

  return {
    ...msg,
    id: id || msg.id,
    _id: id || msg._id,
    imageUrl,
    hasImage,
  };
}

export function serializeChatMessagesForApi(messages) {
  if (!Array.isArray(messages)) return [];
  return messages.map(serializeChatMessageForApi);
}

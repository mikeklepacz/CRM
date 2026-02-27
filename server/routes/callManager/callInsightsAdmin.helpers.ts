export function toCamelCase(obj: any) {
  if (!obj) return obj;
  return {
    conversationId: obj.conversationId || obj.conversation_id,
    duration: obj.duration,
    storeName: obj.storeName || obj.store_name,
    city: obj.city,
    state: obj.state,
    phoneNumber: obj.phoneNumber || obj.phone_number,
  };
}

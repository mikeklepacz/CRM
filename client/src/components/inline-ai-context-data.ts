export function buildInlineAiContextData(storeContext: any) {
  if (!storeContext) return undefined;

  return {
    sales_ready_summary: storeContext.sales_ready_summary,
    notes: storeContext.notes,
    point_of_contact: storeContext.point_of_contact,
    poc_email: storeContext.poc_email,
    poc_phone: storeContext.poc_phone,
    status: storeContext.status,
    follow_up_date: storeContext.follow_up_date,
    next_action: storeContext.next_action,
    dba: storeContext.dba,
    storeName: storeContext.name,
    type: storeContext.type,
    link: storeContext.link,
    address: storeContext.address,
    city: storeContext.city,
    state: storeContext.state,
    phone: storeContext.phone,
    email: storeContext.email,
    website: storeContext.website,
  };
}

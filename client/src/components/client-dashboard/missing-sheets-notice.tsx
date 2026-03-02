export function MissingSheetsNotice() {
  return (
    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-4 rounded-md">
      <p className="text-sm text-yellow-800 dark:text-yellow-200">
        No sheets found. Please connect your sheets in Admin Dashboard → Google Sheets tab with
        purposes "clients" (Store Database) and "commissions" (Commission Tracker).
      </p>
    </div>
  );
}

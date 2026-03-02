type ClientDashboardInlineStatusProps = {
  loading?: boolean;
  message: string;
};

export function ClientDashboardInlineStatus({
  loading = false,
  message,
}: ClientDashboardInlineStatusProps) {
  return (
    <div className="text-center py-8 text-muted-foreground">
      {loading && (
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
      )}
      <p className={loading ? "mt-2" : undefined}>{message}</p>
    </div>
  );
}

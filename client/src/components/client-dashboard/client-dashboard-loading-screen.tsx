type ClientDashboardLoadingScreenProps = {
  bodyBackground?: string;
};

export function ClientDashboardLoadingScreen({
  bodyBackground,
}: ClientDashboardLoadingScreenProps) {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={bodyBackground ? { backgroundColor: bodyBackground } : {}}
    >
      <div className="flex flex-col items-center justify-center">
        <div
          className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary mb-4"
          data-testid="spinner-loading"
        />
        <p className="text-muted-foreground">Loading your data...</p>
      </div>
    </div>
  );
}

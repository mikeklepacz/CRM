import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Props = {
  showProjectOverlay: boolean;
  tempProjectEmail: string;
  tempProjectName: string;
  onProjectSubmit: () => void;
  setTempProjectEmail: (value: string) => void;
  setTempProjectName: (value: string) => void;
};

export function ProductMockupProjectDialog({
  showProjectOverlay,
  tempProjectEmail,
  tempProjectName,
  onProjectSubmit,
  setTempProjectEmail,
  setTempProjectName,
}: Props) {
  return (
    <Dialog open={showProjectOverlay} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Start Your Label Project</DialogTitle>
          <DialogDescription>
            Enter your project name and email to begin designing. This info will be saved with your project.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="project-name">Project Name</Label>
            <Input
              id="project-name"
              placeholder="e.g., Hemp Wick 200ft Roll"
              value={tempProjectName}
              onChange={(e) => setTempProjectName(e.target.value)}
              data-testid="input-project-name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="project-email">Email</Label>
            <Input
              id="project-email"
              type="email"
              placeholder="your@email.com"
              value={tempProjectEmail}
              onChange={(e) => setTempProjectEmail(e.target.value)}
              data-testid="input-project-email"
            />
          </div>
        </div>
        <Button
          className="w-full"
          onClick={onProjectSubmit}
          disabled={!tempProjectName.trim() || !tempProjectEmail.trim()}
          data-testid="button-start-project"
        >
          Start Designing
        </Button>
      </DialogContent>
    </Dialog>
  );
}

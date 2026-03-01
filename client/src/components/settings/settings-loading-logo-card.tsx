import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Props = {
  loadingLogoPreview: string | null;
  logoUrl?: string;
  onChangeFile: (event: React.ChangeEvent<HTMLInputElement>) => void;
  pending: boolean;
};

export function SettingsLoadingLogoCard({ loadingLogoPreview, logoUrl, onChangeFile, pending }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Loading Logo</CardTitle>
        <CardDescription>Customize the logo that appears on loading screens</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-4">
          {loadingLogoPreview || logoUrl ? (
            <div className="flex justify-center p-4 border rounded-md bg-muted/20">
              <img src={loadingLogoPreview || logoUrl} alt="Loading logo preview" className="max-w-xs max-h-48 object-contain" data-testid="img-loading-logo-preview" />
            </div>
          ) : null}

          <div>
            <Label htmlFor="logo-upload" className="block mb-2">Upload Logo Image</Label>
            <Input id="logo-upload" type="file" accept="image/*" onChange={onChangeFile} disabled={pending} data-testid="input-upload-logo" className="cursor-pointer" />
            <p className="text-sm text-muted-foreground mt-2">PNG, JPG, or GIF. Maximum size: 5MB</p>
          </div>

          {pending ? <p className="text-sm text-muted-foreground">Uploading...</p> : null}
        </div>
      </CardContent>
    </Card>
  );
}

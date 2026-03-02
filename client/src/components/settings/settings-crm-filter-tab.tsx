import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

type Props = {
  categories?: Array<{ id: string; name: string }>;
  selectedCategory: string;
  setSelectedCategory: (value: string) => void;
  onSave: () => void;
  savePending: boolean;
};

export function SettingsCrmFilterTab({ categories, onSave, savePending, selectedCategory, setSelectedCategory }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>CRM Category Filter</CardTitle>
        <CardDescription>
          Select which category of stores to view in your CRM dashboard. You can only view one category at a time.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Active Category</Label>
          <p className="text-sm text-muted-foreground mb-3">
            Your CRM will only show stores from the selected category. This keeps different sales teams (e.g., Pets, Cannabis) completely separate.
          </p>
          <RadioGroup value={selectedCategory} onValueChange={setSelectedCategory}>
            {categories?.map((category) => (
              <div key={category.id} className="flex items-center space-x-2">
                <RadioGroupItem value={category.name} id={category.id} data-testid={`radio-category-${category.name.toLowerCase()}`} />
                <Label htmlFor={category.id} className="font-normal cursor-pointer">{category.name}</Label>
              </div>
            ))}
          </RadioGroup>
          {!categories || categories.length === 0 ? (
            <p className="text-sm text-muted-foreground">No categories available. Ask your admin to create categories.</p>
          ) : null}
        </div>

        <Button onClick={onSave} disabled={savePending || !selectedCategory} data-testid="button-save-category-filter">
          {savePending ? 'Saving...' : 'Save Category Filter'}
        </Button>
      </CardContent>
    </Card>
  );
}

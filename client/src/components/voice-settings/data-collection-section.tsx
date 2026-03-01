import { AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Database } from "lucide-react";
import {
  businessIntelligenceFields,
  interestOutcomeFields,
  pointOfContactFields,
  shippingInfoFields,
} from "./placeholder-fields-data";
import { PlaceholderFieldItem } from "./placeholder-field-item";

export function DataCollectionSection({ toast }: { toast: any }) {
  return (
    <AccordionItem value="data-collection" className="border rounded-lg">
      <AccordionTrigger
        className="px-6 hover:no-underline"
        data-testid="accordion-data-collection"
      >
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          <span className="font-semibold">Data Collection Placeholders</span>
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-6 pb-6">
        <div className="space-y-6">
          <p className="text-sm text-muted-foreground">
            Configure these placeholders in your ElevenLabs Agent Dashboard →
            Analysis → Data Collection to extract structured data from calls
          </p>

          <Alert>
            <AlertDescription className="text-sm">
              Copy each placeholder field below and paste it into your ElevenLabs
              agent&apos;s Data Collection settings. The system will automatically
              extract and save this data from call conversations.
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Interest & Outcome (4 fields)</h4>
            <div className="space-y-2">
              {interestOutcomeFields.map((field) => (
                <PlaceholderFieldItem key={field.name} {...field} toast={toast} />
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Point of Contact (4 fields)</h4>
            <div className="space-y-2">
              {pointOfContactFields.map((field) => (
                <PlaceholderFieldItem key={field.name} {...field} toast={toast} />
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Shipping Information (4 fields)</h4>
            <div className="space-y-2">
              {shippingInfoFields.map((field) => (
                <PlaceholderFieldItem key={field.name} {...field} toast={toast} />
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-semibold">
              Business Intelligence (7 fields)
            </h4>
            <div className="space-y-2">
              {businessIntelligenceFields.map((field) => (
                <PlaceholderFieldItem key={field.name} {...field} toast={toast} />
              ))}
            </div>
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

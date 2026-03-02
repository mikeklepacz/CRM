import { User, Mail, Phone } from "lucide-react";

import { VoipCallButton } from "@/components/voip-call-button";

interface QuickReminderContactInfoProps {
  pointOfContact?: string | null;
  displayEmail?: string | null;
  displayPhone?: string | null;
  pocEmail?: string | null;
  pocPhone?: string | null;
  defaultEmail?: string | null;
  defaultPhone?: string | null;
}

export function QuickReminderContactInfo({
  pointOfContact,
  displayEmail,
  displayPhone,
  pocEmail,
  pocPhone,
  defaultEmail,
  defaultPhone,
}: QuickReminderContactInfoProps) {
  const hasContactInfo = pointOfContact || displayEmail || displayPhone;
  if (!hasContactInfo) return null;

  return (
    <div className="p-3 rounded-md bg-muted/50 space-y-2" data-testid="contact-info-display">
      <div className="font-medium text-sm text-foreground">Contact Information</div>
      <div className="space-y-1.5 text-sm">
        {pointOfContact && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <User className="h-3.5 w-3.5 shrink-0" />
            <span>{pointOfContact}</span>
          </div>
        )}
        {displayEmail && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Mail className="h-3.5 w-3.5 shrink-0" />
            <a href={`mailto:${displayEmail}`} className="hover:text-foreground hover:underline" data-testid="link-contact-email">
              {displayEmail}
            </a>
            {!pocEmail && defaultEmail && <span className="text-xs opacity-70">(default)</span>}
          </div>
        )}
        {displayPhone && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Phone className="h-3.5 w-3.5 shrink-0" />
            <VoipCallButton phoneNumber={displayPhone} className="hover:text-foreground hover:underline cursor-pointer" data-testid="link-contact-phone">
              {displayPhone}
            </VoipCallButton>
            {!pocPhone && defaultPhone && <span className="text-xs opacity-70">(default)</span>}
          </div>
        )}
      </div>
    </div>
  );
}

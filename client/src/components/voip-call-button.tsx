import { type ReactNode } from "react";
import { useTwilioVoip } from "@/hooks/useTwilioVoip";

interface VoipCallButtonProps {
  phoneNumber: string;
  storeName?: string;
  storeLink?: string;
  className?: string;
  children?: ReactNode;
  "data-testid"?: string;
  style?: React.CSSProperties;
  onClick?: (e: React.MouseEvent) => void;
  skipCall?: boolean;
}

export function VoipCallButton({ phoneNumber, storeName, storeLink, className, children, style, onClick, skipCall, ...props }: VoipCallButtonProps) {
  const { makeCall } = useTwilioVoip();

  if (!phoneNumber) {
    return <span className={className} style={style}>{children}</span>;
  }

  return (
    <button
      type="button"
      className={className}
      style={style}
      data-testid={props["data-testid"]}
      onClick={(e) => {
        onClick?.(e);
        if (!e.defaultPrevented && !skipCall) {
          makeCall(phoneNumber, { storeName, storeLink });
        }
      }}
    >
      {children}
    </button>
  );
}

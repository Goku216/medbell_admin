"use client";

import { QRCodeSVG } from "qrcode.react";
import { Ban, Check, Share2, Ticket } from "lucide-react";
import { toast } from "sonner";

import { useMyReferralCodes } from "@/hooks/use-partner-portal";
import { formatDate, formatNumber } from "@/lib/format";
import type { MyReferralCode } from "@/lib/partner/types";

import { PortalEmpty, PortalError, PortalLoading } from "@/components/partner/partner-states";
import { CopyButton } from "@/components/common/copy-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/**
 * The page partners open most, so it leads with the one thing they came for:
 * the default code, its link, and a QR big enough to scan off a screen.
 *
 * Codes are read-only here — creating and editing them is an admin action.
 */
export function PartnerLinkView() {
  const { data, isPending, isError, error, refetch } = useMyReferralCodes();

  if (isPending) return <PortalLoading rows={2} />;
  if (isError) return <PortalError error={error} onRetry={() => void refetch()} />;

  const codes = data.codes ?? [];
  if (codes.length === 0) {
    return (
      <PortalEmpty
        icon={<Ticket className="size-6" />}
        title="No referral code yet"
        description="MedBell issues your code. Get in touch and we will set one up for you."
      />
    );
  }

  // Already sorted server-side: default first, then active, then newest.
  const [primary, ...rest] = codes;

  return (
    <>
      <header className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">My link</h1>
        <p className="text-sm text-muted-foreground">
          Share this and anything bought through it is credited to you.
        </p>
      </header>

      <PrimaryCode code={primary} />

      {rest.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Your other codes</CardTitle>
            <CardDescription>All of them credit you the same way.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {rest.map((code) => (
              <OtherCode key={code.code} code={code} />
            ))}
          </CardContent>
        </Card>
      ) : null}
    </>
  );
}

function usability(code: MyReferralCode): { usable: boolean; reason: string | null } {
  const now = Date.now();

  if (code.status !== "active") return { usable: false, reason: "Not currently active" };
  if (code.validFrom != null && code.validFrom > now) {
    return { usable: false, reason: `Starts ${formatDate(code.validFrom)}` };
  }
  if (code.validUntil != null && code.validUntil < now) {
    return { usable: false, reason: `Expired ${formatDate(code.validUntil)}` };
  }
  if (code.maxRedemptions != null && code.redemptionCount >= code.maxRedemptions) {
    return { usable: false, reason: "Fully used" };
  }
  return { usable: true, reason: null };
}

function PrimaryCode({ code }: { code: MyReferralCode }) {
  const state = usability(code);

  /**
   * Native share where the browser has it — on a phone this opens WhatsApp,
   * Messages and the rest, which is how most of these links actually travel.
   * Falls back to copying, so the button is never a dead end.
   */
  async function share() {
    const payload = {
      title: "MedBell",
      text: `Use my code ${code.code} to get a discount on MedBell.`,
      url: code.referralLink,
    };

    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share(payload);
        return;
      } catch (error) {
        // A user cancelling the sheet is not a failure worth reporting.
        if ((error as Error)?.name === "AbortError") return;
      }
    }

    try {
      await navigator.clipboard.writeText(code.referralLink);
      toast.success("Link copied.");
    } catch {
      toast.error("Could not share or copy. Select the link and copy it manually.");
    }
  }

  return (
    <Card>
      <CardContent className="space-y-5 py-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="mx-auto shrink-0 rounded-xl bg-white p-3 shadow-xs sm:mx-0">
            {/* Fixed white ground and dark modules: a QR inverted for dark mode
                is unreadable to a lot of scanners. */}
            <QRCodeSVG
              value={code.referralLink}
              size={148}
              level="M"
              bgColor="#ffffff"
              fgColor="#0b1220"
              aria-label={`QR code for referral code ${code.code}`}
            />
          </div>

          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <code className="font-mono text-2xl font-semibold tracking-tight">
                {code.code}
              </code>
              {code.isDefault ? <Badge variant="secondary">Default</Badge> : null}
              {state.usable ? (
                <Badge variant="success">
                  <Check /> Working
                </Badge>
              ) : (
                <Badge variant="warning">
                  <Ban /> {state.reason}
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-1 rounded-md border border-border bg-muted/40 px-2.5 py-2">
              <span className="min-w-0 flex-1 truncate text-sm" title={code.referralLink}>
                {code.referralLink}
              </span>
              <CopyButton value={code.referralLink} label="Copy link" />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={() => void share()}>
                <Share2 />
                Share
              </Button>
              <CopyButton value={code.code} label="Copy code" size="sm" variant="outline" />
            </div>

            <p className="text-xs text-muted-foreground">
              Used {formatNumber(code.redemptionCount)} times
              {code.maxRedemptions != null ? ` of ${formatNumber(code.maxRedemptions)}` : ""}.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function OtherCode({ code }: { code: MyReferralCode }) {
  const state = usability(code);

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border px-3 py-2.5">
      <code className="font-mono text-sm font-medium">{code.code}</code>
      {state.usable ? (
        <Badge variant="success">Working</Badge>
      ) : (
        <Badge variant="warning">{state.reason}</Badge>
      )}
      <span className="text-xs text-muted-foreground">
        {formatNumber(code.redemptionCount)} uses
      </span>
      <div className="ml-auto flex items-center gap-1">
        <CopyButton value={code.referralLink} label="Copy link" />
      </div>
    </div>
  );
}

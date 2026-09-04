"use client";

import { usePartners } from "@/hooks/use-referrals";
import { LIST_MAX_LIMIT } from "@/lib/constants";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ALL = "__all__";

/**
 * Partner selector. Several callables (listReferredUsers, listPartnerPayouts)
 * require a partnerId, so `includeAll` is off for those and the screen shows an
 * empty state until one is chosen rather than firing a request that would fail.
 *
 * Loads up to the server cap in one go — the list is small and there is no
 * cursor to page with.
 */
export function PartnerPicker({
  value,
  onChange,
  placeholder = "All partners",
  includeAll = true,
  className,
  id,
}: {
  value: string | null;
  onChange: (partnerId: string | null) => void;
  placeholder?: string;
  includeAll?: boolean;
  className?: string;
  id?: string;
}) {
  const query = usePartners({ limit: LIST_MAX_LIMIT });
  const partners = query.data?.partners ?? [];

  return (
    <Select value={value ?? ALL} onValueChange={(next) => onChange(next === ALL ? null : next)}>
      <SelectTrigger id={id} size="sm" className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {includeAll ? <SelectItem value={ALL}>{placeholder}</SelectItem> : null}
        {partners.map((partner) => (
          <SelectItem key={partner.id} value={partner.id}>
            {partner.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

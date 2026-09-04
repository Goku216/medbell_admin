import {
  Activity,
  Building2,
  LayoutDashboard,
  Receipt,
  ScrollText,
  Settings,
  ShieldCheck,
  Ticket,
  Users,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Match nested routes too (e.g. /users/<uid> highlights Users). */
  prefix?: boolean;
};

export type NavSection = {
  label: string;
  items: NavItem[];
};

export const NAV_SECTIONS: NavSection[] = [
  {
    label: "Overview",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/users", label: "Users", icon: Users, prefix: true },
    ],
  },
  {
    label: "Referral programme",
    items: [
      { href: "/referrals", label: "Programme", icon: Activity },
      { href: "/referrals/partners", label: "Partners", icon: Building2, prefix: true },
      { href: "/referrals/codes", label: "Codes", icon: Ticket },
      { href: "/referrals/customers", label: "Referred customers", icon: Users },
      { href: "/referrals/commissions", label: "Commissions", icon: Receipt },
      { href: "/referrals/payouts", label: "Payouts", icon: Wallet },
      { href: "/referrals/audit", label: "Audit trail", icon: ScrollText },
    ],
  },
  {
    label: "Configuration",
    items: [
      { href: "/referrals/settings", label: "Programme settings", icon: Settings },
      { href: "/admins", label: "Console admins", icon: ShieldCheck },
    ],
  },
];

export function isNavItemActive(item: NavItem, pathname: string): boolean {
  if (item.prefix) {
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  }
  return pathname === item.href;
}

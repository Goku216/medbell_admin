"use client";

import { useTheme } from "next-themes";
import { LogOut, Moon, Sun } from "lucide-react";

import { useAdminAuth } from "@/components/auth/admin-auth-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { initialsOf } from "@/lib/format";

export function UserMenu({
  email,
  name,
  picture,
}: {
  email: string | null;
  name: string | null;
  picture: string | null;
}) {
  const { signOut } = useAdminAuth();
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full" aria-label="Account menu">
          <Avatar className="size-8">
            {picture ? <AvatarImage src={picture} alt="" /> : null}
            <AvatarFallback>{initialsOf(name, email)}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="font-normal">
          <p className="truncate text-sm font-medium text-foreground">{name ?? "Admin"}</p>
          <p className="truncate text-xs text-muted-foreground">{email ?? "—"}</p>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {/*
          The icon is swapped with a CSS variant rather than a mounted flag:
          resolvedTheme is undefined on the server, and gating on a state set
          from an effect would just trade a hydration mismatch for a cascading
          render. The label stays theme-neutral for the same reason.
        */}
        <DropdownMenuItem
          onSelect={(event) => {
            event.preventDefault();
            setTheme(resolvedTheme === "dark" ? "light" : "dark");
          }}
        >
          <Moon className="dark:hidden" />
          <Sun className="hidden dark:block" />
          <span>Toggle theme</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem variant="destructive" onSelect={() => void signOut()}>
          <LogOut />
          <span>Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

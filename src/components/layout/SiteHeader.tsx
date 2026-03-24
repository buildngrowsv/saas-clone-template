/**
 * SiteHeader — top navigation bar visible on all main pages.
 *
 * READS FROM CONFIG:
 * All branding (logo text, gradient colors) comes from src/config/site.ts.
 * Navigation links come from siteConfig.navigationLinks.
 * To rebrand, change site.ts — this component adapts automatically.
 *
 * FEATURES:
 * - Sticky header with blur backdrop (stays visible on scroll)
 * - Logo with brand gradient on the left
 * - Navigation links in the center
 * - Right side: theme toggle, user menu (authenticated) or sign-in button
 * - Mobile: hamburger menu with all links
 *
 * AUTHENTICATION:
 * Uses authClient.useSession() to determine if the user is logged in.
 * Shows user avatar + dropdown when authenticated, sign-in button when not.
 *
 * IMPORTED BY:
 * - src/app/(main)/layout.tsx (wraps all main pages)
 */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";
import { useTheme } from "next-themes";
import { useState } from "react";
import { siteConfig } from "@/config/site";

export function SiteHeader() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { data: session } = authClient.useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  /**
   * Build the gradient class string from config.
   * This allows the brand gradient to be changed from site.ts without
   * touching this component.
   */
  const brandGradient = `bg-gradient-to-r ${siteConfig.themeColors.gradientFrom} ${siteConfig.themeColors.gradientTo}`;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl">
      <div className="container flex h-14 max-w-screen-2xl items-center px-4">
        {/* Logo — brand name with gradient from config */}
        <Link href="/" className="mr-6 flex items-center gap-2 font-bold text-lg">
          <span className={`${brandGradient} bg-clip-text text-transparent`}>
            {siteConfig.siteName}
          </span>
        </Link>

        {/* Desktop Navigation — reads from siteConfig.navigationLinks */}
        <nav className="hidden md:flex items-center gap-1">
          {siteConfig.navigationLinks.map((link) => (
            <Button key={link.href} variant="ghost" asChild>
              <Link
                href={link.href}
                className={pathname === link.href ? "text-foreground" : "text-muted-foreground"}
              >
                {link.label}
              </Link>
            </Button>
          ))}
        </nav>

        {/* Spacer — pushes right-side controls to the edge */}
        <div className="flex-1" />

        {/* Right side controls — theme toggle + auth */}
        <div className="flex items-center gap-2">
          {/* Theme toggle — switches between dark and light mode */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="h-8 w-8"
          >
            {/* Moon icon (shown in light mode) */}
            <svg className="h-4 w-4 dark:hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
            {/* Sun icon (shown in dark mode) */}
            <svg className="hidden h-4 w-4 dark:block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </Button>

          {session?.user ? (
            /**
             * Authenticated user menu — shows avatar initial + name.
             * Dropdown provides Dashboard link and Sign Out action.
             */
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <div className={`h-6 w-6 rounded-full ${brandGradient} flex items-center justify-center text-xs text-white font-bold`}>
                    {session.user.name?.[0] || session.user.email?.[0] || "U"}
                  </div>
                  <span className="hidden sm:inline text-sm">{session.user.name || "Account"}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href="/dashboard">Dashboard</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => authClient.signOut()}
                  className="text-destructive"
                >
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild size="sm">
              <Link href="/login">Sign in</Link>
            </Button>
          )}

          {/* Mobile menu button — visible only on small screens */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden h-8 w-8"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={mobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
            </svg>
          </Button>
        </div>
      </div>

      {/* Mobile menu — slides down below header */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border/40 bg-background p-4 space-y-2">
          {siteConfig.navigationLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="block px-3 py-2 text-sm rounded-md hover:bg-muted"
              onClick={() => setMobileMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}

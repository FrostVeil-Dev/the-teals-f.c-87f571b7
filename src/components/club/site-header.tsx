import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronDown, LogIn, Menu } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { CLUB_CONFIG, FALLBACK_IMAGE } from "@/lib/club-config";
import { canManageMembers } from "@/lib/ranks";
import { cn } from "@/lib/utils";
import { RankBadge } from "./ui";
import { EditableImage, EditableText } from "./site-editor";

const NAV_LINKS = [
  { to: "/", label: "Home" },
  { to: "/announcements", label: "Announcements" },
  { to: "/club-info", label: "Club Info" },
  { to: "/transfers-news", label: "Transfers & News" },
  { to: "/matchday", label: "Matchday" },
  { to: "/playbook", label: "Playbook" },
  { to: "/members", label: "Members" },
  { to: "/staff", label: "Staff" },
  { to: "/team-chat", label: "Team Chat" },
] as const;

const tabBase = "whitespace-nowrap rounded-lg px-2 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors 2xl:px-2.5";
const tabIdle = "text-muted-foreground hover:bg-secondary hover:text-foreground";
const tabActive = "border border-primary/30 bg-primary/15 text-primary";

export function SiteHeader() {
  const { profile, user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isAdmin = profile ? canManageMembers(profile.role) : false;

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  async function signOut() {
    setMenuOpen(false);
    await queryClient.cancelQueries();
    await supabase.auth.signOut();
    toast.info("Signed out");
    navigate({ to: "/", replace: true });
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-primary/20 bg-deep/90 shadow-lg shadow-black/40 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-3 sm:h-20">
          <Link to="/" className="group flex flex-shrink-0 items-center gap-2.5" aria-label="Go to Home">
            <EditableImage
              k="site.logo"
              fallback={CLUB_CONFIG.logoUrl}
              alt={`${CLUB_CONFIG.name} crest`}
              label="header crest"
              className="drop-glow h-9 w-9 object-contain transition-transform group-hover:scale-105 sm:h-11 sm:w-11"
            />
            <div className="flex flex-col">
              <EditableText
                k="site.shortName"
                fallback={CLUB_CONFIG.shortName}
                label="club short name"
                className="font-display text-lg font-extrabold uppercase tracking-wider text-foreground group-hover:text-primary sm:text-xl"
              />
              <EditableText
                k="site.motto"
                fallback={CLUB_CONFIG.motto}
                label="header motto"
                className="hidden max-w-[200px] text-[10px] font-medium leading-tight text-primary/80 sm:block xl:hidden 2xl:block"
              />
            </div>
          </Link>

          <nav className="hidden items-center gap-0.5 xl:flex" aria-label="Main navigation">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                activeOptions={{ exact: l.to === "/" }}
                className={tabBase}
                activeProps={{ className: tabActive }}
                inactiveProps={{ className: tabIdle }}
              >
                <EditableText k={`nav.${l.to}`} fallback={l.label} label="menu label" />
              </Link>
            ))}
            {isAdmin && (
              <Link
                to="/admin"
                className={cn(tabBase, "ml-1 border border-violet/30 text-violet hover:bg-violet/15")}
                activeProps={{ className: "bg-violet/20" }}
              >
                <span className="mr-1.5 inline-block h-2 w-2 animate-pulse rounded-full bg-violet" />
                Admin
              </Link>
            )}
          </nav>

          <div className="flex items-center gap-2">
            {user && profile ? (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen((o) => !o);
                  }}
                  className="flex items-center gap-2 rounded-xl border border-primary/30 bg-surface p-1.5 transition-colors hover:border-primary/60 sm:px-3"
                  aria-expanded={menuOpen}
                  aria-haspopup="true"
                >
                  <img
                    src={profile.photoURL || FALLBACK_IMAGE}
                    alt={profile.name}
                    className="h-8 w-8 rounded-full object-cover ring-2 ring-primary/50"
                  />
                  <div className="hidden flex-col items-start sm:flex">
                    <span className="max-w-[110px] truncate text-xs font-bold leading-tight">{profile.name}</span>
                    <RankBadge role={profile.role} className="px-1.5 py-0 text-[9px]" />
                  </div>
                  <ChevronDown className="hidden h-3.5 w-3.5 text-muted-foreground sm:block" />
                </button>

                {menuOpen && (
                  <div className="absolute right-0 z-50 mt-2 w-64 rounded-2xl border border-primary/30 bg-surface p-3 shadow-2xl">
                    <div className="border-b border-border pb-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={profile.photoURL || FALLBACK_IMAGE}
                          alt=""
                          className="h-10 w-10 rounded-full object-cover ring-2 ring-primary"
                        />
                        <div className="min-w-0">
                          <div className="truncate text-sm font-bold">{profile.name}</div>
                          <div className="truncate text-xs text-muted-foreground">{profile.email}</div>
                        </div>
                      </div>
                      <div className="mt-2.5 flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Club Rank:</span>
                        <RankBadge role={profile.role} />
                      </div>
                      <div className="mt-1 flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Team Chat:</span>
                        <span className={cn("font-bold", profile.chatAccess ? "text-primary" : "text-muted-foreground")}>
                          {profile.chatAccess ? "Granted ✓" : "Locked"}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 pt-2">
                      {isAdmin && (
                        <Link
                          to="/admin"
                          onClick={() => setMenuOpen(false)}
                          className="rounded-lg px-3 py-1.5 text-xs font-semibold text-violet hover:bg-violet/15"
                        >
                          Admin Dashboard
                        </Link>
                      )}
                      <button
                        onClick={signOut}
                        className="rounded-lg px-3 py-1.5 text-left text-xs font-semibold text-destructive hover:bg-destructive/10"
                      >
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link
                to="/auth"
                className="flex items-center gap-2 rounded-xl bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground shadow-md shadow-primary/20 hover:bg-primary/90 sm:px-4 sm:py-2 sm:text-sm"
              >
                <LogIn className="h-4 w-4" />
                Sign In
              </Link>
            )}

            <button
              onClick={() => setMobileOpen((o) => !o)}
              className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground xl:hidden"
              aria-label="Open navigation menu"
              aria-expanded={mobileOpen}
            >
              <Menu className="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>

      {mobileOpen && (
        <div className="space-y-1 border-t border-border bg-deep px-4 pb-4 pt-2 xl:hidden">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              onClick={() => setMobileOpen(false)}
              activeOptions={{ exact: l.to === "/" }}
              className="block rounded-lg px-3 py-2 text-sm font-bold uppercase tracking-wider"
              activeProps={{ className: tabActive }}
              inactiveProps={{ className: "text-muted-foreground hover:bg-surface" }}
            >
              <EditableText k={`nav.${l.to}`} fallback={l.label} label="menu label" />
            </Link>
          ))}
          {isAdmin && (
            <Link
              to="/admin"
              onClick={() => setMobileOpen(false)}
              className="block rounded-lg border border-violet/30 bg-violet/10 px-3 py-2 text-sm font-bold uppercase tracking-wider text-violet"
            >
              Admin Dashboard
            </Link>
          )}
        </div>
      )}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-primary/20 bg-deep py-12 text-xs text-muted-foreground">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-4 sm:flex-row sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <EditableImage k="site.logo" fallback={CLUB_CONFIG.logoUrl} alt={CLUB_CONFIG.name} label="crest" className="h-8 w-8 object-contain" />
          <div>
            <EditableText
              as="div"
              k="site.name"
              fallback={CLUB_CONFIG.name}
              label="club name"
              className="font-display text-base font-bold uppercase tracking-wider text-foreground"
            />
            <EditableText as="div" k="site.footerMotto" fallback={CLUB_CONFIG.motto} label="footer motto" className="text-[11px] text-primary" />
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-4 font-semibold">
          <Link to="/" className="hover:text-primary">Home</Link>
          <Link to="/playbook" className="hover:text-primary">Playbook</Link>
          <Link to="/matchday" className="hover:text-primary">Matchday</Link>
          <Link to="/members" className="hover:text-primary">Squad Roster</Link>
          <Link to="/staff" className="font-bold text-primary hover:text-primary/80">Staff Info</Link>
          <Link to="/team-chat" className="hover:text-primary">Team Chat</Link>
        </div>
        <div className="text-center text-[11px] sm:text-right">
          &copy; {new Date().getFullYear()}{" "}
          <EditableText k="site.copyright" fallback={`${CLUB_CONFIG.name}. All rights reserved.`} label="copyright line" />
        </div>
      </div>
    </footer>
  );
}

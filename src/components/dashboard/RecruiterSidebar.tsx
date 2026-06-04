import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  BarChart3,
  Briefcase,
  Home,
  MessageSquare,
  Search,
  Settings,
  Calendar,
  FileText,
  UserCheck,
  Building,
  Network,
  Star,
  ChevronLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";

type IconComponent = React.ComponentType<{ className?: string }>;

export type RecruiterNavItem = {
  label: string;
  path: string;
  icon: IconComponent;
  badge?: string;
};

const recruiterNavItems: RecruiterNavItem[] = [
  { label: "Overview", path: "/recruiter/dashboard", icon: Home },
  { label: "Find Talent", path: "/recruiter/find-talent", icon: Search },
  { label: "Job Posting", path: "/recruiter/jobs", icon: Briefcase },
  { label: "Applications", path: "/recruiter/applications", icon: FileText },
  { label: "Shortlist", path: "/recruiter/shortlist", icon: UserCheck },
  { label: "Interviews", path: "/recruiter/interviews", icon: Calendar },
  { label: "Messages", path: "/recruiter/messages", icon: MessageSquare },
  { label: "Network", path: "/recruiter/network", icon: Network },
  { label: "Ratings", path: "/recruiter/ratings", icon: Star },
  { label: "Analytics", path: "/recruiter/analytics", icon: BarChart3 },
  { label: "Settings", path: "/recruiter/settings", icon: Settings },
];

interface RecruiterSidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

export function RecruiterSidebar({
  mobileOpen = false,
  onMobileClose,
  collapsed = false,
  onCollapsedChange,
}: RecruiterSidebarProps) {
  const location = useLocation();
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const isCollapsed = onCollapsedChange ? collapsed : internalCollapsed;
  const setCollapsed = onCollapsedChange ?? setInternalCollapsed;

  const isPathActive = (path: string) => {
    if (location.pathname === path) return true;
    if (path === "/recruiter/dashboard") {
      return location.pathname === "/recruiter" || location.pathname === "/recruiter/";
    }
    return location.pathname.startsWith(path + "/");
  };

  const SidebarContent = ({ collapsed: navCollapsed }: { collapsed: boolean }) => (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-14 sm:h-16 shrink-0 items-center justify-between border-b border-border px-3 sm:px-4 gap-2">
        {!navCollapsed && (
          <div className="flex items-center gap-2 min-w-0">
            <Building className="h-5 w-5 sm:h-6 sm:w-6 text-primary flex-shrink-0" />
            <span className="font-semibold text-sm sm:text-base truncate">Recruiter</span>
          </div>
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!navCollapsed)}
          className="h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0 hidden lg:flex"
          title={navCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <ChevronLeft className={cn("h-4 w-4 sm:h-5 sm:w-5 transition-transform", navCollapsed && "rotate-180")} />
        </Button>
      </div>

      <nav className="flex-1 min-h-0 overflow-y-auto px-3 py-4">
        <div className="space-y-1">
          {recruiterNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = isPathActive(item.path);

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => onMobileClose?.()}
                className={cn(
                  "relative z-10 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                  isActive && "bg-accent text-accent-foreground",
                  navCollapsed && "justify-center px-2"
                )}
                title={navCollapsed ? item.label : undefined}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                {!navCollapsed && (
                  <>
                    <span className="truncate">{item.label}</span>
                    {item.badge && (
                      <span className="ml-auto flex-shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="shrink-0 border-t border-border p-4">
        {!navCollapsed && <ThemeToggle />}
      </div>
    </div>
  );

  const sidebarSurface = "border-r border-border bg-background";

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col lg:hidden transition-transform duration-300",
          sidebarSurface,
          mobileOpen ? "translate-x-0" : "-translate-x-full pointer-events-none"
        )}
      >
        <SidebarContent collapsed={false} />
      </aside>

      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:flex lg:h-screen lg:flex-col transition-[width] duration-300",
          sidebarSurface,
          isCollapsed ? "lg:w-20" : "lg:w-64"
        )}
      >
        <SidebarContent collapsed={isCollapsed} />
      </aside>
    </>
  );
}

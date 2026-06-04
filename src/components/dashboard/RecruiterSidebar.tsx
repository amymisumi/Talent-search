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
import { ScrollArea } from "@/components/ui/scroll-area";
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
}

export function RecruiterSidebar({ mobileOpen = false, onMobileClose }: RecruiterSidebarProps) {
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const SidebarContent = ({ collapsed }: { collapsed: boolean }) => (
    <div className="flex h-full flex-col">
      <div className="flex h-14 sm:h-16 items-center justify-between border-b border-border px-3 sm:px-4 gap-2">
        {!collapsed && (
          <div className="flex items-center gap-2 min-w-0">
            <Building className="h-5 w-5 sm:h-6 sm:w-6 text-primary flex-shrink-0" />
            <span className="font-semibold text-sm sm:text-base truncate">Recruiter</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0 hidden lg:flex"
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <ChevronLeft className={cn("h-4 w-4 sm:h-5 sm:w-5 transition-transform", isCollapsed && "rotate-180")} />
        </Button>
      </div>

      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-2">
          {recruiterNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onMobileClose}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground whitespace-nowrap",
                  isActive && "bg-accent text-accent-foreground",
                  collapsed && "justify-center px-2"
                )}
                title={collapsed ? item.label : undefined}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                {!collapsed && (
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
        </nav>
      </ScrollArea>

      <div className="border-t border-border p-4">
        {!collapsed && <ThemeToggle />}
      </div>
    </div>
  );

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onMobileClose}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 flex-col border-r border-border bg-background/95 backdrop-blur transition-transform duration-300 lg:hidden",
          mobileOpen ? "flex translate-x-0" : "flex -translate-x-full"
        )}
      >
        <SidebarContent collapsed={false} />
      </aside>

      <aside
        className={cn(
          "hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:flex lg:h-screen lg:flex-col lg:border-r lg:border-border lg:bg-background/95 lg:backdrop-blur lg:supports-[backdrop-filter]:bg-background/60 transition-all duration-300",
          isCollapsed ? "lg:w-20" : "lg:w-64"
        )}
      >
        <SidebarContent collapsed={isCollapsed} />
      </aside>
    </>
  );
}

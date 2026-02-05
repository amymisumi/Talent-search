import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  BarChart3,
  Briefcase,
  Home,
  MessageSquare,
  Search,
  Settings,
  Users,
  Calendar,
  FileText,
  UserCheck,
  Building,
  Network,
  Star,
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

export function RecruiterSidebar() {
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen border-r border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 transition-all duration-300",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex h-16 items-center justify-between border-b px-4">
          {!isCollapsed && (
            <div className="flex items-center gap-2">
              <Building className="h-6 w-6 text-primary" />
              <span className="font-semibold">Recruiter</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="h-8 w-8"
          >
            <Building className="h-4 w-4" />
          </Button>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 px-3 py-4">
          <nav className="space-y-2">
            {recruiterNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                    isActive && "bg-accent text-accent-foreground",
                    isCollapsed && "justify-center px-2"
                  )}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  {!isCollapsed && (
                    <>
                      <span className="truncate">{item.label}</span>
                      {item.badge && (
                        <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
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

        {/* Footer */}
        <div className="border-t p-4">
          {!isCollapsed && <ThemeToggle />}
        </div>
      </div>
    </aside>
  );
}

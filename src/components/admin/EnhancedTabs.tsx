import React, { useState, useRef, useEffect } from 'react';
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs';
import { cn } from '../../lib/utils';

interface EnhancedTabsProps {
  defaultValue: string;
  children: React.ReactNode;
  className?: string;
  tabs: Array<{
    value: string;
    label: string;
    icon?: React.ReactNode;
  }>;
  onValueChange?: (value: string) => void;
}

export const EnhancedTabs: React.FC<EnhancedTabsProps> = ({
  defaultValue,
  children,
  className,
  tabs,
  onValueChange
}) => {
  const [activeTab, setActiveTab] = useState(defaultValue);
  const [indicatorStyle, setIndicatorStyle] = useState({});
  const tabsRef = useRef<HTMLDivElement>(null);

  const handleValueChange = (value: string) => {
    setActiveTab(value);
    onValueChange?.(value);
  };

  useEffect(() => {
    const updateIndicator = () => {
      if (tabsRef.current) {
        const activeTrigger = tabsRef.current.querySelector(`[data-state="active"]`) as HTMLElement;
        if (activeTrigger) {
          const rect = activeTrigger.getBoundingClientRect();
          const containerRect = tabsRef.current.getBoundingClientRect();

          setIndicatorStyle({
            width: `${rect.width}px`,
            transform: `translateX(${rect.left - containerRect.left}px)`,
          });
        }
      }
    };

    updateIndicator();
    window.addEventListener('resize', updateIndicator);
    return () => window.removeEventListener('resize', updateIndicator);
  }, [activeTab]);

  return (
    <Tabs value={activeTab} onValueChange={handleValueChange} className={className}>
      <TabsList
        ref={tabsRef}
        className="relative h-12 bg-slate-50 p-1 rounded-lg border border-slate-200 overflow-hidden"
      >
        {/* Animated indicator */}
        <div
          className="absolute top-1 bottom-1 bg-white rounded-md shadow-sm border border-slate-200 transition-all duration-300 ease-in-out"
          style={indicatorStyle}
        />

        {tabs.map((tab) => (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            className={cn(
              "relative z-10 flex items-center space-x-2 px-4 py-2 text-sm font-medium transition-all duration-200",
              "data-[state=active]:text-blue-600 data-[state=active]:bg-transparent",
              "data-[state=inactive]:text-slate-600 hover:text-slate-900",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            )}
          >
            {tab.icon && <span className="flex-shrink-0">{tab.icon}</span>}
            <span>{tab.label}</span>
          </TabsTrigger>
        ))}
      </TabsList>
      {children}
    </Tabs>
  );
};

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { BarChart3, Download, Calendar } from 'lucide-react';
import { getCompleteAnalytics, CompleteAnalytics } from '../../../integrations/firebase/adminAnalytics';
import { useToast } from '../../../hooks/use-toast';
import {
  generateGrowthMetricsReport,
  generatePlatformUsageReport,
  downloadReport
} from '../../../utils/reportGenerator';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export const AnalyticsTab: React.FC = () => {
  const [analytics, setAnalytics] = useState<CompleteAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const { toast } = useToast();

  useEffect(() => {
    loadAnalytics();
  }, [dateRange]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const endDate = new Date();
      const startDate = new Date();
      
      switch (dateRange) {
        case '7d':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(endDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(endDate.getDate() - 90);
          break;
        case '1y':
          startDate.setFullYear(endDate.getFullYear() - 1);
          break;
      }

      const data = await getCompleteAnalytics(startDate, endDate);
      setAnalytics(data);
    } catch (error) {
      console.error("Error loading analytics:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load analytics"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExportReport = async (type: 'growth' | 'usage') => {
    if (!analytics) return;
    try {
      let report;
      if (type === 'growth') {
        report = await generateGrowthMetricsReport(analytics.growth, 'Admin', { format: 'pdf' });
      } else {
        report = await generatePlatformUsageReport(analytics.platformUsage, 'Admin', { format: 'pdf' });
      }
      downloadReport(report as Blob, `${type}-report.pdf`, 'application/pdf');
      toast({
        title: "Success",
        description: "Report generated and downloaded"
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to generate report"
      });
    }
  };

  if (loading || !analytics) {
    return <div className="text-center py-12">Loading analytics...</div>;
  }

  return (
    <div className="space-y-6">
      <Card className="border-0 bg-slate-700/50 backdrop-blur-xl shadow-xl border-slate-600/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-indigo-400" />
              System Analytics & Insights
            </CardTitle>
            <div className="flex gap-2">
              <Select value={dateRange} onValueChange={(v: any) => setDateRange(v)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="90d">Last 90 days</SelectItem>
                  <SelectItem value="1y">Last year</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={() => handleExportReport('growth')}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Growth Charts */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-white">User Growth</h3>
              <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={analytics.growth.youthGrowth}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                    <XAxis dataKey="date" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }}
                      labelStyle={{ color: '#e2e8f0' }}
                    />
                    <Legend wrapperStyle={{ color: '#e2e8f0' }} />
                    <Line type="monotone" dataKey="count" name="Youth" stroke="#3b82f6" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Skills Analytics */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-white">Most Demanded Skills</h3>
              <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analytics.skills.mostDemandedSkills.slice(0, 10)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                    <XAxis dataKey="skill" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }}
                      labelStyle={{ color: '#e2e8f0' }}
                    />
                    <Bar dataKey="count" fill="#8b5cf6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Platform Usage */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-white">Platform Usage</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="border-0 bg-gradient-to-br from-blue-600 to-blue-700 shadow-lg">
                  <CardContent className="pt-6">
                    <div className="text-3xl font-bold text-white">{analytics.platformUsage.activeUsers.daily}</div>
                    <p className="text-sm text-blue-100 mt-1">Daily Active Users</p>
                  </CardContent>
                </Card>
                <Card className="border-0 bg-gradient-to-br from-purple-600 to-purple-700 shadow-lg">
                  <CardContent className="pt-6">
                    <div className="text-3xl font-bold text-white">{analytics.platformUsage.activeUsers.weekly}</div>
                    <p className="text-sm text-purple-100 mt-1">Weekly Active Users</p>
                  </CardContent>
                </Card>
                <Card className="border-0 bg-gradient-to-br from-indigo-600 to-indigo-700 shadow-lg">
                  <CardContent className="pt-6">
                    <div className="text-3xl font-bold text-white">{analytics.platformUsage.activeUsers.monthly}</div>
                    <p className="text-sm text-indigo-100 mt-1">Monthly Active Users</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};


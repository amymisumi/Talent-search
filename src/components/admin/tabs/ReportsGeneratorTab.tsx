import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Badge } from '../../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../ui/dialog';
import { 
  FileText, 
  Download, 
  Calendar, 
  Filter, 
  Eye,
  Loader2,
  CheckCircle2,
  XCircle,
  Users,
  Building,
  FileCheck,
  Star,
  Briefcase,
  Network,
  Flag,
  BarChart3,
  TrendingUp
} from 'lucide-react';
import { useToast } from '../../../hooks/use-toast';
import { useAuth } from '../../../contexts/AuthContext';
import {
  getAllUsersForAdmin,
  getAllCertificatesForAdmin,
  getAllProjectsForAdmin,
  getAllReviewsForAdmin,
  getAllConnectionsForAdmin,
  getAllReportsForAdmin,
  getAdminDashboardStats,
  AdminUserProfile
} from '../../../integrations/firebase/adminServices';
import { getCompleteAnalytics } from '../../../integrations/firebase/adminAnalytics';
import {
  generateComprehensivePDFReport,
  ReportType,
  ReportFilters,
  ReportOptions
} from '../../../utils/comprehensiveReportGenerator';
import { useTheme } from '../../../contexts/ThemeContext';

export const ReportsGeneratorTab: React.FC = () => {
  const [reportType, setReportType] = useState<ReportType>('executive_summary');
  const [dateRange, setDateRange] = useState<'today' | '7d' | '30d' | '90d' | '1y' | 'custom'>('30d');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [filters, setFilters] = useState<ReportFilters>({});
  const [customNotes, setCustomNotes] = useState('');
  const [generating, setGenerating] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const { toast } = useToast();
  const { currentUser, userData } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const reportTypes: Array<{ value: ReportType; label: string; icon: React.ComponentType<{ className?: string }>; description: string }> = [
    { value: 'executive_summary', label: 'Executive Summary', icon: BarChart3, description: 'High-level platform overview (1-2 pages)' },
    { value: 'youth', label: 'Youth Report', icon: Users, description: 'Youth user statistics and growth' },
    { value: 'recruiter', label: 'Recruiter Report', icon: Building, description: 'Recruiter activity and statistics' },
    { value: 'certificates', label: 'Certificate Verification', icon: FileCheck, description: 'Certificate uploads and verification status' },
    { value: 'reviews', label: 'Reviews & Ratings', icon: Star, description: 'Review analytics and ratings breakdown' },
    { value: 'projects', label: 'Portfolio & Projects', icon: Briefcase, description: 'Project uploads and moderation' },
    { value: 'network', label: 'Network Activity', icon: Network, description: 'User connections and network statistics' },
    { value: 'flagged', label: 'Flagged Content', icon: Flag, description: 'Reports and moderation logs' },
    { value: 'growth', label: 'Growth & Analytics', icon: TrendingUp, description: 'Platform growth metrics and trends' }
  ];

  const getDateRange = (): { start: Date; end: Date } => {
    const end = new Date();
    const start = new Date();

    if (dateRange === 'custom') {
      if (customStartDate) start.setTime(new Date(customStartDate).getTime());
      if (customEndDate) end.setTime(new Date(customEndDate).getTime());
      return { start, end };
    }

    switch (dateRange) {
      case 'today':
        start.setHours(0, 0, 0, 0);
        break;
      case '7d':
        start.setDate(end.getDate() - 7);
        break;
      case '30d':
        start.setDate(end.getDate() - 30);
        break;
      case '90d':
        start.setDate(end.getDate() - 90);
        break;
      case '1y':
        start.setFullYear(end.getFullYear() - 1);
        break;
    }

    return { start, end };
  };

  const handleGenerateReport = async (preview: boolean = false) => {
    if (!currentUser) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "You must be logged in to generate reports"
      });
      return;
    }

    try {
      setGenerating(true);
      if (preview) setPreviewing(true);

      const { start, end } = getDateRange();
      const adminName = currentUser.displayName || userData?.displayName || 'Admin';
      const adminEmail = currentUser.email || '';

      // Fetch data based on report type
      let reportData: any = {};
      
      // Get stats once (with error handling)
      let stats = null;
      try {
        stats = await getAdminDashboardStats();
      } catch (error) {
        console.warn("Error fetching dashboard stats:", error);
        // Create minimal stats object if fetch fails
        stats = {
          totalYouth: 0,
          totalRecruiters: 0,
          verifiedYouth: 0,
          pendingCertificates: 0,
          totalProjects: 0,
          totalReviews: 0,
          pendingReports: 0,
          dailyGrowth: { youth: 0, recruiters: 0, projects: 0, reviews: 0 },
          weeklyGrowth: { youth: 0, recruiters: 0, projects: 0, reviews: 0 },
          systemAlerts: []
        };
      }
      
      switch (reportType) {
        case 'youth':
          const users = await getAllUsersForAdmin();
          reportData = {
            users: users.filter(u => u.role === 'youth' && 
              (!filters.status || (filters.status === 'verified' && u.isVerified) || 
               (filters.status === 'pending' && !u.isVerified && !u.isSuspended) ||
               (filters.status === 'suspended' && u.isSuspended))),
            stats: stats
          };
          break;
        case 'recruiter':
          const allUsers = await getAllUsersForAdmin();
          reportData = {
            recruiters: allUsers.filter(u => u.role === 'recruiter'),
            stats: stats
          };
          break;
        case 'certificates':
          reportData = {
            certificates: await getAllCertificatesForAdmin(),
            stats: stats
          };
          break;
        case 'reviews':
          reportData = {
            reviews: await getAllReviewsForAdmin(),
            stats: stats
          };
          break;
        case 'projects':
          reportData = {
            projects: await getAllProjectsForAdmin(),
            stats: stats
          };
          break;
        case 'network':
          reportData = {
            connections: await getAllConnectionsForAdmin(),
            stats: stats
          };
          break;
        case 'flagged':
          reportData = {
            reports: await getAllReportsForAdmin(),
            stats: stats
          };
          break;
        case 'growth':
        case 'executive_summary':
          let analytics = null;
          try {
            analytics = await getCompleteAnalytics(start, end);
          } catch (error) {
            console.warn("Error fetching analytics:", error);
            analytics = {
              growth: { youthGrowth: [] },
              skills: { mostDemandedSkills: [] },
              platformUsage: { activeUsers: { daily: 0, weekly: 0, monthly: 0 } }
            };
          }
          reportData = {
            analytics: analytics,
            stats: stats,
            users: await getAllUsersForAdmin()
          };
          break;
      }

      const options: ReportOptions = {
        includeCharts: true,
        includeSummary: true,
        customNotes: customNotes || undefined,
        filters: filters
      };

      const pdfBlob = await generateComprehensivePDFReport(
        reportType,
        reportData,
        {
          start,
          end
        },
        adminName,
        adminEmail,
        options
      );

      if (preview) {
        const url = URL.createObjectURL(pdfBlob);
        setPreviewUrl(url);
        setPreviewing(false);
      } else {
        // Generate filename
        const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '_');
        const timeStr = new Date().toTimeString().split(' ')[0].replace(/:/g, '-').substring(0, 5);
        const reportName = reportTypes.find(r => r.value === reportType)?.label.replace(/\s+/g, '_') || 'Report';
        const filename = `${reportName}_${dateStr}_${timeStr}.pdf`;

        // Download
        const url = URL.createObjectURL(pdfBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast({
          title: "Success",
          description: "Report generated and downloaded successfully"
        });
      }
    } catch (error) {
      console.error("Error generating report:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to generate report: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setGenerating(false);
      if (!preview) setPreviewing(false);
    }
  };

  const closePreview = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setPreviewing(false);
  };

  return (
    <div className="space-y-6">
      <Card className={`border-0 ${isDark ? 'bg-slate-700/50' : 'bg-white/80'} backdrop-blur-xl shadow-xl ${isDark ? 'border-slate-600/50' : 'border-gray-200'}`}>
        <CardHeader>
          <CardTitle className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'} flex items-center gap-2`}>
            <FileText className="h-6 w-6 text-blue-400" />
            PDF Report Generator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Report Type Selection */}
          <div>
            <Label className={isDark ? 'text-slate-300' : 'text-gray-700'}>Report Type</Label>
            <Select value={reportType} onValueChange={(v: ReportType) => setReportType(v)}>
              <SelectTrigger className={`mt-2 ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-gray-100 border-gray-300 text-gray-900'}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}>
                {reportTypes.map((type) => {
                  const Icon = type.icon;
                  return (
                    <SelectItem key={type.value} value={type.value} className={isDark ? 'text-white' : 'text-gray-900'}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        <div>
                          <div className="font-medium">{type.label}</div>
                          <div className="text-xs text-gray-400">{type.description}</div>
                        </div>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Date Range Selection */}
          <div>
            <Label className={isDark ? 'text-slate-300' : 'text-gray-700'}>Date Range</Label>
            <Select value={dateRange} onValueChange={(v: any) => setDateRange(v)}>
              <SelectTrigger className={`mt-2 ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-gray-100 border-gray-300 text-gray-900'}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}>
                <SelectItem value="today" className={isDark ? 'text-white' : 'text-gray-900'}>Today</SelectItem>
                <SelectItem value="7d" className={isDark ? 'text-white' : 'text-gray-900'}>Last 7 days</SelectItem>
                <SelectItem value="30d" className={isDark ? 'text-white' : 'text-gray-900'}>Last 30 days</SelectItem>
                <SelectItem value="90d" className={isDark ? 'text-white' : 'text-gray-900'}>Last 90 days</SelectItem>
                <SelectItem value="1y" className={isDark ? 'text-white' : 'text-gray-900'}>Last year</SelectItem>
                <SelectItem value="custom" className={isDark ? 'text-white' : 'text-gray-900'}>Custom range</SelectItem>
              </SelectContent>
            </Select>

            {dateRange === 'custom' && (
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <Label className={isDark ? 'text-slate-300' : 'text-gray-700'}>Start Date</Label>
                  <Input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className={`mt-2 ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-gray-100 border-gray-300 text-gray-900'}`}
                  />
                </div>
                <div>
                  <Label className={isDark ? 'text-slate-300' : 'text-gray-700'}>End Date</Label>
                  <Input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className={`mt-2 ${isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-gray-100 border-gray-300 text-gray-900'}`}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Filters */}
          <div>
            <Label className={isDark ? 'text-slate-300' : 'text-gray-700'}>Filters (Optional)</Label>
            <div className="grid grid-cols-2 gap-4 mt-2">
              {(reportType === 'youth' || reportType === 'recruiter') && (
                <div>
                  <Label className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Status</Label>
                  <Select 
                    value={filters.status || 'all'} 
                    onValueChange={(v) => setFilters({ ...filters, status: v === 'all' ? undefined : v as any })}
                  >
                    <SelectTrigger className={isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-gray-100 border-gray-300 text-gray-900'}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className={isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}>
                      <SelectItem value="all" className={isDark ? 'text-white' : 'text-gray-900'}>All Status</SelectItem>
                      <SelectItem value="verified" className={isDark ? 'text-white' : 'text-gray-900'}>Verified</SelectItem>
                      <SelectItem value="pending" className={isDark ? 'text-white' : 'text-gray-900'}>Pending</SelectItem>
                      <SelectItem value="suspended" className={isDark ? 'text-white' : 'text-gray-900'}>Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              {reportType === 'reviews' && (
                <div>
                  <Label className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Rating</Label>
                  <Select 
                    value={filters.rating || 'all'} 
                    onValueChange={(v) => setFilters({ ...filters, rating: v === 'all' ? undefined : parseInt(v) })}
                  >
                    <SelectTrigger className={isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-gray-100 border-gray-300 text-gray-900'}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className={isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}>
                      <SelectItem value="all" className={isDark ? 'text-white' : 'text-gray-900'}>All Ratings</SelectItem>
                      <SelectItem value="5" className={isDark ? 'text-white' : 'text-gray-900'}>5 Stars</SelectItem>
                      <SelectItem value="4" className={isDark ? 'text-white' : 'text-gray-900'}>4 Stars</SelectItem>
                      <SelectItem value="3" className={isDark ? 'text-white' : 'text-gray-900'}>3 Stars</SelectItem>
                      <SelectItem value="2" className={isDark ? 'text-white' : 'text-gray-900'}>2 Stars</SelectItem>
                      <SelectItem value="1" className={isDark ? 'text-white' : 'text-gray-900'}>1 Star</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              {reportType === 'certificates' && (
                <div>
                  <Label className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Verification Status</Label>
                  <Select 
                    value={filters.certificateStatus || 'all'} 
                    onValueChange={(v) => setFilters({ ...filters, certificateStatus: v === 'all' ? undefined : v as any })}
                  >
                    <SelectTrigger className={isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-gray-100 border-gray-300 text-gray-900'}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className={isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}>
                      <SelectItem value="all" className={isDark ? 'text-white' : 'text-gray-900'}>All Status</SelectItem>
                      <SelectItem value="verified" className={isDark ? 'text-white' : 'text-gray-900'}>Verified</SelectItem>
                      <SelectItem value="pending" className={isDark ? 'text-white' : 'text-gray-900'}>Pending</SelectItem>
                      <SelectItem value="rejected" className={isDark ? 'text-white' : 'text-gray-900'}>Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>

          {/* Custom Notes */}
          <div>
            <Label className={isDark ? 'text-slate-300' : 'text-gray-700'}>Custom Notes (Optional)</Label>
            <Textarea
              value={customNotes}
              onChange={(e) => setCustomNotes(e.target.value)}
              placeholder="Add organizational comments, recommendations, or audit notes that will appear at the end of the PDF..."
              className={`mt-2 ${isDark ? 'bg-slate-700 border-slate-600 text-white placeholder:text-slate-400' : 'bg-gray-100 border-gray-300 text-gray-900 placeholder:text-gray-500'}`}
              rows={4}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={() => handleGenerateReport(true)}
              disabled={generating || previewing}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {previewing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating Preview...
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4 mr-2" />
                  Preview Report
                </>
              )}
            </Button>
            <Button
              onClick={() => handleGenerateReport(false)}
              disabled={generating || previewing}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Generate & Download PDF
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={previewing || previewUrl !== null} onOpenChange={closePreview}>
        <DialogContent className="max-w-6xl max-h-[90vh] bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white text-xl font-bold">Report Preview</DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            {previewing ? (
              <div className="flex items-center justify-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                <span className="ml-3 text-white">Generating preview...</span>
              </div>
            ) : previewUrl ? (
              <iframe
                src={previewUrl}
                className="w-full h-[70vh] border border-slate-700 rounded"
                title="PDF Preview"
              />
            ) : null}
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={closePreview}
              className="bg-slate-700 text-white border-slate-600 hover:bg-slate-600"
            >
              Close
            </Button>
            {previewUrl && (
              <Button
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = previewUrl;
                  link.download = `Report_${new Date().toISOString().split('T')[0]}.pdf`;
                  link.click();
                }}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};


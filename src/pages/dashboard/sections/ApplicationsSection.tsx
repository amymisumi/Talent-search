import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  getApplicationsByUser,
  subscribeToApplicationsByUser,
  updateApplication,
  deleteApplication
} from '@/integrations/firebase/services';
import { Application } from '@/integrations/firebase/types';
import {
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  AlertCircle,
  Bookmark,
  BookmarkCheck,
  Trash2
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const ApplicationsSection = () => {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'reviewed' | 'interview' | 'accepted' | 'rejected'>('all');
  const [deletingApplicationId, setDeletingApplicationId] = useState<string | null>(null);

  // Load applications
  useEffect(() => {
    const loadApplications = async () => {
      if (!currentUser) return;

      try {
        setLoading(true);
        console.log('[ApplicationsSection] Loading applications for user:', currentUser.uid);
        const userApplications = await getApplicationsByUser(currentUser.uid);
        console.log('[ApplicationsSection] Loaded applications:', userApplications.length);
        setApplications(userApplications);
      } catch (error) {
        console.error('Error loading applications:', error);
        toast({
          title: "Error",
          description: "Failed to load applications",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadApplications();
  }, [currentUser, toast]);

  // Set up real-time listener
  useEffect(() => {
    if (!currentUser) return;

    console.log('[ApplicationsSection] Setting up real-time subscription for user:', currentUser.uid);
    const unsubscribe = subscribeToApplicationsByUser(currentUser.uid, (apps) => {
      console.log('[ApplicationsSection] Real-time update received:', apps.length, 'applications');
      setApplications(apps);
      setLoading(false);
    });
    return unsubscribe;
  }, [currentUser]);

  // Filter applications
  const filteredApplications = applications.filter(app => {
    if (filter === 'all') return true;
    return app.status === filter;
  });

  // Sort applications by date (newest first)
  const sortedApplications = filteredApplications.sort((a, b) =>
    new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime()
  );

  // Get status badge variant
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'reviewed':
        return <Badge variant="outline"><Eye className="h-3 w-3 mr-1" />Reviewed</Badge>;
      case 'interview':
        return <Badge className="bg-blue-100 text-blue-800"><AlertCircle className="h-3 w-3 mr-1" />Interview</Badge>;
      case 'accepted':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Accepted</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // Handle delete application
  const handleDeleteApplication = async (applicationId: string) => {
    if (!currentUser) return;
    
    try {
      setDeletingApplicationId(applicationId);
      await deleteApplication(applicationId, currentUser.uid);
      
      // Remove from local state
      setApplications(prev => prev.filter(app => app.id !== applicationId));
      
      toast({
        title: "Success",
        description: "Application deleted successfully",
      });
    } catch (error: any) {
      console.error('Error deleting application:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete application",
        variant: "destructive",
      });
    } finally {
      setDeletingApplicationId(null);
    }
  };

  // Get status counts
  const statusCounts = {
    all: applications.length,
    pending: applications.filter(a => a.status === 'pending').length,
    reviewed: applications.filter(a => a.status === 'reviewed').length,
    interview: applications.filter(a => a.status === 'interview').length,
    accepted: applications.filter(a => a.status === 'accepted').length,
    rejected: applications.filter(a => a.status === 'rejected').length,
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">My Applications</h2>
          <p className="mt-1 text-sm text-gray-600">
            Track your job applications and their status
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Badge variant="secondary">
            {applications.length} total applications
          </Badge>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-2">
            {Object.entries(statusCounts).map(([status, count]) => (
              <Button
                key={status}
                variant={filter === status ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter(status as any)}
                className="flex items-center space-x-1"
              >
                <span className="capitalize">{status}</span>
                <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {count}
                </Badge>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Applications List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="mr-2 h-5 w-5" />
            Applications ({filteredApplications.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sortedApplications.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium mb-2">
                {filter === 'all' ? 'No Applications Yet' : `No ${filter} Applications`}
              </h3>
              <p className="text-muted-foreground mb-4">
                {filter === 'all'
                  ? 'Start applying to jobs to see your applications here'
                  : `You don't have any ${filter} applications`
                }
              </p>
              {filter === 'all' && (
                <Button>Find Jobs</Button>
              )}
            </div>
          ) : (
            <ScrollArea className="h-96">
              <div className="space-y-4">
                {sortedApplications.map((application) => (
                  <div key={application.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{application.jobTitle}</h3>
                        <p className="text-muted-foreground">{application.companyName}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Applied on {new Date(application.appliedAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                      <div className="text-right">
                        {getStatusBadge(application.status)}
                      </div>
                    </div>

                    {/* Status-specific content */}
                    {application.status === 'interview' && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                        <div className="flex items-center text-blue-800">
                          <AlertCircle className="h-4 w-4 mr-2" />
                          <span className="font-medium">Interview Scheduled</span>
                        </div>
                        <p className="text-sm text-blue-700 mt-1">
                          Congratulations! The recruiter has invited you for an interview.
                        </p>
                      </div>
                    )}

                    {application.status === 'accepted' && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-3">
                        <div className="flex items-center text-green-800">
                          <CheckCircle className="h-4 w-4 mr-2" />
                          <span className="font-medium">Application Accepted</span>
                        </div>
                        <p className="text-sm text-green-700 mt-1">
                          Great news! Your application has been accepted.
                        </p>
                      </div>
                    )}

                    {application.status === 'rejected' && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
                        <div className="flex items-center text-red-800">
                          <XCircle className="h-4 w-4 mr-2" />
                          <span className="font-medium">Application Not Selected</span>
                        </div>
                        <p className="text-sm text-red-700 mt-1">
                          Don't be discouraged. Keep applying to other opportunities!
                        </p>
                      </div>
                    )}

                    {/* Notes from recruiter */}
                    {application.notes && (
                      <div className="bg-gray-50 border rounded-lg p-3 mb-3">
                        <h4 className="font-medium text-sm mb-1">Recruiter Notes:</h4>
                        <p className="text-sm text-gray-700">{application.notes}</p>
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mt-4">
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline">
                          <FileText className="h-4 w-4 mr-2" />
                          View Application
                        </Button>
                        {application.status === 'accepted' && (
                          <Button size="sm" className="bg-green-600 hover:bg-green-700">
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Accept Offer
                          </Button>
                        )}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              size="sm" 
                              variant="destructive"
                              disabled={deletingApplicationId === application.id}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              {deletingApplicationId === application.id ? 'Deleting...' : 'Delete'}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Application</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete your application for <strong>{application.jobTitle}</strong> at <strong>{application.companyName}</strong>? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteApplication(application.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Last updated: {new Date(application.updatedAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Application Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{statusCounts.pending}</div>
            <div className="text-sm text-muted-foreground">Pending</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">{statusCounts.reviewed}</div>
            <div className="text-sm text-muted-foreground">Reviewed</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{statusCounts.interview}</div>
            <div className="text-sm text-muted-foreground">Interviews</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{statusCounts.accepted}</div>
            <div className="text-sm text-muted-foreground">Accepted</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{statusCounts.rejected}</div>
            <div className="text-sm text-muted-foreground">Rejected</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ApplicationsSection;

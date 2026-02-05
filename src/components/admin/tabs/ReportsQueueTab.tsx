import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../ui/dialog';
import { Textarea } from '../../ui/textarea';
import { Label } from '../../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Eye, CheckCircle, XCircle, User } from 'lucide-react';
import {
  getAllReportsForAdmin,
  assignReport,
  addReportInternalNote,
  resolveReport,
  AdminReport
} from '../../../integrations/firebase/adminServices';
import { useToast } from '../../../hooks/use-toast';
import { useAuth } from '../../../contexts/AuthContext';

export const ReportsQueueTab: React.FC = () => {
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [filteredReports, setFilteredReports] = useState<AdminReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'resolved' | 'unresolved'>('all');
  const [selectedReport, setSelectedReport] = useState<AdminReport | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [internalNote, setInternalNote] = useState('');
  const [finalSummary, setFinalSummary] = useState('');
  const { toast } = useToast();
  const { currentUser } = useAuth();

  useEffect(() => {
    loadReports();
  }, []);

  useEffect(() => {
    filterReports();
  }, [reports, statusFilter]);

  const loadReports = async () => {
    try {
      setLoading(true);
      const allReports = await getAllReportsForAdmin();
      setReports(allReports);
      setFilteredReports(allReports);
    } catch (error) {
      console.error("Error loading reports:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load reports"
      });
    } finally {
      setLoading(false);
    }
  };

  const filterReports = () => {
    if (statusFilter === 'all') {
      setFilteredReports(reports);
    } else {
      setFilteredReports(reports.filter(r => r.status === statusFilter));
    }
  };

  const handleAssign = async (reportId: string) => {
    if (!currentUser) return;
    try {
      await assignReport(currentUser.uid, reportId, currentUser.uid);
      toast({
        title: "Success",
        description: "Report assigned to you"
      });
      loadReports();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to assign report"
      });
    }
  };

  const handleAddNote = async (reportId: string) => {
    if (!currentUser || !internalNote.trim()) return;
    try {
      await addReportInternalNote(currentUser.uid, reportId, internalNote);
      toast({
        title: "Success",
        description: "Internal note added"
      });
      setInternalNote('');
      loadReports();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add note"
      });
    }
  };

  const handleResolve = async (reportId: string, status: 'resolved' | 'unresolved') => {
    if (!currentUser) return;
    try {
      await resolveReport(currentUser.uid, reportId, status, finalSummary || undefined);
      toast({
        title: "Success",
        description: `Report ${status}`
      });
      setFinalSummary('');
      setShowDetails(false);
      loadReports();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to resolve report"
      });
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading reports...</div>;
  }

  return (
    <div className="space-y-6">
      <Card className="border-0 bg-slate-700/50 backdrop-blur-xl shadow-xl border-slate-600/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
              <Flag className="h-6 w-6 text-red-400" />
              Reports & Flagged Content Queue
            </CardTitle>
            <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Reports</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="unresolved">Unresolved</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                    <TableHead className="text-slate-300">Reporter</TableHead>
                      <TableHead className="text-slate-300">Subject</TableHead>
                      <TableHead className="text-slate-300">Category</TableHead>
                      <TableHead className="text-slate-300">Status</TableHead>
                      <TableHead className="text-slate-300">Assigned To</TableHead>
                      <TableHead className="text-slate-300">Created</TableHead>
                      <TableHead className="text-slate-300">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReports.map((report) => (
                  <TableRow key={report.id} className="border-slate-700 hover:bg-slate-700/50">
                    <TableCell className="text-white">{report.userName}</TableCell>
                    <TableCell className="font-medium text-white">{report.subject}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{(report as any).category || 'General'}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          report.status === 'resolved'
                            ? 'default'
                            : report.status === 'open'
                            ? 'secondary'
                            : 'destructive'
                        }
                      >
                        {report.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{report.assignedToName || 'Unassigned'}</TableCell>
                    <TableCell>
                      {report.createdAt ? new Date(report.createdAt).toLocaleDateString() : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedReport(report);
                            setShowDetails(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {!report.assignedTo && (
                          <Button
                            size="sm"
                            onClick={() => handleAssign(report.id)}
                          >
                            Assign
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-3xl bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white text-xl font-bold">Report Details</DialogTitle>
          </DialogHeader>
          {selectedReport && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-300">Reporter</Label>
                  <p className="font-medium text-white">{selectedReport.userName}</p>
                </div>
                <div>
                  <Label className="text-slate-300">Status</Label>
                  <Badge>{selectedReport.status}</Badge>
                </div>
                <div>
                  <Label className="text-slate-300">Subject</Label>
                  <p className="text-white">{selectedReport.subject}</p>
                </div>
                <div>
                  <Label className="text-slate-300">Created</Label>
                  <p className="text-white">{selectedReport.createdAt ? new Date(selectedReport.createdAt).toLocaleString() : 'N/A'}</p>
                </div>
              </div>
              <div>
                <Label className="text-slate-300">Message</Label>
                <p className="mt-1 p-3 bg-slate-700 rounded-lg text-slate-200 border border-slate-600">{selectedReport.message}</p>
              </div>
              <div>
                <Label className="text-slate-300">Add Internal Note</Label>
                <Textarea
                  value={internalNote}
                  onChange={(e) => setInternalNote(e.target.value)}
                  placeholder="Add internal note..."
                  className="mt-2 bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                />
                <Button
                  onClick={() => handleAddNote(selectedReport.id)}
                  className="mt-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border-blue-500/30"
                  disabled={!internalNote.trim()}
                >
                  Add Note
                </Button>
              </div>
              {selectedReport.status !== 'resolved' && (
                <div>
                  <Label className="text-slate-300">Final Summary (for resolution)</Label>
                  <Textarea
                    value={finalSummary}
                    onChange={(e) => setFinalSummary(e.target.value)}
                    placeholder="Add final summary..."
                    className="mt-2 bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                  />
                  <div className="flex gap-2 mt-2">
                    <Button
                      onClick={() => handleResolve(selectedReport.id, 'resolved')}
                      className="bg-green-600/20 hover:bg-green-600/30 text-green-300 border-green-500/30"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Mark Resolved
                    </Button>
                    <Button
                      className="bg-red-600/20 hover:bg-red-600/30 text-red-300 border-red-500/30"
                      onClick={() => handleResolve(selectedReport.id, 'unresolved')}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Mark Unresolved
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};


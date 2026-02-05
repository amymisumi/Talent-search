import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '../../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Textarea } from '../../ui/textarea';
import { Label } from '../../ui/label';
import { CheckCircle, XCircle, Eye, FileCheck, AlertCircle } from 'lucide-react';
import {
  getAllCertificatesForAdmin,
  verifyCertificate,
  verifySkill,
  Certificate
} from '../../../integrations/firebase/adminServices';
import { useToast } from '../../../hooks/use-toast';
import { useAuth } from '../../../contexts/AuthContext';

export const VerificationCenterTab: React.FC = () => {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [filteredCertificates, setFilteredCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'verified' | 'rejected'>('pending');
  const [selectedCert, setSelectedCert] = useState<Certificate | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const { toast } = useToast();
  const { currentUser } = useAuth();

  useEffect(() => {
    loadCertificates();
  }, []);

  useEffect(() => {
    filterCertificates();
  }, [certificates, statusFilter]);

  const loadCertificates = async () => {
    try {
      setLoading(true);
      console.log('[VerificationCenterTab] Loading certificates...');
      const allCerts = await getAllCertificatesForAdmin();
      console.log('[VerificationCenterTab] Loaded', allCerts.length, 'certificates');
      console.log('[VerificationCenterTab] Certificate statuses:', {
        total: allCerts.length,
        pending: allCerts.filter(c => c.status === 'pending').length,
        verified: allCerts.filter(c => c.status === 'verified').length,
        rejected: allCerts.filter(c => c.status === 'rejected').length
      });
      console.log('[VerificationCenterTab] Sample certificates:', allCerts.slice(0, 3).map(c => ({
        id: c.id,
        type: c.certificateType,
        status: c.status,
        user: c.userName
      })));
      setCertificates(allCerts);
      // The filterCertificates useEffect will handle filtering, but set initial state
      setFilteredCertificates(allCerts);
    } catch (error) {
      console.error("[VerificationCenterTab] Error loading certificates:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load certificates"
      });
    } finally {
      setLoading(false);
    }
  };

  const filterCertificates = () => {
    console.log('[VerificationCenterTab] Filtering certificates by status:', statusFilter);
    if (statusFilter === 'all') {
      setFilteredCertificates(certificates);
      console.log('[VerificationCenterTab] Showing all', certificates.length, 'certificates');
    } else {
      const filtered = certificates.filter(cert => cert.status === statusFilter);
      setFilteredCertificates(filtered);
      console.log('[VerificationCenterTab] Showing', filtered.length, 'certificates with status:', statusFilter);
    }
  };

  const handleVerify = async (certId: string, status: 'verified' | 'rejected' | 'need_more_info') => {
    if (!currentUser) return;
    try {
      // Find the certificate to get userId hint
      const cert = certificates.find(c => c.id === certId);
      await verifyCertificate(
        currentUser.uid,
        certId,
        status,
        adminNotes || undefined,
        status === 'rejected' ? rejectionReason : undefined,
        cert?.userId // Pass userId as hint to speed up search
      );
      toast({
        title: "Success",
        description: `Certificate ${status} successfully`
      });
      setRejectionReason('');
      setAdminNotes('');
      setShowDetails(false);
      loadCertificates();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update certificate status"
      });
    }
  };

  const handleViewDetails = (cert: Certificate) => {
    setSelectedCert(cert);
    setShowDetails(true);
  };

  if (loading) {
    return <div className="text-center py-12">Loading certificates...</div>;
  }

  return (
    <div className="space-y-6">
      <Card className="border-0 bg-slate-700/50 backdrop-blur-xl shadow-xl border-slate-600/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
              <FileCheck className="h-6 w-6 text-green-400" />
              Certificate Verification Center
            </CardTitle>
            <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Certificates</SelectItem>
                <SelectItem value="pending">Pending Review</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                    <TableRow className="border-slate-700">
                      <TableHead className="text-slate-300">User</TableHead>
                      <TableHead className="text-slate-300">Certificate Type</TableHead>
                      <TableHead className="text-slate-300">Status</TableHead>
                      <TableHead className="text-slate-300">Submitted</TableHead>
                      <TableHead className="text-slate-300">Actions</TableHead>
                    </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCertificates.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                      No certificates found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCertificates.map((cert) => (
                    <TableRow key={cert.id} className="border-slate-700 hover:bg-slate-700/50">
                      <TableCell className="font-medium text-white">{cert.userName}</TableCell>
                      <TableCell className="text-slate-300">{cert.certificateType}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            cert.status === 'verified'
                              ? 'default'
                              : cert.status === 'rejected'
                              ? 'destructive'
                              : 'secondary'
                          }
                        >
                          {cert.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {cert.submittedAt ? new Date(cert.submittedAt).toLocaleDateString() : 'N/A'}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border-blue-500/30"
                            onClick={() => handleViewDetails(cert)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {cert.status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleVerify(cert.id, 'verified')}
                                className="bg-green-600/20 hover:bg-green-600/30 text-green-300 border-green-500/30"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                className="bg-red-600/20 hover:bg-red-600/30 text-red-300 border-red-500/30"
                                onClick={() => {
                                  setSelectedCert(cert);
                                  setShowDetails(true);
                                }}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Certificate Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-3xl bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white text-xl font-bold">Certificate Details</DialogTitle>
            <DialogDescription className="text-slate-400">
              Review and verify certificate details
            </DialogDescription>
          </DialogHeader>
          {selectedCert && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-300">User</Label>
                  <p className="font-medium text-white">{selectedCert.userName}</p>
                </div>
                <div>
                  <Label className="text-slate-300">Certificate Type</Label>
                  <p className="text-white">{selectedCert.certificateType}</p>
                </div>
                <div>
                  <Label className="text-slate-300">Status</Label>
                  <Badge
                    variant={
                      selectedCert.status === 'verified'
                        ? 'default'
                        : selectedCert.status === 'rejected'
                        ? 'destructive'
                        : 'secondary'
                    }
                  >
                    {selectedCert.status}
                  </Badge>
                </div>
                <div>
                  <Label>Submitted</Label>
                  <p>{selectedCert.submittedAt ? new Date(selectedCert.submittedAt).toLocaleString() : 'N/A'}</p>
                </div>
              </div>

              {selectedCert.description && (
                <div>
                  <Label>Description</Label>
                  <p className="mt-1">{selectedCert.description}</p>
                </div>
              )}

              {selectedCert.fileUrl && (
                <div>
                  <Label>Certificate File</Label>
                  <div className="mt-2">
                    <a
                      href={selectedCert.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline flex items-center gap-2"
                    >
                      <FileCheck className="h-4 w-4" />
                      View Certificate
                    </a>
                  </div>
                </div>
              )}

              {selectedCert.status === 'pending' && (
                <div className="space-y-4 pt-4 border-t">
                  <div>
                    <Label className="text-slate-300">Admin Notes (Optional)</Label>
                    <Textarea
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder="Add notes about this certificate..."
                      className="mt-2 bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-300">Rejection Reason (if rejecting)</Label>
                    <Textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Explain why this certificate is being rejected..."
                      className="mt-2 bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleVerify(selectedCert.id, 'verified')}
                      className="bg-green-600/20 hover:bg-green-600/30 text-green-300 border-green-500/30"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve
                    </Button>
                    <Button
                      className="bg-red-600/20 hover:bg-red-600/30 text-red-300 border-red-500/30"
                      onClick={() => handleVerify(selectedCert.id, 'rejected')}
                      disabled={!rejectionReason.trim()}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                    <Button
                      className="bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-300 border-yellow-500/30"
                      onClick={() => handleVerify(selectedCert.id, 'need_more_info')}
                    >
                      <AlertCircle className="h-4 w-4 mr-2" />
                      Request More Info
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


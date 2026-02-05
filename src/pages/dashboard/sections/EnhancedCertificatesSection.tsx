import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Upload,
  Link as LinkIcon,
  X,
  Edit2,
  Trash2,
  CheckCircle2,
  Clock,
  XCircle,
  Loader2,
  FileText,
  ExternalLink,
  Download,
  Eye,
  Award,
  AlertCircle,
  Plus
} from 'lucide-react';
import {
  getYouthCertificates,
  addYouthCertificateWithFile,
  addYouthCertificateWithLink,
  updateYouthCertificate,
  deleteYouthCertificate,
  replaceYouthCertificateFile,
  subscribeToYouthCertificates,
  type YouthCertificate
} from '@/integrations/firebase/youthCertificatesService';

const EnhancedCertificatesSection = () => {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [certificates, setCertificates] = useState<YouthCertificate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCertificate, setEditingCertificate] = useState<YouthCertificate | null>(null);
  const [deletingCertificate, setDeletingCertificate] = useState<YouthCertificate | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'Pending' | 'Verified' | 'Rejected'>('all');
  const [uploadType, setUploadType] = useState<'file' | 'link'>('file');

  const [newCertificate, setNewCertificate] = useState({
    certificateName: '',
    issuingOrganization: '',
    completionDate: '',
    file: null as File | null,
    linkUrl: ''
  });

  // Real-time subscription to certificates
  useEffect(() => {
    if (!currentUser) {
      setCertificates([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    
    // Set up real-time listener
    const unsubscribe = subscribeToYouthCertificates(currentUser.uid, (updatedCerts) => {
      setCertificates(updatedCerts);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Filter certificates by status
  const filteredCertificates = certificates.filter(cert => {
    if (filterStatus === 'all') return true;
    return cert.verificationStatus === filterStatus;
  });

  // Get status badge
  const getStatusBadge = (status: YouthCertificate['verificationStatus']) => {
    switch (status) {
      case 'Verified':
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Verified
          </Badge>
        );
      case 'Pending':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      case 'Rejected':
        return (
          <Badge className="bg-red-100 text-red-800 border-red-200">
            <XCircle className="w-3 h-3 mr-1" />
            Rejected
          </Badge>
        );
    }
  };

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
      if (!validTypes.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: "Please upload a PDF, JPG, or PNG file",
          variant: "destructive",
        });
        return;
      }
      
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please upload a file smaller than 10MB",
          variant: "destructive",
        });
        return;
      }
      
      setNewCertificate(prev => ({ ...prev, file }));
    }
  };

  // Validate link URL
  const isValidCertificateLink = (url: string): boolean => {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();
      
      // Allow Coursera, Udemy, LinkedIn Learning, university domains, etc.
      const allowedDomains = [
        'coursera.org',
        'udemy.com',
        'linkedin.com',
        'edx.org',
        'khanacademy.org',
        '.edu',
        '.ac.',
        'certificate',
        'verify',
        'credential'
      ];
      
      return allowedDomains.some(domain => hostname.includes(domain));
    } catch {
      return false;
    }
  };

  // Add certificate
  const handleAddCertificate = async () => {
    if (!currentUser) return;

    if (!newCertificate.certificateName.trim() || !newCertificate.issuingOrganization.trim() || !newCertificate.completionDate) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      if (uploadType === 'file') {
        if (!newCertificate.file) {
          toast({
            title: "No file selected",
            description: "Please select a file to upload",
            variant: "destructive",
          });
          setIsUploading(false);
          return;
        }

        // Simulate upload progress
        const progressInterval = setInterval(() => {
          setUploadProgress(prev => Math.min(prev + 10, 90));
        }, 200);

        await addYouthCertificateWithFile(
          currentUser.uid,
          {
            certificateName: newCertificate.certificateName.trim(),
            issuingOrganization: newCertificate.issuingOrganization.trim(),
            completionDate: newCertificate.completionDate,
          },
          newCertificate.file
        );

        clearInterval(progressInterval);
        setUploadProgress(100);
      } else {
        if (!newCertificate.linkUrl.trim()) {
          toast({
            title: "No link provided",
            description: "Please provide a certificate link",
            variant: "destructive",
          });
          setIsUploading(false);
          return;
        }

        if (!isValidCertificateLink(newCertificate.linkUrl)) {
          toast({
            title: "Invalid link",
            description: "Please provide a valid certificate link (Coursera, Udemy, LinkedIn, University, etc.)",
            variant: "destructive",
          });
          setIsUploading(false);
          return;
        }

        await addYouthCertificateWithLink(
          currentUser.uid,
          {
            certificateName: newCertificate.certificateName.trim(),
            issuingOrganization: newCertificate.issuingOrganization.trim(),
            completionDate: newCertificate.completionDate,
            linkUrl: newCertificate.linkUrl.trim(),
          }
        );
      }

      toast({
        title: "Success",
        description: "Certificate added successfully and pending verification",
      });

      // Reset form
      setNewCertificate({
        certificateName: '',
        issuingOrganization: '',
        completionDate: '',
        file: null,
        linkUrl: ''
      });
      setShowAddModal(false);
      setUploadType('file');
    } catch (error) {
      console.error('Error adding certificate:', error);
      toast({
        title: "Error",
        description: "Failed to add certificate. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // Delete certificate
  const handleDeleteCertificate = async () => {
    if (!currentUser || !deletingCertificate) return;

    setIsUploading(true);

    try {
      await deleteYouthCertificate(
        currentUser.uid,
        deletingCertificate.id,
        deletingCertificate.fileUrl
      );

      toast({
        title: "Success",
        description: "Certificate deleted successfully",
      });

      setDeletingCertificate(null);
    } catch (error) {
      console.error('Error deleting certificate:', error);
      toast({
        title: "Error",
        description: "Failed to delete certificate. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Statistics
  const stats = {
    total: certificates.length,
    verified: certificates.filter(c => c.verificationStatus === 'Verified').length,
    pending: certificates.filter(c => c.verificationStatus === 'Pending').length,
    rejected: certificates.filter(c => c.verificationStatus === 'Rejected').length
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Certificates & Verification</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Upload certificates or submit links for verification. Updates sync automatically to your Digital CV.
          </p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Certificate
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Award className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Verified</p>
                <p className="text-2xl font-bold text-green-600">{stats.verified}</p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Rejected</p>
                <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Label>Filter by status:</Label>
        <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Certificates</SelectItem>
            <SelectItem value="Verified">Verified</SelectItem>
            <SelectItem value="Pending">Pending</SelectItem>
            <SelectItem value="Rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Certificates List */}
      {filteredCertificates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCertificates.map((cert) => (
            <Card key={cert.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg truncate">{cert.certificateName}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1 truncate">
                      {cert.issuingOrganization}
                    </p>
                  </div>
                  {getStatusBadge(cert.verificationStatus)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 mb-4">
                  <div className="text-sm text-muted-foreground">
                    Completed: {new Date(cert.completionDate).toLocaleDateString()}
                  </div>
                  {cert.verificationStatus === 'Rejected' && cert.adminFeedback && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-xs font-medium text-red-900 mb-1">Admin Feedback:</p>
                          <p className="text-xs text-red-700">{cert.adminFeedback}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="flex gap-2">
                  {cert.fileUrl && (
                    <Button size="sm" variant="outline" asChild>
                      <a href={cert.fileUrl} target="_blank" rel="noopener noreferrer">
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </a>
                    </Button>
                  )}
                  {cert.linkUrl && (
                    <Button size="sm" variant="outline" asChild>
                      <a href={cert.linkUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4 mr-1" />
                        Verify
                      </a>
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setDeletingCertificate(cert)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Award className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No certificates yet</h3>
            <p className="text-sm text-muted-foreground text-center mb-4">
              Upload your first certificate or submit a link to get started
            </p>
            <Button onClick={() => setShowAddModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Certificate
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Add Certificate Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Certificate</DialogTitle>
            <DialogDescription>
              Upload a certificate file or submit a verification link (Coursera, Udemy, LinkedIn, etc.)
            </DialogDescription>
          </DialogHeader>
          
          <Tabs value={uploadType} onValueChange={(value: 'file' | 'link') => setUploadType(value)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="file">Upload File</TabsTrigger>
              <TabsTrigger value="link">Submit Link</TabsTrigger>
            </TabsList>

            <TabsContent value="file" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="certName">Certificate Name *</Label>
                  <Input
                    id="certName"
                    value={newCertificate.certificateName}
                    onChange={(e) => setNewCertificate(prev => ({ ...prev, certificateName: e.target.value }))}
                    placeholder="e.g., AWS Certified Developer"
                  />
                </div>
                <div>
                  <Label htmlFor="issuer">Issuing Organization *</Label>
                  <Input
                    id="issuer"
                    value={newCertificate.issuingOrganization}
                    onChange={(e) => setNewCertificate(prev => ({ ...prev, issuingOrganization: e.target.value }))}
                    placeholder="e.g., Amazon Web Services"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="completionDate">Completion Date *</Label>
                <Input
                  id="completionDate"
                  type="date"
                  value={newCertificate.completionDate}
                  onChange={(e) => setNewCertificate(prev => ({ ...prev, completionDate: e.target.value }))}
                />
              </div>
              <div>
                <Label>Certificate File * (PDF, JPG, or PNG)</Label>
                {!newCertificate.file ? (
                  <div className="mt-2 border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:bg-gray-50 transition-colors">
                    <label className="cursor-pointer">
                      <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                      <p className="text-sm text-gray-600">
                        <span className="font-medium text-primary">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs text-gray-500 mt-1">PDF, JPG, or PNG (max 10MB)</p>
                      <input
                        type="file"
                        className="hidden"
                        onChange={handleFileChange}
                        accept=".pdf,.jpg,.jpeg,.png"
                      />
                    </label>
                  </div>
                ) : (
                  <div className="mt-2 p-3 border border-gray-200 rounded-lg bg-gray-50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium">{newCertificate.file.name}</p>
                        <p className="text-xs text-gray-500">
                          {(newCertificate.file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setNewCertificate(prev => ({ ...prev, file: null }))}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
              {isUploading && uploadProgress > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Uploading...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} />
                </div>
              )}
            </TabsContent>

            <TabsContent value="link" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="linkCertName">Certificate Name *</Label>
                  <Input
                    id="linkCertName"
                    value={newCertificate.certificateName}
                    onChange={(e) => setNewCertificate(prev => ({ ...prev, certificateName: e.target.value }))}
                    placeholder="e.g., Google Data Analytics Certificate"
                  />
                </div>
                <div>
                  <Label htmlFor="linkIssuer">Issuing Organization *</Label>
                  <Input
                    id="linkIssuer"
                    value={newCertificate.issuingOrganization}
                    onChange={(e) => setNewCertificate(prev => ({ ...prev, issuingOrganization: e.target.value }))}
                    placeholder="e.g., Coursera, Google"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="linkCompletionDate">Completion Date *</Label>
                <Input
                  id="linkCompletionDate"
                  type="date"
                  value={newCertificate.completionDate}
                  onChange={(e) => setNewCertificate(prev => ({ ...prev, completionDate: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="linkUrl">Certificate Verification Link *</Label>
                <Input
                  id="linkUrl"
                  type="url"
                  value={newCertificate.linkUrl}
                  onChange={(e) => setNewCertificate(prev => ({ ...prev, linkUrl: e.target.value }))}
                  placeholder="https://coursera.org/verify/..."
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Supports Coursera, Udemy, LinkedIn Learning, University verification URLs, etc.
                </p>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)} disabled={isUploading}>
              Cancel
            </Button>
            <Button onClick={handleAddCertificate} disabled={isUploading}>
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {uploadType === 'file' ? 'Uploading...' : 'Submitting...'}
                </>
              ) : (
                <>
                  {uploadType === 'file' ? <Upload className="h-4 w-4 mr-2" /> : <LinkIcon className="h-4 w-4 mr-2" />}
                  Add Certificate
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      {deletingCertificate && (
        <Dialog open={!!deletingCertificate} onOpenChange={() => setDeletingCertificate(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Certificate</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete "{deletingCertificate.certificateName}"? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeletingCertificate(null)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDeleteCertificate} disabled={isUploading}>
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default EnhancedCertificatesSection;

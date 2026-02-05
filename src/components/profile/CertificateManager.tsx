import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  uploadCertificate,
  Certificate,
  CertificateStatus 
} from '../../integrations/firebase/profileService';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Upload, FileText, X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export const CertificateManager = () => {
  const { currentUser } = useAuth();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const [newCertificate, setNewCertificate] = useState<{
    title: string;
    institution: string;
    issueDate: string;
    expirationDate: string;
    skills: string[];
    file: File | null;
  }>({
    title: '',
    institution: '',
    issueDate: '',
    expirationDate: '',
    skills: [],
    file: null
  });
  
  const [newSkill, setNewSkill] = useState('');

  // Load certificates
  useEffect(() => {
    // This would be replaced with actual data fetching
    // const loadCertificates = async () => {
    //   if (!currentUser) return;
    //   const certs = await getUserCertificates(currentUser.uid);
    //   setCertificates(certs);
    // };
    // loadCertificates();
  }, [currentUser]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setNewCertificate(prev => ({
        ...prev,
        file: e.target.files![0]
      }));
    }
  };

  const addSkill = () => {
    if (newSkill.trim() && !newCertificate.skills.includes(newSkill.trim())) {
      setNewCertificate(prev => ({
        ...prev,
        skills: [...prev.skills, newSkill.trim()]
      }));
      setNewSkill('');
    }
  };

  const removeSkill = (skillToRemove: string) => {
    setNewCertificate(prev => ({
      ...prev,
      skills: prev.skills.filter(skill => skill !== skillToRemove)
    }));
  };

  const handleUpload = async () => {
    if (!currentUser || !newCertificate.file) return;
    
    try {
      setIsUploading(true);
      setUploadProgress(0);
      
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);
      
      // Upload the certificate
      const certificate = await uploadCertificate(
        currentUser.uid,
        newCertificate.file,
        {
          title: newCertificate.title,
          institution: newCertificate.institution,
          issueDate: newCertificate.issueDate,
          expirationDate: newCertificate.expirationDate || undefined,
          skills: newCertificate.skills
        }
      );
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      // Add the new certificate to the list
      setCertificates(prev => [certificate, ...prev]);
      
      // Reset form
      setNewCertificate({
        title: '',
        institution: '',
        issueDate: '',
        expirationDate: '',
        skills: [],
        file: null
      });
      
      // Reset progress bar after a short delay
      setTimeout(() => setUploadProgress(0), 1000);
      
    } catch (error) {
      console.error('Error uploading certificate:', error);
      // Show error message
    } finally {
      setIsUploading(false);
    }
  };

  const getStatusBadge = (status: CertificateStatus) => {
    switch (status) {
      case 'approved':
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle2 className="w-3 h-3 mr-1" /> Approved
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="destructive">
            <AlertCircle className="w-3 h-3 mr-1" /> Rejected
          </Badge>
        );
      default:
        return <Badge variant="outline">Pending Review</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Certificates</h2>
        <p className="text-sm text-gray-500">
          {certificates.filter(c => c.status === 'approved').length} verified • {certificates.length} total
        </p>
      </div>
      
      {/* Upload Form */}
      <Card>
        <CardHeader>
          <CardTitle>Add New Certificate</CardTitle>
          <CardDescription>
            Upload your certificates to verify your skills and qualifications.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Certificate Title*</label>
              <Input
                value={newCertificate.title}
                onChange={(e) => setNewCertificate({...newCertificate, title: e.target.value})}
                placeholder="e.g., AWS Certified Developer"
                disabled={isUploading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Institution*</label>
              <Input
                value={newCertificate.institution}
                onChange={(e) => setNewCertificate({...newCertificate, institution: e.target.value})}
                placeholder="e.g., Amazon Web Services"
                disabled={isUploading}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Issue Date*</label>
              <Input
                type="date"
                value={newCertificate.issueDate}
                onChange={(e) => setNewCertificate({...newCertificate, issueDate: e.target.value})}
                disabled={isUploading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Expiration Date (if applicable)</label>
              <Input
                type="date"
                value={newCertificate.expirationDate}
                onChange={(e) => setNewCertificate({...newCertificate, expirationDate: e.target.value})}
                disabled={isUploading}
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Skills (optional)</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {newCertificate.skills.map((skill, index) => (
                <Badge key={index} variant="secondary" className="flex items-center">
                  {skill}
                  <button
                    type="button"
                    onClick={() => removeSkill(skill)}
                    className="ml-1 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex">
              <Input
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                placeholder="Add a skill and press Enter"
                disabled={isUploading}
                className="flex-1"
              />
              <Button 
                type="button" 
                variant="outline" 
                onClick={addSkill}
                disabled={!newSkill.trim() || isUploading}
                className="ml-2"
              >
                Add
              </Button>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">
              Certificate File* (PDF, JPG, or PNG)
            </label>
            <div className="flex items-center gap-2">
              <label className="flex-1">
                <div className={`flex items-center justify-center w-full p-6 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 ${
                  isUploading ? 'opacity-50 cursor-not-allowed' : ''
                }`}>
                  {newCertificate.file ? (
                    <div className="text-center">
                      <FileText className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                      <p className="font-medium">{newCertificate.file.name}</p>
                      <p className="text-sm text-gray-500">
                        {(newCertificate.file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                      <p className="text-sm text-gray-600">
                        <span className="font-medium text-primary">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs text-gray-500">
                        PDF, JPG, or PNG (max 5MB)
                      </p>
                    </div>
                  )}
                  <input
                    type="file"
                    className="hidden"
                    onChange={handleFileChange}
                    accept=".pdf,.jpg,.jpeg,.png"
                    disabled={isUploading}
                  />
                </div>
              </label>
              
              {newCertificate.file && (
                <button
                  type="button"
                  onClick={() => setNewCertificate({...newCertificate, file: null})}
                  className="p-2 text-gray-500 hover:text-red-500"
                  disabled={isUploading}
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
          
          {uploadProgress > 0 && uploadProgress < 100 && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button
            type="button"
            onClick={handleUpload}
            disabled={!newCertificate.file || !newCertificate.title || !newCertificate.institution || !newCertificate.issueDate || isUploading}
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              'Upload Certificate'
            )}
          </Button>
        </CardFooter>
      </Card>
      
      {/* Certificates List */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">My Certificates</h3>
        
        {certificates.length > 0 ? (
          <div className="grid gap-4">
            {certificates.map((cert) => (
              <Card key={cert.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 rounded-lg">
                          <FileText className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="font-medium">{cert.title}</h4>
                          <p className="text-sm text-gray-600">{cert.institution}</p>
                        </div>
                      </div>
                      
                      <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Issued:</span>{' '}
                          <span>{new Date(cert.issueDate).toLocaleDateString()}</span>
                        </div>
                        {cert.expirationDate && (
                          <div>
                            <span className="text-gray-500">Expires:</span>{' '}
                            <span>{new Date(cert.expirationDate).toLocaleDateString()}</span>
                          </div>
                        )}
                        <div className="ml-auto">
                          {getStatusBadge(cert.status)}
                        </div>
                      </div>
                      
                      {cert.skills.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {cert.skills.map((skill, i) => (
                            <Badge key={i} variant="outline">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      )}
                      
                      {cert.status === 'rejected' && cert.adminComment && (
                        <div className="mt-3 p-3 bg-red-50 border border-red-100 rounded-md text-sm text-red-700">
                          <p className="font-medium">Reason for rejection:</p>
                          <p>{cert.adminComment}</p>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 ml-4">
                      <a 
                        href={cert.fileUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline"
                      >
                        View
                      </a>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 border-2 border-dashed rounded-lg">
            <FileText className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No certificates yet</h3>
            <p className="mt-1 text-sm text-gray-500">
              Upload your first certificate to get started.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Upload, FileImage, FileVideo, FileText } from 'lucide-react';
import { uploadFile, addPortfolio } from '@/integrations/firebase/services';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';

interface PortfolioUploadProps {
  onUploadSuccess?: () => void;
}

const PortfolioUpload: React.FC<PortfolioUploadProps> = ({ onUploadSuccess }) => {
  const { currentUser } = useAuth();
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !currentUser || !title.trim()) {
      toast.error('Please select a file and provide a title');
      return;
    }

    setUploading(true);
    try {
      const fileName = `${Date.now()}_${selectedFile.name}`;
      const path = `portfolios/${currentUser.uid}/${fileName}`;

      const downloadURL = await uploadFile(selectedFile, path);

      // Save portfolio metadata to Firestore
      await addPortfolio({
        profileId: currentUser.uid,
        title: title.trim(),
        description: description.trim() || undefined,
        imageUrl: downloadURL,
        technologies: [],
        isFlagged: false,
        projectUrl: undefined
      });

      toast.success(t('uploadSuccess') || 'Upload successful');
      setIsOpen(false);
      setSelectedFile(null);
      setTitle('');
      setDescription('');
      onUploadSuccess?.();
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(t('uploadError') || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return <FileImage className="h-8 w-8 text-blue-500" />;
    if (file.type.startsWith('video/')) return <FileVideo className="h-8 w-8 text-red-500" />;
    return <FileText className="h-8 w-8 text-gray-500" />;
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full justify-start">
          <Upload className="mr-2 h-4 w-4" />
          {t('uploadPortfolio')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('uploadPortfolio')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {t('uploadPortfolioDesc')}
          </p>

          <div className="space-y-2">
            <label className="text-sm font-medium">Title *</label>
            <Input
              placeholder="Project title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <Textarea
              placeholder="Describe your project..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">{t('selectFile')}</label>
            <Input
              type="file"
              accept="image/*,video/*,.pdf,.doc,.docx"
              onChange={handleFileSelect}
              className="cursor-pointer"
            />
          </div>

          {selectedFile && (
            <Card className="p-3">
              <div className="flex items-center space-x-3">
                {getFileIcon(selectedFile)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
            </Card>
          )}

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={uploading || !selectedFile || !title.trim()}>
              {uploading ? t('uploading') : 'Upload'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PortfolioUpload;

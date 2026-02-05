import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  addPortfolio, 
  updatePortfolio, 
  deletePortfolioWithStorage, 
  onPortfoliosByProfile 
} from '../../integrations/firebase/services';
import { Portfolio } from '../../integrations/firebase/types';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../integrations/firebase/client';
import { Button } from '../ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Trash2, FileText, Image as ImageIcon, Film, File, Upload, X, Loader2 } from 'lucide-react';
import { Progress } from '../ui/progress';

export const PortfolioManager = () => {
  const { currentUser } = useAuth();
  const [items, setItems] = useState<Portfolio[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [editingItem, setEditingItem] = useState<null | { id: string; title: string; description?: string }>(null);
  const [newItem, setNewItem] = useState<{
    title: string;
    description: string;
    file: File | null;
    fileType: 'image' | 'video' | 'document' | 'design';
  }>({
    title: '',
    description: '',
    file: null,
    fileType: 'image'
  });

  // Load portfolio items via realtime listener
  useEffect(() => {
    if (!currentUser) {
      setItems([]);
      return;
    }
    const unsub = onPortfoliosByProfile(currentUser.uid, setItems);
    return () => unsub && unsub();
  }, [currentUser]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const fileType = getFileType(file.type);
      
      setNewItem(prev => ({
        ...prev,
        file,
        fileType,
        title: file.name.split('.').slice(0, -1).join('.'),
      }));
    }
  };

  const getFileType = (mimeType: string): 'image' | 'video' | 'document' | 'design' => {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(mimeType)) 
      return 'document';
    return 'design';
  };

  const handleUpload = async () => {
    if (!currentUser || !newItem.file) return;
    
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
      
      // Upload file to storage
      const fileExt = newItem.file.name.split('.').pop();
      const fileName = `${Date.now()}_${newItem.file.name}`;
      const filePath = `portfolio/${currentUser.uid}/${fileName}`;
      const storageRef = ref(storage, filePath);
      
      const snapshot = await uploadBytes(storageRef, newItem.file);
      const fileUrl = await getDownloadURL(snapshot.ref);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      // Add document to Firestore via service
      await addPortfolio({
        profileId: currentUser.uid,
        title: newItem.title,
        description: newItem.description,
        fileUrl,
        fileType: newItem.fileType,
        fileName: newItem.file.name,
        fileSize: newItem.file.size,
        storagePath: filePath
      });
      
      // Reset form (realtime listener will update items)
      setNewItem({
        title: '',
        description: '',
        file: null,
        fileType: 'image'
      });
      
      // Reset progress bar after a short delay
      setTimeout(() => setUploadProgress(0), 1000);
      
    } catch (error) {
      console.error('Error uploading portfolio item:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (itemId: string, storagePath?: string) => {
    if (!currentUser) return;
    
    if (window.confirm('Are you sure you want to delete this item?')) {
      try {
        await deletePortfolioWithStorage(itemId, storagePath);
        setItems(prev => prev.filter(item => item.id !== itemId));
      } catch (error) {
        console.error('Error deleting portfolio item:', error);
      }
    }
  };

  const handleOpenEdit = (item: Portfolio) => {
    setEditingItem({ id: item.id, title: item.title, description: item.description });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    try {
      await updatePortfolio(editingItem.id, { title: editingItem.title, description: editingItem.description });
      setEditingItem(null);
    } catch (error) {
      console.error('Error updating portfolio item:', error);
    }
  };

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'image':
        return <ImageIcon className="w-5 h-5" />;
      case 'video':
        return <Film className="w-5 h-5" />;
      case 'document':
        return <FileText className="w-5 h-5" />;
      default:
        return <File className="w-5 h-5" />;
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Portfolio</h2>
        <p className="text-sm text-gray-500">{items.length} items</p>
      </div>
      
      {/* Upload Form */}
      <Card>
        <CardHeader>
          <CardTitle>Add New Portfolio Item</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Title*</label>
              <Input
                value={newItem.title}
                onChange={(e) => setNewItem({...newItem, title: e.target.value})}
                placeholder="Project title"
                disabled={isUploading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">File Type</label>
              <select
                value={newItem.fileType}
                onChange={(e) => setNewItem({...newItem, fileType: e.target.value as any})}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isUploading}
              >
                <option value="image">Image</option>
                <option value="video">Video</option>
                <option value="document">Document</option>
                <option value="design">Design</option>
              </select>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <Textarea
              value={newItem.description}
              onChange={(e) => setNewItem({...newItem, description: e.target.value})}
              placeholder="Brief description of your work"
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              rows={3}
              disabled={isUploading}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">
              {newItem.file ? 'File Selected' : 'Upload File*'}
            </label>
            <div className="flex items-center gap-2">
              <label className="flex-1">
                <div className="flex items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50">
                  {newItem.file ? (
                    <div className="text-center p-4">
                      <p className="font-medium">{newItem.file.name}</p>
                      <p className="text-sm text-gray-500">
                        {(newItem.file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  ) : (
                    <div className="text-center p-4">
                      <div className="mx-auto w-8 h-8 mb-2 text-gray-400">
                        <Upload className="w-full h-full" />
                      </div>
                      <p className="text-sm text-gray-600">
                        <span className="font-medium text-primary">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs text-gray-500">
                        Images, videos, PDFs, and design files (max 10MB)
                      </p>
                    </div>
                  )}
                  <input
                    type="file"
                    className="hidden"
                    onChange={handleFileChange}
                    accept="image/*,video/*,.pdf,.doc,.docx,.psd,.ai,.xd,.fig"
                    disabled={isUploading}
                  />
                </div>
              </label>
              
              {newItem.file && (
                <button
                  type="button"
                  onClick={() => setNewItem({...newItem, file: null})}
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
              <Progress value={uploadProgress} className="h-2" />
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button
            type="button"
            onClick={handleUpload}
            disabled={!newItem.file || !newItem.title || isUploading}
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              'Upload Item'
            )}
          </Button>
        </CardFooter>
      </Card>

      {/* Edit Modal */}
      {editingItem && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium">Edit Portfolio Item</h3>
            <button onClick={() => setEditingItem(null)} className="text-gray-400 hover:text-gray-500">
              <X className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Title</label>
              <Input
                type="text"
                value={editingItem.title}
                onChange={(e) => setEditingItem(prev => prev ? ({ ...prev, title: e.target.value }) : prev)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <Textarea
                value={editingItem.description || ''}
                onChange={(e) => setEditingItem(prev => prev ? ({ ...prev, description: e.target.value }) : prev)}
                rows={3}
              />
            </div>
            <div className="flex justify-end space-x-3">
              <Button variant="outline" type="button" onClick={() => setEditingItem(null)}>Cancel</Button>
              <Button type="submit">Save</Button>
            </div>
          </form>
        </Card>
      )}
      
      {/* Portfolio Items Grid */}
      {items.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <Card key={item.id} className="group relative overflow-hidden">
              <div className="aspect-video bg-gray-100 flex items-center justify-center">
                {item.fileType === 'image' ? (
                  <img 
                    src={item.fileUrl} 
                    alt={item.title} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="p-6 text-center">
                    <div className="mx-auto w-12 h-12 text-gray-400 mb-2">
                      {getFileIcon(item.fileType)}
                    </div>
                    <p className="text-sm font-medium truncate">{item.title}</p>
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-medium">{item.title}</h3>
                {item.description && (
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                    {item.description}
                  </p>
                )}
                <div className="mt-3 flex justify-between items-center text-sm text-gray-500 flex-wrap gap-2">
                  <span className="capitalize">{item.fileType || 'file'}</span>
                  <span>{formatFileSize(item.fileSize)}</span>
                </div>
              </div>
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="w-8 h-8 rounded-full"
                  onClick={() => handleOpenEdit(item)}
                  title="Edit"
                >
                  <FileText className="w-4 h-4" />
                </Button>
                <Button
                  variant="destructive"
                  size="icon"
                  className="w-8 h-8 rounded-full"
                  onClick={() => handleDelete(item.id, (item as any).storagePath)}
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <div className="mx-auto w-12 h-12 text-gray-400 mb-4">
            <ImageIcon className="w-full h-full" />
          </div>
          <h3 className="text-lg font-medium text-gray-900">No portfolio items yet</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by uploading your first work sample.
          </p>
        </div>
      )}
    </div>
  );
};

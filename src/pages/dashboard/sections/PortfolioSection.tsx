import { useState, useEffect, useRef } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/integrations/firebase/client';
import { addPortfolio, onPortfoliosByProfile, deletePortfolioWithStorage, updatePortfolio as svcUpdatePortfolio } from '@/integrations/firebase/services';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Upload, X, Image as ImageIcon, Video, FileText, Loader2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';
import { PortfolioItem } from '@/types';

interface PortfolioSectionProps {
  userId: string;
  initialFileType?: 'image' | 'video' | 'pdf';
  showFormInitially?: boolean;
  onFormStateChange?: (isOpen: boolean) => void;
}

const PortfolioSection = ({ userId, initialFileType, showFormInitially = false, onFormStateChange }: PortfolioSectionProps) => {
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showAddForm, setShowAddForm] = useState(showFormInitially);
  
  const [newItem, setNewItem] = useState({
    title: '',
    description: '',
    file: null as File | null,
    fileType: (initialFileType || 'image') as 'image' | 'video' | 'pdf'
  });

  // Track if we should notify parent (prevent loops)
  const shouldNotifyRef = useRef(false);
  const prevShowFormInitiallyRef = useRef(showFormInitially);

  // Update form visibility when prop changes (only if different from current state)
  useEffect(() => {
    if (showFormInitially !== prevShowFormInitiallyRef.current) {
      prevShowFormInitiallyRef.current = showFormInitially;
      if (showFormInitially !== showAddForm) {
        shouldNotifyRef.current = false; // Don't notify when prop changes
        setShowAddForm(showFormInitially);
      }
    }
  }, [showFormInitially, showAddForm]);

  // Update file type when prop changes
  useEffect(() => {
    if (initialFileType && initialFileType !== newItem.fileType) {
      setNewItem(prev => ({
        ...prev,
        fileType: initialFileType
      }));
    }
  }, [initialFileType]);

  // Notify parent only when form state changes due to user action (not prop)
  useEffect(() => {
    if (shouldNotifyRef.current && onFormStateChange) {
      onFormStateChange(showAddForm);
      shouldNotifyRef.current = false; // Reset after notifying
    }
  }, [showAddForm, onFormStateChange]);

  const [editingItem, setEditingItem] = useState<null | { id: string; title: string; description?: string }>(null);

  // Load portfolio items
  useEffect(() => {
    if (!userId) {
      setPortfolioItems([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const unsub = onPortfoliosByProfile(userId, (items) => {
        try {
          const mapped = items.map((d: any) => ({
            id: d.id,
            userId: d.profileId ?? d.userId ?? userId,
            title: d.title || '',
            description: d.description || '',
            fileUrl: d.fileUrl || d.imageUrl || '',
            fileType: d.fileType || 'image',
            fileName: d.fileName || d.title || 'file',
            fileSize: d.fileSize || 0,
            createdAt: d.createdAt ? (d.createdAt.toDate ? d.createdAt.toDate() : new Date(d.createdAt)) : new Date(),
            storagePath: d.storagePath
          })) as PortfolioItem[];
          setPortfolioItems(mapped);
          setIsLoading(false);
        } catch (error) {
          console.error('Error mapping portfolio items:', error);
          setIsLoading(false);
        }
      });

      return () => {
        if (unsub) unsub();
      };
    } catch (error) {
      console.error('Error setting up portfolio listener:', error);
      toast.error('Failed to load portfolio items');
      setIsLoading(false);
    }
  }, [userId]);

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size based on type
      const maxSize = file.type.startsWith('video/') ? 100 * 1024 * 1024 : 10 * 1024 * 1024; // 100MB for videos, 10MB for others
      if (file.size > maxSize) {
        toast.error(`File size exceeds the maximum allowed size (${maxSize / (1024 * 1024)}MB)`);
        return;
      }
      
      setNewItem(prev => ({
        ...prev,
        file,
        fileType: getFileType(file.type) as 'image' | 'video' | 'pdf'
      }));
    }
  };

  const handleOpenEdit = (item: PortfolioItem) => {
    setEditingItem({ id: item.id, title: item.title, description: item.description });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    try {
      await svcUpdatePortfolio(editingItem.id, { title: editingItem.title, description: editingItem.description });
      setEditingItem(null);
    } catch (error) {
      console.error('Error updating portfolio item:', error);
    }
  };

  // Determine file type from MIME type
  const getFileType = (mimeType: string): string => {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType === 'application/pdf') return 'pdf';
    return 'other';
  };

  // Upload file to Firebase Storage
  const uploadFile = async (file: File, path: string): Promise<string> => {
    const storageRef = ref(storage, path);
    const uploadTask = uploadBytes(storageRef, file);
    
    // Simulate progress (in a real app, you'd use the actual upload progress)
    const interval = setInterval(() => {
      setUploadProgress(prev => Math.min(prev + 10, 90));
    }, 200);
    
    try {
      const snapshot = await uploadTask;
      clearInterval(interval);
      setUploadProgress(100);
      const downloadURL = await getDownloadURL(snapshot.ref);
      return downloadURL;
    } catch (error) {
      clearInterval(interval);
      throw error;
    }
  };

  // Add new portfolio item
  const handleAddPortfolioItem = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newItem.file || !newItem.title.trim()) {
      toast.error('Please provide a title and select a file');
      return;
    }
    
    if (!userId) {
      toast.error('User not authenticated');
      return;
    }
    
    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      // Upload file to storage
      const fileExt = newItem.file.name.split('.').pop();
      const fileName = `${uuidv4()}.${fileExt}`;
      const filePath = `portfolio/${userId}/${fileName}`;
      
      const fileUrl = await uploadFile(newItem.file, filePath);

      // Persist metadata via service (realtime listener will update UI)
      // Store all fields for compatibility with both old and new formats
      // Remove undefined values as Firebase doesn't allow them
      const portfolioData: any = {
        profileId: userId,
        title: newItem.title.trim(),
        fileUrl: fileUrl, // Always store fileUrl for new format
        fileType: newItem.fileType,
        fileName: newItem.file.name,
        fileSize: newItem.file.size,
        storagePath: filePath
      };
      
      // Only add description if it's not empty (Firebase doesn't allow undefined)
      const trimmedDescription = newItem.description.trim();
      if (trimmedDescription) {
        portfolioData.description = trimmedDescription;
      }
      
      // Also store imageUrl/projectUrl for Portfolio interface compatibility
      if (newItem.fileType === 'image') {
        portfolioData.imageUrl = fileUrl;
      } else {
        portfolioData.projectUrl = fileUrl;
      }
      
      // Store all metadata (undefined values are already filtered out)
      await addPortfolio(portfolioData as any);
      
      toast.success('Portfolio item added successfully!');
      
      // Reset form
      setNewItem({
        title: '',
        description: '',
        file: null,
        fileType: initialFileType || 'image'
      });
      shouldNotifyRef.current = true; // Mark that we should notify parent
      setShowAddForm(false);
      
    } catch (error) {
      console.error('Error adding portfolio item:', error);
      toast.error('Failed to add portfolio item. Please try again.');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // Delete portfolio item
  const handleDeletePortfolioItem = async (itemId: string, storagePath?: string) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    
    try {
      // Use service to delete storage object (if any) and document
      await deletePortfolioWithStorage(itemId, storagePath);
      // optimistic UI update; realtime listener will keep state in sync
      setPortfolioItems(prev => prev.filter(item => item.id !== itemId));
    } catch (error) {
      console.error('Error deleting portfolio item:', error);
    }
  };

  // Get file icon based on file type
  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'image':
        return <ImageIcon className="w-5 h-5" />;
      case 'video':
        return <Video className="w-5 h-5" />;
      case 'pdf':
        return <FileText className="w-5 h-5" />;
      default:
        return <FileText className="w-5 h-5" />;
    }
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading portfolio items...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">My Portfolio</h2>
          <p className="mt-1 text-sm text-gray-600">
            Showcase your best work to potential employers and collaborators
          </p>
        </div>
        <Button onClick={() => setShowAddForm(true)} disabled={isUploading}>
          <Upload className="w-4 h-4 mr-2" />
          Add Portfolio Item
        </Button>
      </div>

      {/* Add Portfolio Item Form */}
      {(showAddForm || isUploading) && (
        <Card className="p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium">Add New Portfolio Item</h3>
            <button
              onClick={() => {
                shouldNotifyRef.current = true; // Mark that we should notify parent
                setShowAddForm(false);
                setNewItem({
                  title: '',
                  description: '',
                  file: null,
                  fileType: initialFileType || 'image'
                });
              }}
              className="text-gray-400 hover:text-gray-500"
              disabled={isUploading}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <form onSubmit={handleAddPortfolioItem} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                value={newItem.title}
                onChange={(e) => setNewItem(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Project title"
                required
                disabled={isUploading}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <Textarea
                value={newItem.description}
                onChange={(e) => setNewItem(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of the project"
                rows={3}
                disabled={isUploading}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                File <span className="text-red-500">*</span>
              </label>
              
              {!newItem.file ? (
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full p-6 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                    <Upload className="w-8 h-8 mb-2 text-gray-400" />
                    <p className="text-sm text-gray-600">
                      <span className="font-medium text-blue-600 hover:text-blue-500">
                        Click to upload
                      </span>{' '}
                      or drag and drop
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {newItem.fileType === 'image' 
                        ? 'Images only (max 10MB) - JPG, PNG, GIF, WebP'
                        : newItem.fileType === 'video'
                        ? 'Videos only (max 100MB) - MP4, WebM, MOV'
                        : newItem.fileType === 'pdf'
                        ? 'PDF files only (max 10MB)'
                        : 'Images, videos, or PDFs (max 10MB for images/PDFs, 100MB for videos)'}
                    </p>
                    <input
                      type="file"
                      className="hidden"
                      onChange={handleFileChange}
                      accept={
                        newItem.fileType === 'image' 
                          ? 'image/jpeg,image/jpg,image/png,image/gif,image/webp' 
                          : newItem.fileType === 'video' 
                          ? 'video/mp4,video/webm,video/quicktime,video/x-msvideo' 
                          : newItem.fileType === 'pdf'
                          ? '.pdf'
                          : 'image/jpeg,image/jpg,image/png,image/gif,image/webp,video/mp4,video/webm,video/quicktime,.pdf'
                      }
                      disabled={isUploading}
                    />
                  </label>
                </div>
              ) : (
                <div className="p-3 border border-gray-200 rounded-lg bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        {getFileIcon(getFileType(newItem.file.type))}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 truncate max-w-xs">
                          {newItem.file.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatFileSize(newItem.file.size)}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setNewItem(prev => ({ ...prev, file: null }))}
                      className="p-1 text-gray-400 hover:text-gray-500"
                      disabled={isUploading}
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  
                  {isUploading && (
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Uploading...</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <Progress value={uploadProgress} className="h-2" />
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div className="flex justify-end space-x-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  shouldNotifyRef.current = true; // Mark that we should notify parent
                  setShowAddForm(false);
                  setNewItem({
                    title: '',
                    description: '',
                    file: null,
                    fileType: initialFileType || 'image'
                  });
                }}
                disabled={isUploading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!newItem.title || !newItem.file || isUploading}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  'Add to Portfolio'
                )}
              </Button>
            </div>
          </form>
        </Card>
      )}
      {editingItem && (
        <Card className="p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium">Edit Portfolio Item</h3>
            <button
              onClick={() => setEditingItem(null)}
              className="text-gray-400 hover:text-gray-500"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <Input
                type="text"
                value={editingItem.title}
                onChange={(e) => setEditingItem(prev => prev ? ({ ...prev, title: e.target.value }) : prev)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <Textarea
                value={editingItem.description}
                onChange={(e) => setEditingItem(prev => prev ? ({ ...prev, description: e.target.value }) : prev)}
                rows={3}
              />
            </div>
            <div className="flex justify-end space-x-3 pt-2">
              <Button variant="outline" type="button" onClick={() => setEditingItem(null)}>Cancel</Button>
              <Button type="submit">Save</Button>
            </div>
          </form>
        </Card>
      )}

      {/* Portfolio Items Grid */}
      {portfolioItems.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {portfolioItems.map((item) => (
            <Card key={item.id} className="overflow-hidden">
              <div className="relative h-48 bg-gray-100 group">
                {item.fileType === 'image' ? (
                  <img
                    src={item.fileUrl}
                    alt={item.title}
                    className="object-cover w-full h-full"
                    onError={(e) => {
                      // Fallback if image fails to load
                      (e.target as HTMLImageElement).style.display = 'none';
                      (e.target as HTMLImageElement).parentElement!.innerHTML = `
                        <div class="flex flex-col items-center justify-center h-full p-6 text-center">
                          <svg class="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                          </svg>
                          <p class="mt-2 text-sm font-medium text-gray-700">Image</p>
                        </div>
                      `;
                    }}
                  />
                ) : item.fileType === 'video' ? (
                  <div className="relative w-full h-full bg-gray-900 flex items-center justify-center overflow-hidden">
                    <video
                      src={item.fileUrl}
                      className="w-full h-full object-contain"
                      controls
                      preload="metadata"
                      playsInline
                      onMouseEnter={(e) => {
                        // Ensure controls are visible on hover
                        (e.target as HTMLVideoElement).controls = true;
                      }}
                    />
                    <div className="absolute top-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-xs font-medium flex items-center gap-1">
                      <Video className="w-3 h-3" />
                      Video
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                    <FileText className="w-12 h-12 text-gray-400" />
                    <p className="mt-2 text-sm font-medium text-gray-700">
                      {item.fileName}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(item.fileSize)}
                    </p>
                  </div>
                )}
                
                <button
                  onClick={() => handleDeletePortfolioItem(item.id, (item as any).storagePath)}
                  className="absolute top-2 right-2 p-1.5 bg-white rounded-full shadow-md text-red-500 hover:bg-red-50"
                  title="Delete item"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <div className="p-4">
                <h3 className="text-lg font-medium text-gray-900 truncate">
                  {item.title}
                </h3>
                {item.description && (
                  <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                    {item.description}
                  </p>
                )}
                
                <div className="flex items-center justify-between mt-3">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {item.fileType.toUpperCase()}
                  </span>
                  
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                    >
                      <a 
                        href={item.fileUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm"
                      >
                        View
                      </a>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                    >
                      <a 
                        href={item.fileUrl} 
                        download
                        className="text-sm"
                      >
                        Download
                      </a>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenEdit(item)}
                    >
                      Edit
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
          <div className="flex justify-center">
            <div className="p-3 bg-blue-100 rounded-full">
              <Upload className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No portfolio items yet</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by uploading your first portfolio item.
          </p>
          <div className="mt-6">
            <Button 
              onClick={() => setShowAddForm(true)}
              disabled={isUploading}
            >
              <Upload className="w-4 h-4 mr-2" />
              Add Portfolio Item
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PortfolioSection;

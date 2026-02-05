import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  getShortlistByRecruiter,
  removeFromShortlist,
  addToShortlist,
  getProfile
} from '@/integrations/firebase/services';
import { Shortlist, UserProfile, EnhancedShortlist } from '@/integrations/firebase/types';
import {
  Users,
  UserMinus,
  Calendar,
  MapPin,
  Briefcase,
  GraduationCap,
  Award,
  MessageSquare,
  Trash2,
  Plus,
  FolderPlus,
  GitCompare,
  Share2,
  Download,
  FileSpreadsheet,
  FileText,
  Tag,
  X,
  Eye,
  Star,
  Search,
  Filter,
  Folder,
  Mail
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface ShortlistedCandidate extends EnhancedShortlist {
  profile?: UserProfile;
}

interface ShortlistCollection {
  id: string;
  name: string;
  description?: string;
  color: string;
  candidateIds: string[];
  createdAt: Date;
}

export const EnhancedShortlistManagement: React.FC = () => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [shortlist, setShortlist] = useState<ShortlistedCandidate[]>([]);
  const [collections, setCollections] = useState<ShortlistCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCollection, setSelectedCollection] = useState<string>('all');
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([]);
  const [showCollectionDialog, setShowCollectionDialog] = useState(false);
  const [showCompareDialog, setShowCompareDialog] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [newCollectionDescription, setNewCollectionDescription] = useState('');
  const [newCollectionColor, setNewCollectionColor] = useState('#3b82f6');

  useEffect(() => {
    loadShortlist();
    loadCollections();
  }, [currentUser]);

  const loadShortlist = async () => {
    if (!currentUser?.uid) return;

    try {
      setLoading(true);
      const shortlistData = await getShortlistByRecruiter(currentUser.uid);

      // Load profiles for each shortlisted candidate
      const shortlistWithProfiles = await Promise.all(
        shortlistData.map(async (item) => {
          try {
            const profile = await getProfile(item.youthId);
            return {
              ...item,
              profile: profile || undefined
            };
          } catch (error) {
            console.error(`Error loading profile for ${item.youthId}:`, error);
            return {
              ...item,
              profile: undefined
            };
          }
        })
      );

      setShortlist(shortlistWithProfiles);
    } catch (error) {
      console.error('Error loading shortlist:', error);
      toast({
        title: t('error'),
        description: 'Failed to load shortlist. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadCollections = () => {
    // In production, would fetch from Firebase
    const mockCollections: ShortlistCollection[] = [];
    setCollections(mockCollections);
  };

  const handleRemoveFromShortlist = async (shortlistId: string) => {
    try {
      await removeFromShortlist(shortlistId);
      setShortlist(prev => prev.filter(item => item.id !== shortlistId));
      toast({
        title: t('success'),
        description: 'Removed from shortlist successfully'
      });
    } catch (error) {
      console.error('Error removing from shortlist:', error);
      toast({
        title: t('error'),
        description: 'Failed to remove from shortlist. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const handleCreateCollection = () => {
    if (!newCollectionName.trim()) {
      toast({
        title: t('error'),
        description: 'Please enter a collection name',
        variant: 'destructive'
      });
      return;
    }

    const newCollection: ShortlistCollection = {
      id: Date.now().toString(),
      name: newCollectionName,
      description: newCollectionDescription,
      color: newCollectionColor,
      candidateIds: [],
      createdAt: new Date()
    };

    setCollections(prev => [...prev, newCollection]);
    setNewCollectionName('');
    setNewCollectionDescription('');
    setNewCollectionColor('#3b82f6');
    setShowCollectionDialog(false);

    toast({
      title: t('success'),
      description: 'Collection created successfully'
    });
  };

  const handleAddToCollection = (candidateId: string, collectionId: string) => {
    setCollections(prev =>
      prev.map(collection =>
        collection.id === collectionId
          ? {
              ...collection,
              candidateIds: collection.candidateIds.includes(candidateId)
                ? collection.candidateIds
                : [...collection.candidateIds, candidateId]
            }
          : collection
      )
    );

    toast({
      title: t('success'),
      description: 'Added to collection successfully'
    });
  };

  const handleCompareCandidates = () => {
    if (selectedCandidates.length < 2) {
      toast({
        title: t('error'),
        description: 'Please select at least two candidates to compare',
        variant: 'destructive'
      });
      return;
    }
    if (selectedCandidates.length > 5) {
      toast({
        title: t('error'),
        description: 'Please select a maximum of five candidates to compare',
        variant: 'destructive'
      });
      return;
    }
    setShowCompareDialog(true);
  };

  const handleExportShortlist = (format: 'csv' | 'excel') => {
    const data = shortlist.map(item => ({
      Name: item.profile?.fullName || 'Unknown',
      Email: item.profile?.email || '',
      Location: `${item.profile?.city || ''}, ${item.profile?.country || ''}`,
      Experience: item.profile?.yearsOfExperience || 0,
      Education: item.profile?.educationLevel || '',
      Notes: item.notes || '',
      Tags: item.tags?.join(', ') || '',
      Added: item.createdAt.toLocaleDateString()
    }));

    // In production, would use a library like xlsx or papaparse
    console.log('Export data:', data);
    toast({
      title: t('success'),
      description: 'Export started. You will receive a notification when it\'s ready.'
    });
  };

  const handleBulkMessage = () => {
    if (selectedCandidates.length === 0) {
      toast({
        title: t('error'),
        description: 'Please select at least one candidate to message',
        variant: 'destructive'
      });
      return;
    }
    navigate(`/recruiter/messages?bulk=${selectedCandidates.join(',')}`);
  };

  const toggleCandidateSelection = (candidateId: string) => {
    setSelectedCandidates(prev =>
      prev.includes(candidateId)
        ? prev.filter(id => id !== candidateId)
        : [...prev, candidateId]
    );
  };

  const filteredShortlist = shortlist.filter(item => {
    const matchesSearch = searchTerm === '' ||
      item.profile?.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.profile?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.notes?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCollection = selectedCollection === 'all' ||
      collections.find(c => c.id === selectedCollection)?.candidateIds.includes(item.id);

    return matchesSearch && matchesCollection;
  });

  const candidatesToCompare = shortlist.filter(item =>
    selectedCandidates.includes(item.id)
  );

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2">{t('loading')}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Shortlist</h2>
          <p className="text-muted-foreground">Manage shortlisted candidates</p>
        </div>
        <div className="flex items-center gap-2">
          {selectedCandidates.length > 0 && (
            <>
              <Button variant="outline" onClick={handleCompareCandidates}>
                <GitCompare className="h-4 w-4 mr-2" />
                Compare ({selectedCandidates.length})
              </Button>
              <Button variant="outline" onClick={handleBulkMessage}>
                <Mail className="h-4 w-4 mr-2" />
                Bulk Message
              </Button>
            </>
          )}
          <Button variant="outline" onClick={() => setShowCollectionDialog(true)}>
            <FolderPlus className="h-4 w-4 mr-2" />
            New Collection
          </Button>
          <Button variant="outline" onClick={() => handleExportShortlist('csv')}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search candidates..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={selectedCollection} onValueChange={setSelectedCollection}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Candidates</SelectItem>
                {collections.map(collection => (
                  <SelectItem key={collection.id} value={collection.id}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: collection.color }}
                      />
                      {collection.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Collections */}
      {collections.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {collections.map(collection => (
            <Badge
              key={collection.id}
              variant="secondary"
              className="cursor-pointer gap-2"
              style={{ borderColor: collection.color }}
              onClick={() => setSelectedCollection(collection.id)}
            >
              <Folder className="h-3 w-3" style={{ color: collection.color }} />
              {collection.name} ({collection.candidateIds.length})
            </Badge>
          ))}
        </div>
      )}

      {/* Shortlist */}
      {filteredShortlist.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Shortlisted Candidates</h3>
            <p className="text-muted-foreground mb-4">Start shortlisting candidates to see them here</p>
            <Button variant="outline" onClick={() => navigate('/recruiter/find-talent')}>
              <Plus className="w-4 h-4 mr-2" />
              Browse Candidates
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredShortlist.map((candidate) => (
            <Card
              key={candidate.id}
              className={`hover:shadow-md transition-shadow ${
                selectedCandidates.includes(candidate.id) ? 'ring-2 ring-primary' : ''
              }`}
            >
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="relative">
                      <Checkbox
                        checked={selectedCandidates.includes(candidate.id)}
                        onCheckedChange={() => toggleCandidateSelection(candidate.id)}
                        className="absolute -top-2 -left-2 z-10"
                      />
                      <Avatar className="w-16 h-16">
                        <AvatarImage src={candidate.profile?.profileImageUrl} />
                        <AvatarFallback className="text-lg">
                          {candidate.profile?.fullName?.[0]?.toUpperCase() || 'C'}
                        </AvatarFallback>
                      </Avatar>
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-xl font-semibold">{candidate.profile?.fullName || 'Unknown'}</h3>
                        <Badge variant="secondary" className="text-xs">
                          Shortlisted
                        </Badge>
                        {candidate.rating && (
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                            <span className="text-sm">{candidate.rating}</span>
                          </div>
                        )}
                      </div>

                      <div className="text-sm text-muted-foreground space-y-1 mb-3">
                        {candidate.profile?.city && candidate.profile?.country && (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            <span>{candidate.profile.city}, {candidate.profile.country}</span>
                          </div>
                        )}
                        {candidate.profile?.yearsOfExperience !== undefined && (
                          <div className="flex items-center gap-1">
                            <Briefcase className="w-4 h-4" />
                            <span>{candidate.profile.yearsOfExperience} {candidate.profile.yearsOfExperience === 1 ? 'Year' : 'Years'} Experience</span>
                          </div>
                        )}
                        {candidate.profile?.educationLevel && (
                          <div className="flex items-center gap-1">
                            <GraduationCap className="w-4 h-4" />
                            <span>{candidate.profile.educationLevel}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>Added {formatDistanceToNow(candidate.createdAt, { addSuffix: true })}</span>
                        </div>
                      </div>

                      {candidate.tags && candidate.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-2">
                          {candidate.tags.map((tag, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              <Tag className="h-3 w-3 mr-1" />
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {candidate.notes && (
                        <p className="text-sm mt-2 p-2 bg-muted rounded">
                          <strong>Notes:</strong> {candidate.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/recruiter/candidates/${candidate.youthId}`)}
                      className="w-full lg:w-auto"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Profile
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/recruiter/interviews/new?candidateId=${candidate.youthId}`)}
                      className="w-full lg:w-auto"
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      Schedule Interview
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/recruiter/messages?userId=${candidate.youthId}`)}
                      className="w-full lg:w-auto"
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Message
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemoveFromShortlist(candidate.id)}
                      className="w-full lg:w-auto text-red-600 hover:text-red-700"
                    >
                      <UserMinus className="h-4 w-4 mr-2" />
                      Remove
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Collection Dialog */}
      <Dialog open={showCollectionDialog} onOpenChange={setShowCollectionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Collection</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="collectionName">Collection Name *</Label>
              <Input
                id="collectionName"
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
                placeholder="Enter collection name"
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="collectionDescription">Description</Label>
              <Textarea
                id="collectionDescription"
                value={newCollectionDescription}
                onChange={(e) => setNewCollectionDescription(e.target.value)}
                placeholder="Enter description"
                rows={3}
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="collectionColor">Color</Label>
              <Input
                id="collectionColor"
                type="color"
                value={newCollectionColor}
                onChange={(e) => setNewCollectionColor(e.target.value)}
                className="mt-2 h-10"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreateCollection} className="flex-1">
                Create
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowCollectionDialog(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Compare Candidates Dialog */}
      <Dialog open={showCompareDialog} onOpenChange={setShowCompareDialog}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Compare Candidates</DialogTitle>
          </DialogHeader>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Criteria</th>
                  {candidatesToCompare.map(candidate => (
                    <th key={candidate.id} className="text-left p-2">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={candidate.profile?.profileImageUrl} />
                          <AvatarFallback>
                            {candidate.profile?.fullName?.[0]?.toUpperCase() || 'C'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-semibold">{candidate.profile?.fullName || 'Unknown'}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="p-2 font-medium">Location</td>
                  {candidatesToCompare.map(candidate => (
                    <td key={candidate.id} className="p-2">
                      {candidate.profile?.city}, {candidate.profile?.country}
                    </td>
                  ))}
                </tr>
                <tr className="border-b">
                  <td className="p-2 font-medium">Experience</td>
                  {candidatesToCompare.map(candidate => (
                    <td key={candidate.id} className="p-2">
                      {candidate.profile?.yearsOfExperience || 0} {candidate.profile?.yearsOfExperience === 1 ? 'Year' : 'Years'}
                    </td>
                  ))}
                </tr>
                <tr className="border-b">
                  <td className="p-2 font-medium">Education</td>
                  {candidatesToCompare.map(candidate => (
                    <td key={candidate.id} className="p-2">
                      {candidate.profile?.educationLevel || 'N/A'}
                    </td>
                  ))}
                </tr>
                <tr className="border-b">
                  <td className="p-2 font-medium">Rating</td>
                  {candidatesToCompare.map(candidate => (
                    <td key={candidate.id} className="p-2">
                      {candidate.rating ? (
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                          <span>{candidate.rating}</span>
                        </div>
                      ) : (
                        'N/A'
                      )}
                    </td>
                  ))}
                </tr>
                <tr className="border-b">
                  <td className="p-2 font-medium">Notes</td>
                  {candidatesToCompare.map(candidate => (
                    <td key={candidate.id} className="p-2">
                      {candidate.notes || 'No notes'}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};


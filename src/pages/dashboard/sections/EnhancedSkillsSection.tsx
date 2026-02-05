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
import { 
  Plus, 
  X, 
  Edit2, 
  Trash2, 
  CheckCircle2, 
  Loader2,
  Sparkles,
  ArrowUpDown,
  Save
} from 'lucide-react';
import {
  getYouthSkills,
  addYouthSkill,
  updateYouthSkill,
  deleteYouthSkill,
  subscribeToYouthSkills,
  type YouthSkill
} from '@/integrations/firebase/youthSkillsService';

const PROFICIENCY_LEVELS: Array<'Beginner' | 'Intermediate' | 'Advanced' | 'Expert'> = [
  'Beginner',
  'Intermediate',
  'Advanced',
  'Expert'
];

const PROFICIENCY_ORDER = {
  'Beginner': 1,
  'Intermediate': 2,
  'Advanced': 3,
  'Expert': 4
};

const EnhancedSkillsSection = () => {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [skills, setSkills] = useState<YouthSkill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSkill, setEditingSkill] = useState<YouthSkill | null>(null);
  const [deletingSkill, setDeletingSkill] = useState<YouthSkill | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'proficiency'>('proficiency');
  
  const [newSkill, setNewSkill] = useState({
    skillName: '',
    proficiencyLevel: 'Intermediate' as YouthSkill['proficiencyLevel'],
    description: ''
  });

  // Real-time subscription to skills
  useEffect(() => {
    if (!currentUser) {
      setSkills([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    
    // Set up real-time listener
    const unsubscribe = subscribeToYouthSkills(currentUser.uid, (updatedSkills) => {
      setSkills(updatedSkills);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Auto-save indicator timeout
  useEffect(() => {
    if (saveStatus === 'saved') {
      const timer = setTimeout(() => setSaveStatus('idle'), 2000);
      return () => clearTimeout(timer);
    }
  }, [saveStatus]);

  // Sort skills
  const sortedSkills = [...skills].sort((a, b) => {
    if (sortBy === 'proficiency') {
      return PROFICIENCY_ORDER[b.proficiencyLevel] - PROFICIENCY_ORDER[a.proficiencyLevel];
    }
    return a.skillName.localeCompare(b.skillName);
  });

  // Add new skill
  const handleAddSkill = async () => {
    if (!currentUser || !newSkill.skillName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a skill name",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    setSaveStatus('saving');

    try {
      await addYouthSkill(currentUser.uid, {
        skillName: newSkill.skillName.trim(),
        proficiencyLevel: newSkill.proficiencyLevel,
        description: newSkill.description.trim() || undefined,
      });

      toast({
        title: "Success",
        description: "Skill added successfully",
      });

      setNewSkill({ skillName: '', proficiencyLevel: 'Intermediate', description: '' });
      setShowAddModal(false);
      setSaveStatus('saved');
    } catch (error) {
      console.error('Error adding skill:', error);
      toast({
        title: "Error",
        description: "Failed to add skill. Please try again.",
        variant: "destructive",
      });
      setSaveStatus('idle');
    } finally {
      setIsSaving(false);
    }
  };

  // Update skill
  const handleUpdateSkill = async (skill: YouthSkill, updates: Partial<YouthSkill>) => {
    if (!currentUser) return;

    setIsSaving(true);
    setSaveStatus('saving');

    try {
      await updateYouthSkill(currentUser.uid, skill.id, updates);
      setEditingSkill(null);
      setSaveStatus('saved');
      toast({
        title: "Success",
        description: "Skill updated successfully",
      });
    } catch (error) {
      console.error('Error updating skill:', error);
      toast({
        title: "Error",
        description: "Failed to update skill. Please try again.",
        variant: "destructive",
      });
      setSaveStatus('idle');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete skill
  const handleDeleteSkill = async () => {
    if (!currentUser || !deletingSkill) return;

    setIsSaving(true);
    setSaveStatus('saving');

    try {
      await deleteYouthSkill(currentUser.uid, deletingSkill.id);
      setDeletingSkill(null);
      setSaveStatus('saved');
      toast({
        title: "Success",
        description: "Skill deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting skill:', error);
      toast({
        title: "Error",
        description: "Failed to delete skill. Please try again.",
        variant: "destructive",
      });
      setSaveStatus('idle');
    } finally {
      setIsSaving(false);
    }
  };

  // Get proficiency badge variant
  const getProficiencyBadge = (level: YouthSkill['proficiencyLevel']) => {
    switch (level) {
      case 'Beginner':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Beginner</Badge>;
      case 'Intermediate':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Intermediate</Badge>;
      case 'Advanced':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Advanced</Badge>;
      case 'Expert':
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Expert</Badge>;
    }
  };

  // Get proficiency progress
  const getProficiencyProgress = (level: YouthSkill['proficiencyLevel']) => {
    switch (level) {
      case 'Beginner': return 25;
      case 'Intermediate': return 50;
      case 'Advanced': return 75;
      case 'Expert': return 100;
    }
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
          <h2 className="text-2xl font-bold">Skills</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your skills and proficiency levels. Changes are saved automatically.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Save Status Indicator */}
          {saveStatus !== 'idle' && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {saveStatus === 'saving' && (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Saving...</span>
                </>
              )}
              {saveStatus === 'saved' && (
                <>
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="text-green-600">Saved</span>
                </>
              )}
            </div>
          )}
          
          {/* Sort Button */}
          <Select value={sortBy} onValueChange={(value: 'name' | 'proficiency') => setSortBy(value)}>
            <SelectTrigger className="w-40">
              <ArrowUpDown className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="proficiency">Sort by Proficiency</SelectItem>
              <SelectItem value="name">Sort by Name</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Skill
          </Button>
        </div>
      </div>

      {/* Skills Grid */}
      {sortedSkills.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedSkills.map((skill) => (
            <Card key={skill.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{skill.skillName}</CardTitle>
                    <div className="mt-2">
                      {getProficiencyBadge(skill.proficiencyLevel)}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setEditingSkill(skill)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setDeletingSkill(skill)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {skill.description && (
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {skill.description}
                  </p>
                )}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Proficiency</span>
                    <span>{getProficiencyProgress(skill.proficiencyLevel)}%</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${getProficiencyProgress(skill.proficiencyLevel)}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Sparkles className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No skills yet</h3>
            <p className="text-sm text-muted-foreground text-center mb-4">
              Start building your skills profile to showcase your expertise
            </p>
            <Button onClick={() => setShowAddModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Skill
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Add Skill Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Skill</DialogTitle>
            <DialogDescription>
              Add a skill with its proficiency level. This will automatically sync to your Digital CV.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="skillName">Skill Name *</Label>
              <Input
                id="skillName"
                value={newSkill.skillName}
                onChange={(e) => setNewSkill(prev => ({ ...prev, skillName: e.target.value }))}
                placeholder="e.g., JavaScript, Python, Leadership"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newSkill.skillName.trim()) {
                    handleAddSkill();
                  }
                }}
              />
            </div>
            <div>
              <Label htmlFor="proficiency">Proficiency Level *</Label>
              <Select
                value={newSkill.proficiencyLevel}
                onValueChange={(value: YouthSkill['proficiencyLevel']) =>
                  setNewSkill(prev => ({ ...prev, proficiencyLevel: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROFICIENCY_LEVELS.map(level => (
                    <SelectItem key={level} value={level}>{level}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={newSkill.description}
                onChange={(e) => setNewSkill(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of your experience with this skill..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddSkill} disabled={!newSkill.skillName.trim() || isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Add Skill
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Skill Modal */}
      {editingSkill && (
        <Dialog open={!!editingSkill} onOpenChange={() => setEditingSkill(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Skill</DialogTitle>
              <DialogDescription>
                Update your skill details. Changes are saved automatically.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="editSkillName">Skill Name *</Label>
                <Input
                  id="editSkillName"
                  value={editingSkill.skillName}
                  onChange={(e) =>
                    setEditingSkill(prev => prev ? { ...prev, skillName: e.target.value } : null)
                  }
                />
              </div>
              <div>
                <Label htmlFor="editProficiency">Proficiency Level *</Label>
                <Select
                  value={editingSkill.proficiencyLevel}
                  onValueChange={(value: YouthSkill['proficiencyLevel']) =>
                    setEditingSkill(prev => prev ? { ...prev, proficiencyLevel: value } : null)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROFICIENCY_LEVELS.map(level => (
                      <SelectItem key={level} value={level}>{level}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="editDescription">Description (Optional)</Label>
                <Textarea
                  id="editDescription"
                  value={editingSkill.description || ''}
                  onChange={(e) =>
                    setEditingSkill(prev => prev ? { ...prev, description: e.target.value } : null)
                  }
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingSkill(null)}>
                Cancel
              </Button>
              <Button
                onClick={() => editingSkill && handleUpdateSkill(editingSkill, {
                  skillName: editingSkill.skillName,
                  proficiencyLevel: editingSkill.proficiencyLevel,
                  description: editingSkill.description || undefined,
                })}
                disabled={!editingSkill.skillName.trim() || isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Modal */}
      {deletingSkill && (
        <Dialog open={!!deletingSkill} onOpenChange={() => setDeletingSkill(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Skill</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete "{deletingSkill.skillName}"? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeletingSkill(null)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDeleteSkill} disabled={isSaving}>
                {isSaving ? (
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

export default EnhancedSkillsSection;

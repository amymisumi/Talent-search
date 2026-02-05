import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { createJobTemplate, getJobTemplates, updateJobTemplate, deleteJobTemplate } from '@/integrations/firebase/services';
import { JobTemplate } from '@/integrations/firebase/types';
import { Plus, Edit, Trash2, Copy, FileText } from 'lucide-react';

interface JobTemplatesProps {
  onSelectTemplate?: (template: JobTemplate) => void;
}

export const JobTemplates: React.FC<JobTemplatesProps> = ({ onSelectTemplate }) => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { currentUser } = useAuth();

  const [templates, setTemplates] = useState<JobTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<JobTemplate | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    title: '',
    description: '',
    requirements: '',
    experienceLevel: 'mid' as const,
    category: '',
  });

  useEffect(() => {
    loadTemplates();
  }, [currentUser]);

  const loadTemplates = async () => {
    if (!currentUser?.uid) return;

    try {
      setLoading(true);
      const templatesData = await getJobTemplates(currentUser.uid);
      setTemplates(templatesData);
    } catch (error) {
      console.error('Error loading templates:', error);
      toast({
        title: t('error'),
        description: t('failedToLoadTemplates'),
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      title: '',
      description: '',
      requirements: '',
      experienceLevel: 'mid',
      category: '',
    });
  };

  const handleCreateTemplate = async () => {
    if (!currentUser?.uid) return;

    try {
      const templateData = {
        ...formData,
        recruiterId: currentUser.uid,
      };

      await createJobTemplate(templateData);
      toast({
        title: t('success'),
        description: t('templateCreatedSuccessfully')
      });
      setIsCreateDialogOpen(false);
      resetForm();
      loadTemplates();
    } catch (error) {
      console.error('Error creating template:', error);
      toast({
        title: t('error'),
        description: t('failedToCreateTemplate'),
        variant: 'destructive'
      });
    }
  };

  const handleEditTemplate = async () => {
    if (!selectedTemplate) return;

    try {
      await updateJobTemplate(selectedTemplate.id, formData);
      toast({
        title: t('success'),
        description: t('templateUpdatedSuccessfully')
      });
      setIsEditDialogOpen(false);
      setSelectedTemplate(null);
      resetForm();
      loadTemplates();
    } catch (error) {
      console.error('Error updating template:', error);
      toast({
        title: t('error'),
        description: t('failedToUpdateTemplate'),
        variant: 'destructive'
      });
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    try {
      await deleteJobTemplate(templateId);
      toast({
        title: t('success'),
        description: t('templateDeletedSuccessfully')
      });
      loadTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      toast({
        title: t('error'),
        description: t('failedToDeleteTemplate'),
        variant: 'destructive'
      });
    }
  };

  const openEditDialog = (template: JobTemplate) => {
    setSelectedTemplate(template);
    setFormData({
      name: template.name,
      title: template.title,
      description: template.description,
      requirements: template.requirements,
      experienceLevel: template.experienceLevel,
      category: template.category,
    });
    setIsEditDialogOpen(true);
  };

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
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Job Templates</h2>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Create Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Job Template</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="template-name">Template Name</Label>
                <Input
                  id="template-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Software Developer Template"
                />
              </div>

              <div>
                <Label htmlFor="template-title">Job Title</Label>
                <Input
                  id="template-title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Senior Software Developer"
                />
              </div>

              <div>
                <Label htmlFor="template-category">Category</Label>
                <Input
                  id="template-category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="e.g. Technology"
                />
              </div>

              <div>
                <Label htmlFor="template-experience">Experience Level</Label>
                <Select value={formData.experienceLevel} onValueChange={(value: any) => setFormData({ ...formData, experienceLevel: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entry">Entry Level</SelectItem>
                    <SelectItem value="mid">Mid Level</SelectItem>
                    <SelectItem value="senior">Senior</SelectItem>
                    <SelectItem value="executive">Executive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="template-description">Job Description</Label>
                <Textarea
                  id="template-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe the role, responsibilities..."
                  rows={4}
                />
              </div>

              <div>
                <Label htmlFor="template-requirements">Requirements</Label>
                <Textarea
                  id="template-requirements"
                  value={formData.requirements}
                  onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                  placeholder="List required skills and qualifications..."
                  rows={4}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateTemplate}>
                  Create Template
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {templates.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="p-8 text-center">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No Templates Yet</h3>
              <p className="text-muted-foreground mb-4">Create your first job template to save time on future postings.</p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Template
              </Button>
            </CardContent>
          </Card>
        ) : (
          templates.map((template) => (
            <Card key={template.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onSelectTemplate?.(template)}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(template)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Template</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this template? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteTemplate(template.id)}>
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm font-medium mb-2">{template.title}</p>
                <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
                  {template.description}
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-secondary px-2 py-1 rounded">
                    {template.experienceLevel}
                  </span>
                  {template.category && (
                    <span className="text-xs bg-secondary px-2 py-1 rounded">
                      {template.category}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Edit Template Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Job Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-template-name">Template Name</Label>
              <Input
                id="edit-template-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="edit-template-title">Job Title</Label>
              <Input
                id="edit-template-title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="edit-template-category">Category</Label>
              <Input
                id="edit-template-category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="edit-template-experience">Experience Level</Label>
              <Select value={formData.experienceLevel} onValueChange={(value: any) => setFormData({ ...formData, experienceLevel: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="entry">Entry Level</SelectItem>
                  <SelectItem value="mid">Mid Level</SelectItem>
                  <SelectItem value="senior">Senior</SelectItem>
                  <SelectItem value="executive">Executive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="edit-template-description">Job Description</Label>
              <Textarea
                id="edit-template-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
              />
            </div>

            <div>
              <Label htmlFor="edit-template-requirements">Requirements</Label>
              <Textarea
                id="edit-template-requirements"
                value={formData.requirements}
                onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                rows={4}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleEditTemplate}>
                Update Template
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

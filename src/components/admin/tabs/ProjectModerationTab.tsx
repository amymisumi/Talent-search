import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../ui/dialog';
import { Eye, Star, Flag, CheckCircle, XCircle } from 'lucide-react';
import { getAllProjectsForAdmin, moderateProject, Portfolio } from '../../../integrations/firebase/adminServices';
import { useToast } from '../../../hooks/use-toast';
import { useAuth } from '../../../contexts/AuthContext';

export const ProjectModerationTab: React.FC = () => {
  const [projects, setProjects] = useState<Portfolio[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<Portfolio | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const { toast } = useToast();
  const { currentUser } = useAuth();

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const allProjects = await getAllProjectsForAdmin();
      setProjects(allProjects);
    } catch (error) {
      console.error("Error loading projects:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load projects"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleModerate = async (projectId: string, action: 'approve' | 'reject' | 'feature' | 'unfeature') => {
    if (!currentUser) return;
    try {
      await moderateProject(currentUser.uid, projectId, action);
      toast({
        title: "Success",
        description: `Project ${action} successfully`
      });
      loadProjects();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to moderate project"
      });
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading projects...</div>;
  }

  return (
    <div className="space-y-6">
      <Card className="border-0 bg-slate-700/50 backdrop-blur-xl shadow-xl border-slate-600/50">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
            <Briefcase className="h-6 w-6 text-orange-400" />
            Portfolio & Project Moderation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                    <TableHead className="text-slate-300">Title</TableHead>
                      <TableHead className="text-slate-300">User</TableHead>
                      <TableHead className="text-slate-300">Status</TableHead>
                      <TableHead className="text-slate-300">Featured</TableHead>
                      <TableHead className="text-slate-300">Created</TableHead>
                      <TableHead className="text-slate-300">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                    {projects.map((project) => (
                      <TableRow key={project.id} className="border-slate-700 hover:bg-slate-700/50">
                        <TableCell className="font-medium text-white">{project.title}</TableCell>
                        <TableCell className="text-slate-300">{project.profileId}</TableCell>
                    <TableCell>
                      <Badge variant={project.isFlagged ? 'destructive' : 'default'}>
                        {project.isFlagged ? 'Flagged' : 'Active'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {project.isFeatured ? (
                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      {project.createdAt ? new Date(project.createdAt).toLocaleDateString() : 'N/A'}
                    </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border-blue-500/30"
                              onClick={() => {
                                setSelectedProject(project);
                                setShowDetails(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {!project.isFeatured && (
                              <Button
                                size="sm"
                                className="bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-300 border-yellow-500/30"
                                onClick={() => handleModerate(project.id, 'feature')}
                              >
                                <Star className="h-4 w-4" />
                              </Button>
                            )}
                            {project.isFeatured && (
                              <Button
                                size="sm"
                                className="bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-300 border-yellow-500/30"
                                onClick={() => handleModerate(project.id, 'unfeature')}
                              >
                                <Star className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              size="sm"
                              className="bg-red-600/20 hover:bg-red-600/30 text-red-300 border-red-500/30"
                              onClick={() => handleModerate(project.id, 'reject')}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
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
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white text-xl font-bold">Project Details</DialogTitle>
          </DialogHeader>
          {selectedProject && (
            <div className="space-y-4">
              <div>
                <strong className="text-slate-300">Title:</strong>
                <p className="text-white mt-1">{selectedProject.title}</p>
              </div>
              <div>
                <strong className="text-slate-300">Description:</strong>
                <p className="text-white mt-1">{selectedProject.description || 'N/A'}</p>
              </div>
              {selectedProject.imageUrl && (
                <div>
                  <img src={selectedProject.imageUrl} alt={selectedProject.title} className="max-w-full h-auto rounded-lg border border-slate-700" />
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};


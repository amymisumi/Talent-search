import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Badge } from '../../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Textarea } from '../../ui/textarea';
import { Label } from '../../ui/label';
import {
  Search,
  Filter,
  Eye,
  CheckCircle,
  XCircle,
  UserX,
  Trash2,
  Key,
  FileText,
  Users,
  Building
} from 'lucide-react';
import {
  getAllUsersForAdmin,
  getUserDetailsForAdmin,
  verifyUser,
  suspendUser,
  deleteUserAccount,
  resetUserPassword,
  addAdminNote,
  AdminUserProfile
} from '../../../integrations/firebase/adminServices';
import { useToast } from '../../../hooks/use-toast';
import { useAuth } from '../../../contexts/AuthContext';

export const UserManagementTab: React.FC = () => {
  const [users, setUsers] = useState<AdminUserProfile[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<AdminUserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'youth' | 'recruiter'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'verified' | 'pending' | 'suspended'>('all');
  const [selectedUser, setSelectedUser] = useState<AdminUserProfile | null>(null);
  const [showUserDetails, setShowUserDetails] = useState(false);
  const [adminNote, setAdminNote] = useState('');
  const { toast } = useToast();
  const { currentUser } = useAuth();

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm, roleFilter, statusFilter]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      console.log("Loading users for admin...");
      const allUsers = await getAllUsersForAdmin();
      console.log(`Loaded ${allUsers.length} users:`, allUsers);
      setUsers(allUsers);
      setFilteredUsers(allUsers);
      
      if (allUsers.length === 0) {
        toast({
          title: "No users found",
          description: "There are no users in the system yet."
        });
      }
    } catch (error) {
      console.error("Error loading users:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to load users: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = [...users];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.userId?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Role filter
    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => user.role === roleFilter);
    }

    // Status filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'verified') {
        filtered = filtered.filter(user => user.isVerified);
      } else if (statusFilter === 'pending') {
        filtered = filtered.filter(user => !user.isVerified && !user.isSuspended);
      } else if (statusFilter === 'suspended') {
        filtered = filtered.filter(user => user.isSuspended);
      }
    }

    setFilteredUsers(filtered);
  };

  const handleVerify = async (userId: string, isVerified: boolean) => {
    if (!currentUser) return;
    try {
      await verifyUser(currentUser.uid, userId, isVerified);
      toast({
        title: "Success",
        description: `User ${isVerified ? 'verified' : 'unverified'} successfully`
      });
      loadUsers();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update user verification"
      });
    }
  };

  const handleSuspend = async (userId: string, isSuspended: boolean) => {
    if (!currentUser) return;
    try {
      await suspendUser(currentUser.uid, userId, isSuspended);
      toast({
        title: "Success",
        description: `User ${isSuspended ? 'suspended' : 'unsuspended'} successfully`
      });
      loadUsers();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update user suspension"
      });
    }
  };

  const handleDelete = async (userId: string) => {
    if (!currentUser) return;
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }
    try {
      await deleteUserAccount(currentUser.uid, userId);
      toast({
        title: "Success",
        description: "User deleted successfully"
      });
      loadUsers();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete user"
      });
    }
  };

  const handleResetPassword = async (email: string) => {
    if (!currentUser) return;
    try {
      await resetUserPassword(currentUser.uid, email);
      toast({
        title: "Success",
        description: "Password reset email sent"
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to send password reset email"
      });
    }
  };

  const handleAddNote = async (userId: string) => {
    if (!currentUser || !adminNote.trim()) return;
    try {
      await addAdminNote(currentUser.uid, userId, adminNote);
      toast({
        title: "Success",
        description: "Admin note added"
      });
      setAdminNote('');
      loadUsers();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add admin note"
      });
    }
  };

  const handleViewUser = async (userId: string) => {
    try {
      const userDetails = await getUserDetailsForAdmin(userId);
      if (userDetails) {
        setSelectedUser(userDetails);
        setShowUserDetails(true);
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load user details"
      });
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="text-white text-lg">Loading users...</div>
        <div className="text-slate-400 text-sm mt-2">Please wait while we fetch all users from the system</div>
      </div>
    );
  }

  if (users.length === 0 && !loading) {
    return (
      <div className="space-y-6">
        <Card className="border-0 bg-slate-700/50 backdrop-blur-xl shadow-xl border-slate-600/50">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
              <Users className="h-6 w-6 text-purple-400" />
              User Management
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <Users className="h-16 w-16 text-slate-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No Users Found</h3>
              <p className="text-slate-400">There are no users in the system yet.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <Card className="border-0 bg-slate-700/50 backdrop-blur-xl shadow-xl border-slate-600/50">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="h-6 w-6 text-purple-400" />
            User Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name, email, or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
              />
            </div>
            <Select value={roleFilter} onValueChange={(v: any) => setRoleFilter(v)}>
              <SelectTrigger className="w-full sm:w-40 bg-slate-700 border-slate-600 text-white">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="all" className="text-white">All Roles</SelectItem>
                <SelectItem value="youth" className="text-white">Youth</SelectItem>
                <SelectItem value="recruiter" className="text-white">Recruiters</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
              <SelectTrigger className="w-full sm:w-40 bg-slate-700 border-slate-600 text-white">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="all" className="text-white">All Status</SelectItem>
                <SelectItem value="verified" className="text-white">Verified</SelectItem>
                <SelectItem value="pending" className="text-white">Pending</SelectItem>
                <SelectItem value="suspended" className="text-white">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card className="border-0 bg-slate-700/50 backdrop-blur-xl shadow-xl border-slate-600/50">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-white">
            Users ({filteredUsers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-slate-300">Name</TableHead>
                  <TableHead className="text-slate-300">Email</TableHead>
                  <TableHead className="text-slate-300">Role</TableHead>
                  <TableHead className="text-slate-300">Status</TableHead>
                  <TableHead className="text-slate-300">Created</TableHead>
                  <TableHead className="text-slate-300">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id} className="border-slate-700 hover:bg-slate-700/50">
                    <TableCell className="font-medium text-white">{user.fullName || 'N/A'}</TableCell>
                    <TableCell className="text-slate-300">{user.email || 'N/A'}</TableCell>
                    <TableCell>
                      <Badge variant={user.role === 'recruiter' ? 'default' : 'secondary'}>
                        {user.role === 'recruiter' ? (
                          <><Building className="h-3 w-3 mr-1" /> Recruiter</>
                        ) : (
                          <><Users className="h-3 w-3 mr-1" /> Youth</>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge variant={user.isVerified ? 'default' : 'secondary'}>
                          {user.isVerified ? 'Verified' : 'Pending'}
                        </Badge>
                        {user.isSuspended && (
                          <Badge variant="destructive">Suspended</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-300">
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border-blue-500/30"
                          onClick={() => handleViewUser(user.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {!user.isVerified && (
                          <Button
                            size="sm"
                            className="bg-green-600/20 hover:bg-green-600/30 text-green-300 border-green-500/30"
                            onClick={() => handleVerify(user.id, true)}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          className={user.isSuspended ? "bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-300 border-yellow-500/30" : "bg-orange-600/20 hover:bg-orange-600/30 text-orange-300 border-orange-500/30"}
                          onClick={() => handleSuspend(user.id, !user.isSuspended)}
                        >
                          <UserX className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          className="bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border-purple-500/30"
                          onClick={() => handleResetPassword(user.email || '')}
                        >
                          <Key className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          className="bg-red-600/20 hover:bg-red-600/30 text-red-300 border-red-500/30"
                          onClick={() => handleDelete(user.id)}
                        >
                          <Trash2 className="h-4 w-4" />
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

      {/* User Details Dialog */}
      <Dialog open={showUserDetails} onOpenChange={setShowUserDetails}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white text-xl font-bold">User Details</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-300">Name</Label>
                  <p className="font-medium text-white">{selectedUser.fullName}</p>
                </div>
                <div>
                  <Label className="text-slate-300">Email</Label>
                  <p className="font-medium text-white">{selectedUser.email}</p>
                </div>
                <div>
                  <Label>Role</Label>
                  <Badge>{selectedUser.role}</Badge>
                </div>
                <div>
                  <Label>Status</Label>
                  <div className="flex gap-2">
                    <Badge variant={selectedUser.isVerified ? 'default' : 'secondary'}>
                      {selectedUser.isVerified ? 'Verified' : 'Pending'}
                    </Badge>
                    {selectedUser.isSuspended && (
                      <Badge variant="destructive">Suspended</Badge>
                    )}
                  </div>
                </div>
                <div>
                  <Label>Country</Label>
                  <p>{selectedUser.country || 'N/A'}</p>
                </div>
                <div>
                  <Label>Created</Label>
                  <p>{selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleString() : 'N/A'}</p>
                </div>
              </div>

              <div>
                <Label>Skills ({selectedUser.skills?.length || 0})</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedUser.skills?.map((skill) => (
                    <Badge key={skill.id} variant={skill.verified ? 'default' : 'outline'}>
                      {skill.name}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <Label>Certificates ({selectedUser.certificates?.length || 0})</Label>
                <div className="space-y-2 mt-2">
                  {selectedUser.certificates?.map((cert) => (
                    <div key={cert.id} className="flex items-center justify-between p-2 border rounded">
                      <span>{cert.type}</span>
                      <Badge variant={cert.status === 'verified' ? 'default' : 'secondary'}>
                        {cert.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Portfolio Projects</Label>
                  <p className="text-2xl font-bold">{selectedUser.portfolioCount || 0}</p>
                </div>
                <div>
                  <Label>Reviews</Label>
                  <p className="text-2xl font-bold">{selectedUser.reviewCount || 0}</p>
                </div>
                <div>
                  <Label>Connections</Label>
                  <p className="text-2xl font-bold">{selectedUser.connectionCount || 0}</p>
                </div>
              </div>

              <div>
                <Label>Add Admin Note</Label>
                <Textarea
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder="Add internal admin note..."
                  className="mt-2"
                />
                <Button
                  onClick={() => handleAddNote(selectedUser.id)}
                  className="mt-2"
                  disabled={!adminNote.trim()}
                >
                  Add Note
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};


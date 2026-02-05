import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Checkbox } from '../ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '../ui/table';
import {
  CheckCircle,
  XCircle,
  UserCheck,
  UserX,
  Trash2,
  Eye,
  Search,
  Filter,
  Users,
  Building2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { UserProfile } from '../../integrations/firebase/types';

interface EnhancedUsersTableProps {
  recruiters: UserProfile[];
  youthUsers: UserProfile[];
  onVerifyRecruiter: (id: string, verified: boolean) => void;
  onVerifyYouth: (id: string, verified: boolean) => void;
  onSuspendUser: (id: string, suspended: boolean) => void;
  onDeleteUser: (id: string) => void;
}

export const EnhancedUsersTable: React.FC<EnhancedUsersTableProps> = ({
  recruiters,
  youthUsers,
  onVerifyRecruiter,
  onVerifyYouth,
  onSuspendUser,
  onDeleteUser
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [usersPerPage] = useState(10);

  // Combine and filter users
  const allUsers = [
    ...recruiters.map(r => ({ ...r, type: 'recruiter' as const })),
    ...youthUsers.map(y => ({ ...y, type: 'youth' as const }))
  ];

  const filteredUsers = allUsers.filter(user => {
    const matchesSearch = user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (user.type === 'recruiter' && user.companyName?.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         (user.type === 'youth' && user.talentArea?.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = filterStatus === 'all' ||
                         (filterStatus === 'verified' && user.isVerified) ||
                         (filterStatus === 'pending' && !user.isVerified) ||
                         (filterStatus === 'suspended' && user.isSuspended);

    return matchesSearch && matchesStatus;
  });

  // Pagination
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
  const startIndex = (currentPage - 1) * usersPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, startIndex + usersPerPage);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedUsers(new Set(paginatedUsers.map(user => user.id)));
    } else {
      setSelectedUsers(new Set());
    }
  };

  const handleSelectUser = (userId: string, checked: boolean) => {
    const newSelected = new Set(selectedUsers);
    if (checked) {
      newSelected.add(userId);
    } else {
      newSelected.delete(userId);
    }
    setSelectedUsers(newSelected);
  };

  const handleBulkAction = (action: 'verify' | 'suspend' | 'delete') => {
    selectedUsers.forEach(userId => {
      const user = allUsers.find(u => u.id === userId);
      if (!user) return;

      switch (action) {
        case 'verify':
          if (user.type === 'recruiter') {
            onVerifyRecruiter(userId, true);
          } else {
            onVerifyYouth(userId, true);
          }
          break;
        case 'suspend':
          onSuspendUser(userId, true);
          break;
        case 'delete':
          onDeleteUser(userId);
          break;
      }
    });
    setSelectedUsers(new Set());
  };

  const getStatusBadge = (user: any) => {
    if (user.isSuspended) {
      return <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-200">Suspended</Badge>;
    }
    if (user.isVerified) {
      return <Badge variant="default" className="bg-blue-100 text-blue-800 border-blue-200">Verified</Badge>;
    }
    return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200">Pending</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Search and Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex gap-4 items-center flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
            <Input
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 border-slate-200 focus:border-blue-500"
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-40 border-slate-200">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="verified">Verified</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Bulk Actions */}
        {selectedUsers.size > 0 && (
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => handleBulkAction('verify')}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <CheckCircle className="w-4 h-4 mr-1" />
              Verify ({selectedUsers.size})
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => handleBulkAction('suspend')}
            >
              <UserX className="w-4 h-4 mr-1" />
              Suspend ({selectedUsers.size})
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => handleBulkAction('delete')}
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Delete ({selectedUsers.size})
            </Button>
          </div>
        )}
      </div>

      {/* Recruiters Table */}
      <Card className="border-0 shadow-md bg-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-800">
            <Building2 className="w-5 h-5 text-blue-600" />
            Recruiters ({recruiters.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-slate-200">
                <TableHead className="w-12">
                  <Checkbox
                    checked={paginatedUsers.filter(u => u.type === 'recruiter').length > 0 &&
                             paginatedUsers.filter(u => u.type === 'recruiter').every(u => selectedUsers.has(u.id))}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead>User</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedUsers.filter(u => u.type === 'recruiter').map((recruiter) => (
                <TableRow key={recruiter.id} className="hover:bg-slate-50">
                  <TableCell>
                    <Checkbox
                      checked={selectedUsers.has(recruiter.id)}
                      onCheckedChange={(checked) => handleSelectUser(recruiter.id, checked as boolean)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src="" alt={recruiter.fullName} />
                        <AvatarFallback className="bg-blue-100 text-blue-600">
                          {recruiter.fullName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-slate-900">{recruiter.fullName}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-slate-600">{recruiter.companyName}</TableCell>
                  <TableCell className="text-slate-600">{recruiter.email}</TableCell>
                  <TableCell>{getStatusBadge(recruiter)}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {!recruiter.isVerified ? (
                        <Button
                          size="sm"
                          onClick={() => onVerifyRecruiter(recruiter.id, true)}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Verify
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onVerifyRecruiter(recruiter.id, false)}
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Unverify
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => onSuspendUser(recruiter.id, true)}
                      >
                        <UserX className="w-4 h-4 mr-1" />
                        Suspend
                      </Button>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline">
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Recruiter Details</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="flex items-center space-x-3">
                              <Avatar className="h-12 w-12">
                                <AvatarImage src="" alt={recruiter.fullName} />
                                <AvatarFallback className="bg-blue-100 text-blue-600 text-lg">
                                  {recruiter.fullName.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <h3 className="font-semibold text-lg">{recruiter.fullName}</h3>
                                <p className="text-slate-600">{recruiter.companyName}</p>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="font-medium">Email:</span>
                                <p className="text-slate-600">{recruiter.email}</p>
                              </div>
                              <div>
                                <span className="font-medium">Status:</span>
                                <div className="mt-1">{getStatusBadge(recruiter)}</div>
                              </div>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Youth Users Table */}
      <Card className="border-0 shadow-md bg-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-800">
            <Users className="w-5 h-5 text-teal-600" />
            Youth Users ({youthUsers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-slate-200">
                <TableHead className="w-12">
                  <Checkbox
                    checked={paginatedUsers.filter(u => u.type === 'youth').length > 0 &&
                             paginatedUsers.filter(u => u.type === 'youth').every(u => selectedUsers.has(u.id))}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Talent Area</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedUsers.filter(u => u.type === 'youth').map((user) => (
                <TableRow key={user.id} className="hover:bg-slate-50">
                  <TableCell>
                    <Checkbox
                      checked={selectedUsers.has(user.id)}
                      onCheckedChange={(checked) => handleSelectUser(user.id, checked as boolean)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src="" alt={user.fullName} />
                        <AvatarFallback className="bg-teal-100 text-teal-600">
                          {user.fullName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-slate-900">{user.fullName}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-slate-600">{user.email}</TableCell>
                  <TableCell className="text-slate-600">{user.country}</TableCell>
                  <TableCell className="text-slate-600">{user.talentArea}</TableCell>
                  <TableCell>{getStatusBadge(user)}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {!user.isVerified && (
                        <Button
                          size="sm"
                          onClick={() => onVerifyYouth(user.id, true)}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <UserCheck className="w-4 h-4 mr-1" />
                          Verify
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => onSuspendUser(user.id, true)}
                      >
                        <UserX className="w-4 h-4 mr-1" />
                        Suspend
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => onDeleteUser(user.id)}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Delete
                      </Button>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline">
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Youth User Details</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="flex items-center space-x-3">
                              <Avatar className="h-12 w-12">
                                <AvatarImage src="" alt={user.fullName} />
                                <AvatarFallback className="bg-teal-100 text-teal-600 text-lg">
                                  {user.fullName.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <h3 className="font-semibold text-lg">{user.fullName}</h3>
                                <p className="text-slate-600">{user.talentArea}</p>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="font-medium">Email:</span>
                                <p className="text-slate-600">{user.email}</p>
                              </div>
                              <div>
                                <span className="font-medium">Country:</span>
                                <p className="text-slate-600">{user.country}</p>
                              </div>
                              <div>
                                <span className="font-medium">Status:</span>
                                <div className="mt-1">{getStatusBadge(user)}</div>
                              </div>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-600">
            Showing {startIndex + 1} to {Math.min(startIndex + usersPerPage, filteredUsers.length)} of {filteredUsers.length} users
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </Button>
            <div className="flex items-center space-x-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(page => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1)
                .map((page, index, array) => (
                  <React.Fragment key={page}>
                    {index > 0 && array[index - 1] !== page - 1 && <span className="px-2">...</span>}
                    <Button
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                      className="w-8 h-8 p-0"
                    >
                      {page}
                    </Button>
                  </React.Fragment>
                ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

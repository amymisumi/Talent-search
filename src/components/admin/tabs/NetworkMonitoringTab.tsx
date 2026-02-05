import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Input } from '../../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { AlertTriangle, Trash2, Ban, Network, Search, User, Users } from 'lucide-react';
import {
  getAllConnectionsForAdmin,
  detectSpamConnections,
  blockUserFromConnections,
  removeConnection,
  AdminConnection
} from '../../../integrations/firebase/adminServices';
import { useToast } from '../../../hooks/use-toast';
import { useAuth } from '../../../contexts/AuthContext';

export const NetworkMonitoringTab: React.FC = () => {
  const [connections, setConnections] = useState<AdminConnection[]>([]);
  const [filteredConnections, setFilteredConnections] = useState<AdminConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'accepted' | 'declined' | 'blocked'>('all');
  const { toast } = useToast();
  const { currentUser } = useAuth();

  useEffect(() => {
    loadConnections();
  }, []);

  useEffect(() => {
    filterConnections();
  }, [connections, searchTerm, statusFilter]);

  const loadConnections = async () => {
    try {
      setLoading(true);
      console.log("Loading all connections...");
      const allConnections = await getAllConnectionsForAdmin();
      console.log(`Loaded ${allConnections.length} connections`);
      setConnections(allConnections);
      setFilteredConnections(allConnections);
    } catch (error) {
      console.error("Error loading connections:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to load connections: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setLoading(false);
    }
  };

  const filterConnections = () => {
    let filtered = [...connections];

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(conn =>
        conn.fromUserName?.toLowerCase().includes(searchLower) ||
        conn.toUserName?.toLowerCase().includes(searchLower) ||
        conn.fromUserEmail?.toLowerCase().includes(searchLower) ||
        conn.toUserEmail?.toLowerCase().includes(searchLower) ||
        conn.userId?.toLowerCase().includes(searchLower) ||
        conn.connectedUserId?.toLowerCase().includes(searchLower)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(conn => conn.status === statusFilter);
    }

    setFilteredConnections(filtered);
  };

  const handleBlockUser = async (userId: string) => {
    if (!currentUser) return;
    if (!confirm('Are you sure you want to block this user from sending connection requests?')) {
      return;
    }
    try {
      await blockUserFromConnections(currentUser.uid, userId);
      toast({
        title: "Success",
        description: "User blocked from connections"
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to block user"
      });
    }
  };

  const handleRemoveConnection = async (connectionId: string) => {
    if (!currentUser) return;
    if (!confirm('Are you sure you want to remove this connection?')) {
      return;
    }
    try {
      await removeConnection(currentUser.uid, connectionId);
      toast({
        title: "Success",
        description: "Connection removed"
      });
      loadConnections();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to remove connection"
      });
    }
  };

  const checkSpam = async (userId: string) => {
    try {
      const isSpam = await detectSpamConnections(userId);
      if (isSpam) {
        toast({
          variant: "destructive",
          title: "Spam Detected",
          description: "This user has sent many pending connection requests"
        });
      } else {
        toast({
          title: "No Spam",
          description: "User connection activity is normal"
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to check for spam"
      });
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="text-white text-lg">Loading connections...</div>
        <div className="text-slate-400 text-sm mt-2">Fetching all user connections from the system</div>
      </div>
    );
  }

  if (connections.length === 0 && !loading) {
    return (
      <div className="space-y-6">
        <Card className="border-0 bg-slate-700/50 backdrop-blur-xl shadow-xl border-slate-600/50">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
              <Network className="h-6 w-6 text-pink-400" />
              Network Activity Monitoring
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <Users className="h-16 w-16 text-slate-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No Connections Found</h3>
              <p className="text-slate-400">There are no connections in the system yet.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-0 bg-slate-700/50 backdrop-blur-xl shadow-xl border-slate-600/50">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
            <Network className="h-6 w-6 text-pink-400" />
            Network Activity Monitoring
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by user name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
              <SelectTrigger className="w-full sm:w-40 bg-slate-700 border-slate-600 text-white">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="all" className="text-white">All Status</SelectItem>
                <SelectItem value="pending" className="text-white">Pending</SelectItem>
                <SelectItem value="accepted" className="text-white">Accepted</SelectItem>
                <SelectItem value="declined" className="text-white">Declined</SelectItem>
                <SelectItem value="blocked" className="text-white">Blocked</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700">
                  <TableHead className="text-slate-300">From User</TableHead>
                  <TableHead className="text-slate-300">To User</TableHead>
                  <TableHead className="text-slate-300">Initiated By</TableHead>
                  <TableHead className="text-slate-300">Status</TableHead>
                  <TableHead className="text-slate-300">Created</TableHead>
                  <TableHead className="text-slate-300">Accepted</TableHead>
                  <TableHead className="text-slate-300">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredConnections.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-slate-400">
                      No connections found matching your filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredConnections.map((connection) => (
                    <TableRow key={connection.id} className="border-slate-700 hover:bg-slate-700/50">
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-white">{connection.fromUserName || 'Unknown'}</span>
                          <span className="text-xs text-slate-400">{connection.fromUserEmail || connection.userId}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-white">{connection.toUserName || 'Unknown'}</span>
                          <span className="text-xs text-slate-400">{connection.toUserEmail || connection.connectedUserId}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-slate-400" />
                          <span className="text-slate-300">{connection.initiatedByName || 'Unknown'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            connection.status === 'accepted'
                              ? 'bg-green-500/20 text-green-300 border-green-500/30'
                              : connection.status === 'pending'
                              ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
                              : connection.status === 'declined'
                              ? 'bg-red-500/20 text-red-300 border-red-500/30'
                              : 'bg-gray-500/20 text-gray-300 border-gray-500/30'
                          }
                        >
                          {connection.status || 'unknown'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-300">
                        {connection.createdAt ? new Date(connection.createdAt).toLocaleDateString() : 'N/A'}
                      </TableCell>
                      <TableCell className="text-slate-300">
                        {connection.acceptedAt ? new Date(connection.acceptedAt).toLocaleDateString() : '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-300 border-yellow-500/30"
                            onClick={() => checkSpam(connection.userId)}
                            title="Check for spam"
                          >
                            <AlertTriangle className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            className="bg-orange-600/20 hover:bg-orange-600/30 text-orange-300 border-orange-500/30"
                            onClick={() => handleBlockUser(connection.userId)}
                            title="Block user"
                          >
                            <Ban className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            className="bg-red-600/20 hover:bg-red-600/30 text-red-300 border-red-500/30"
                            onClick={() => handleRemoveConnection(connection.id)}
                            title="Remove connection"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <div className="mt-4 text-sm text-slate-400">
            Showing {filteredConnections.length} of {connections.length} connections
          </div>
        </CardContent>
      </Card>
    </div>
  );
};


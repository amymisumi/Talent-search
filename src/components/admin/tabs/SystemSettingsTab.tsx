import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Switch } from '../../ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';
import { Settings, Shield, UserPlus, Save } from 'lucide-react';
import {
  getSystemSettings,
  updateSystemSettings,
  getAllAdminUsers,
  addAdminUser,
  SystemSettings,
  AdminUser
} from '../../../integrations/firebase/adminServices';
import { useToast } from '../../../hooks/use-toast';
import { useAuth } from '../../../contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../ui/dialog';

export const SystemSettingsTab: React.FC = () => {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminName, setNewAdminName] = useState('');
  const [addingAdmin, setAddingAdmin] = useState(false);
  const { toast } = useToast();
  const { currentUser } = useAuth();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [settingsData, adminsData] = await Promise.all([
        getSystemSettings(),
        getAllAdminUsers()
      ]);
      setSettings(settingsData);
      setAdminUsers(adminsData);
    } catch (error) {
      console.error("Error loading settings:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load settings"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSettings = async () => {
    if (!currentUser || !settings) return;
    try {
      await updateSystemSettings(currentUser.uid, {
        maintenanceMode: settings.maintenanceMode,
        maintenanceMessage: settings.maintenanceMessage,
        allowNewRegistrations: settings.allowNewRegistrations,
        maxFileSize: settings.maxFileSize
      });
      toast({
        title: "Success",
        description: "System settings updated"
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update settings"
      });
    }
  };

  const handleAddAdmin = async () => {
    if (!currentUser || !newAdminEmail.trim() || !newAdminName.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please fill in both email and name"
      });
      return;
    }

    try {
      setAddingAdmin(true);
      await addAdminUser(currentUser.uid, newAdminEmail, newAdminName);
      toast({
        title: "Success",
        description: "Admin user added"
      });
      setNewAdminEmail('');
      setNewAdminName('');
      loadData();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add admin user"
      });
    } finally {
      setAddingAdmin(false);
    }
  };

  if (loading || !settings) {
    return <div className="text-center py-12">Loading settings...</div>;
  }

  return (
    <div className="space-y-6">
      {/* System Settings */}
      <Card className="border-0 bg-slate-700/50 backdrop-blur-xl shadow-xl border-slate-600/50">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
            <Settings className="h-6 w-6 text-slate-400" />
            System Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg bg-slate-600/30">
            <div>
              <Label className="text-slate-200">Maintenance Mode</Label>
              <p className="text-sm text-slate-400">Disable platform access for maintenance</p>
            </div>
            <Switch
              checked={settings.maintenanceMode}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, maintenanceMode: checked })
              }
            />
          </div>
          <div>
            <Label className="text-slate-300">Maintenance Message</Label>
            <Input
              value={settings.maintenanceMessage}
              onChange={(e) =>
                setSettings({ ...settings, maintenanceMessage: e.target.value })
              }
              className="mt-2 bg-slate-700 border-slate-600 text-white"
            />
          </div>
          <div className="flex items-center justify-between p-4 rounded-lg bg-slate-600/30">
            <div>
              <Label className="text-slate-200">Allow New Registrations</Label>
              <p className="text-sm text-slate-400">Enable/disable new user signups</p>
            </div>
            <Switch
              checked={settings.allowNewRegistrations}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, allowNewRegistrations: checked })
              }
            />
          </div>
          <div>
            <Label className="text-slate-300">Max File Size (MB)</Label>
            <Input
              type="number"
              value={settings.maxFileSize}
              onChange={(e) =>
                setSettings({ ...settings, maxFileSize: parseInt(e.target.value) || 10 })
              }
              className="mt-2 bg-slate-700 border-slate-600 text-white"
            />
          </div>
          <Button 
            onClick={handleUpdateSettings}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white border-0 shadow-lg"
          >
            <Save className="h-4 w-4 mr-2" />
            Save Settings
          </Button>
        </CardContent>
      </Card>

      {/* Admin Users Management */}
      <Card className="border-0 bg-slate-700/50 backdrop-blur-xl shadow-xl border-slate-600/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
              <Shield className="h-6 w-6 text-blue-400" />
              Admin Users ({adminUsers.length})
            </CardTitle>
            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Admin
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-800 border-slate-700">
                <DialogHeader>
                  <DialogTitle className="text-white text-xl font-bold">Add New Admin User</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label className="text-slate-300">Email</Label>
                    <Input
                      value={newAdminEmail}
                      onChange={(e) => setNewAdminEmail(e.target.value)}
                      type="email"
                      placeholder="admin@example.com"
                      className="mt-2 bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-300">Name</Label>
                    <Input
                      value={newAdminName}
                      onChange={(e) => setNewAdminName(e.target.value)}
                      placeholder="Admin Name"
                      className="mt-2 bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                    />
                  </div>
                  <Button 
                    onClick={handleAddAdmin} 
                    disabled={addingAdmin} 
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white border-0 shadow-lg"
                  >
                    {addingAdmin ? 'Adding...' : 'Add Admin'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                    <TableHead className="text-slate-300">Name</TableHead>
                      <TableHead className="text-slate-300">Email</TableHead>
                      <TableHead className="text-slate-300">Created</TableHead>
                      <TableHead className="text-slate-300">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {adminUsers.map((admin) => (
                <TableRow key={admin.id} className="border-slate-700 hover:bg-slate-700/50">
                  <TableCell className="text-white">{admin.name}</TableCell>
                  <TableCell className="text-slate-300">{admin.email}</TableCell>
                  <TableCell className="text-slate-300">
                    {admin.createdAt ? new Date(admin.createdAt).toLocaleDateString() : 'N/A'}
                  </TableCell>
                  <TableCell>
                    <Badge className={admin.isActive ? "bg-green-500/20 text-green-300 border-green-500/30" : "bg-slate-500/20 text-slate-300 border-slate-500/30"}>
                      {admin.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};



import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import StatsCard from '../../components/StatsCard';
import Modal from '../../components/Modal';
import Input from '../../components/Input';
import Button from '../../components/Button';
import { Building2, DollarSign, Users, Activity, Edit2, LogOut, Plus, Search, User, Trash2, Key } from 'lucide-react';
import { SubscriptionPlan, Organization, User as UserType, UserRole } from '../../types';

const AdminDashboard: React.FC = () => {
  const { organizations, addOrganization, updateOrganization, users, addUser, updateUser, deleteUser } = useData();
  const { logout } = useAuth();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  
  // Org Form State
  const [editingOrg, setEditingOrg] = useState<Partial<Organization>>({});
  
  // User Management State
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [userForm, setUserForm] = useState<Partial<UserType>>({});
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  // Calculate SaaS Metrics
  const totalTenants = organizations.length;
  const activeTenants = organizations.filter(o => o.status === 'ACTIVE').length;
  const mrr = organizations.reduce((sum, o) => sum + (o.mrr || 0), 0);
  const totalUsers = organizations.reduce((sum, o) => sum + (o.maxUsers || 0), 0); 

  const filteredOrgs = organizations.filter(o => 
    o.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    o.contactName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateOrg = () => {
    setEditingOrg({
      plan: 'BASIC',
      status: 'ACTIVE',
      maxKitchens: 1,
      maxUsers: 5,
      mrr: 0
    });
    setIsModalOpen(true);
  };

  const handleEditOrg = (org: Organization) => {
    setEditingOrg({ ...org });
    setIsModalOpen(true);
  };

  const handleSaveOrg = () => {
    if (!editingOrg.name) return;

    if (editingOrg.id) {
        updateOrganization(editingOrg.id, editingOrg);
    } else {
        addOrganization(editingOrg as Organization);
    }
    setIsModalOpen(false);
  };

  const handleManageUsers = (orgId: string) => {
    setSelectedOrgId(orgId);
    setEditingUserId(null);
    setUserForm({
      username: '',
      password: '',
      fullName: '',
      role: 'TENANT_ADMIN',
      organizationId: orgId
    });
    setIsUserModalOpen(true);
  };

  const handleSaveUser = () => {
    if (!userForm.username || !userForm.password || !selectedOrgId) return;

    if (editingUserId) {
        updateUser(editingUserId, userForm);
    } else {
        addUser({
            ...userForm as UserType,
            organizationId: selectedOrgId
        });
    }
    
    // Reset form but keep modal open to add more
    setEditingUserId(null);
    setUserForm({
      username: '',
      password: '',
      fullName: '',
      role: 'TENANT_ADMIN',
      organizationId: selectedOrgId
    });
  };

  const handleEditUser = (user: UserType) => {
    setEditingUserId(user.id);
    setUserForm({ ...user });
  };

  const handleDeleteUser = (userId: string) => {
    if(confirm('Are you sure you want to delete this user?')) {
        deleteUser(userId);
    }
  };

  const orgUsers = users.filter(u => String(u.organizationId) === selectedOrgId);
  const selectedOrgName = organizations.find(o => String(o.id) === selectedOrgId)?.name;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-body">
      {/* Super Admin Header */}
      <header className="bg-slate-950 border-b border-slate-800 px-8 h-20 flex items-center justify-between">
        <div className="flex items-center gap-4">
           <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold">
             DEV
           </div>
           <div>
             <h1 className="font-display font-bold text-lg text-white">SaaS Control Center</h1>
             <p className="text-xs text-slate-400">Super Admin Dashboard</p>
           </div>
        </div>
        <button onClick={logout} className="text-sm font-bold text-slate-400 hover:text-white flex items-center gap-2">
           <LogOut size={16} /> Logout
        </button>
      </header>

      <main className="p-8 max-w-7xl mx-auto space-y-8">
        
        {/* Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
           <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
              <div className="flex items-center gap-3 mb-2">
                 <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg"><Building2 size={20} /></div>
                 <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Tenants</span>
              </div>
              <div className="text-3xl font-display font-bold text-white">{totalTenants}</div>
           </div>
           <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
              <div className="flex items-center gap-3 mb-2">
                 <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg"><DollarSign size={20} /></div>
                 <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Monthly Revenue</span>
              </div>
              <div className="text-3xl font-display font-bold text-white">${mrr.toLocaleString()}</div>
           </div>
           <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
              <div className="flex items-center gap-3 mb-2">
                 <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg"><Activity size={20} /></div>
                 <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Active Rate</span>
              </div>
              <div className="text-3xl font-display font-bold text-white">{Math.round((activeTenants/totalTenants)*100)}%</div>
           </div>
           <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
              <div className="flex items-center gap-3 mb-2">
                 <div className="p-2 bg-purple-500/20 text-purple-400 rounded-lg"><Users size={20} /></div>
                 <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Licensed Users</span>
              </div>
              <div className="text-3xl font-display font-bold text-white">{totalUsers}</div>
           </div>
        </div>

        {/* Tenants Table */}
        <div className="bg-slate-800 rounded-3xl border border-slate-700 overflow-hidden">
           <div className="p-6 border-b border-slate-700 flex justify-between items-center">
              <h2 className="text-xl font-bold font-display text-white">Organizations</h2>
              <div className="flex gap-3">
                 <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input 
                      className="bg-slate-900 border border-slate-700 rounded-xl py-2 pl-9 pr-4 text-sm text-white focus:outline-none focus:border-indigo-500"
                      placeholder="Search tenants..."
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                    />
                 </div>
                 <button onClick={handleCreateOrg} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors">
                    <Plus size={16} /> New Tenant
                 </button>
              </div>
           </div>
           
           <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-900/50 text-slate-400 text-xs uppercase tracking-wider font-bold">
                   <th className="p-5">Organization</th>
                   <th className="p-5">Plan</th>
                   <th className="p-5">Status</th>
                   <th className="p-5 text-right">Revenue</th>
                   <th className="p-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700 text-sm">
                 {filteredOrgs.map(org => (
                    <tr key={org.id} className="hover:bg-slate-700/50 transition-colors">
                       <td className="p-5">
                          <div className="font-bold text-white">{org.name}</div>
                          <div className="text-slate-500 text-xs">{org.contactName}</div>
                       </td>
                       <td className="p-5">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${org.plan === 'PRO' ? 'bg-purple-500/20 text-purple-300' : 'bg-slate-600/20 text-slate-300'}`}>
                             {org.plan}
                          </span>
                       </td>
                       <td className="p-5">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${org.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'}`}>
                             {org.status}
                          </span>
                       </td>
                       <td className="p-5 text-right font-mono text-slate-300">
                          ${org.mrr}
                       </td>
                       <td className="p-5 text-right">
                          <div className="flex justify-end gap-2">
                            <button onClick={() => handleManageUsers(org.id)} className="p-2 hover:bg-slate-700 rounded-lg text-blue-400 hover:text-white transition-colors" title="Manage Users">
                                <Users size={16} />
                            </button>
                            <button onClick={() => handleEditOrg(org)} className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors" title="Edit Org">
                                <Edit2 size={16} />
                            </button>
                          </div>
                       </td>
                    </tr>
                 ))}
              </tbody>
           </table>
        </div>
      </main>

      {/* Organization Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Manage Tenant">
         <div className="space-y-4">
            <Input label="Organization Name" value={editingOrg.name || ''} onChange={e => setEditingOrg({...editingOrg, name: e.target.value})} />
            <Input label="Contact Name" value={editingOrg.contactName || ''} onChange={e => setEditingOrg({...editingOrg, contactName: e.target.value})} />
            <Input label="Monthly Revenue ($)" type="number" value={editingOrg.mrr || 0} onChange={e => setEditingOrg({...editingOrg, mrr: Number(e.target.value)})} />
            
            <div className="grid grid-cols-2 gap-4">
               <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Plan</label>
                  <select 
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm"
                    value={editingOrg.plan}
                    onChange={e => setEditingOrg({...editingOrg, plan: e.target.value as SubscriptionPlan})}
                  >
                     <option value="BASIC">BASIC</option>
                     <option value="PRO">PRO</option>
                     <option value="ENTERPRISE">ENTERPRISE</option>
                  </select>
               </div>
               <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Status</label>
                  <select 
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm"
                    value={editingOrg.status}
                    onChange={e => setEditingOrg({...editingOrg, status: e.target.value as any})}
                  >
                     <option value="ACTIVE">ACTIVE</option>
                     <option value="SUSPENDED">SUSPENDED</option>
                  </select>
               </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <Input label="Max Kitchens" type="number" value={editingOrg.maxKitchens || 1} onChange={e => setEditingOrg({...editingOrg, maxKitchens: Number(e.target.value)})} />
               <Input label="Max Users" type="number" value={editingOrg.maxUsers || 5} onChange={e => setEditingOrg({...editingOrg, maxUsers: Number(e.target.value)})} />
            </div>
            
            <div className="pt-4">
               <Button onClick={handleSaveOrg} fullWidth>Save Organization</Button>
            </div>
         </div>
      </Modal>

      {/* Users Management Modal */}
      <Modal isOpen={isUserModalOpen} onClose={() => setIsUserModalOpen(false)} title={`Users for ${selectedOrgName}`}>
         <div className="space-y-6">
            
            {/* Add/Edit User Form */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
               <h4 className="text-xs font-bold uppercase text-slate-500 mb-2">{editingUserId ? 'Edit User' : 'Add New User'}</h4>
               <div className="grid grid-cols-2 gap-3">
                   <Input 
                      placeholder="Full Name" 
                      value={userForm.fullName || ''} 
                      onChange={e => setUserForm({...userForm, fullName: e.target.value})}
                      className="bg-white" 
                   />
                   <select 
                      className="w-full p-3 bg-white border border-slate-200 rounded-xl text-[13px] font-medium"
                      value={userForm.role}
                      onChange={e => setUserForm({...userForm, role: e.target.value as UserRole})}
                   >
                       <option value="TENANT_ADMIN">Admin</option>
                       <option value="KITCHEN_USER">Kitchen User</option>
                   </select>
               </div>
               <div className="grid grid-cols-2 gap-3">
                   <Input 
                      placeholder="Username" 
                      icon={<User size={14} />}
                      value={userForm.username || ''} 
                      onChange={e => setUserForm({...userForm, username: e.target.value})}
                      className="bg-white" 
                   />
                   <Input 
                      placeholder="Password" 
                      type="text" 
                      icon={<Key size={14} />}
                      value={userForm.password || ''} 
                      onChange={e => setUserForm({...userForm, password: e.target.value})}
                      className="bg-white" 
                   />
               </div>
               <Button onClick={handleSaveUser} fullWidth size="sm">
                  {editingUserId ? 'Update User' : 'Add User'}
               </Button>
            </div>

            {/* User List */}
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
               {orgUsers.length === 0 ? (
                  <p className="text-center text-slate-400 text-sm py-4">No users found.</p>
               ) : (
                  orgUsers.map(u => (
                     <div key={u.id} className="flex items-center justify-between p-3 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-3">
                           <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${u.role === 'TENANT_ADMIN' ? 'bg-purple-100 text-purple-600' : 'bg-slate-100 text-slate-600'}`}>
                              {u.fullName.charAt(0)}
                           </div>
                           <div>
                              <div className="text-sm font-bold text-slate-800">{u.fullName}</div>
                              <div className="text-xs text-slate-500 font-mono">@{u.username} • {u.role === 'TENANT_ADMIN' ? 'Admin' : 'User'}</div>
                           </div>
                        </div>
                        <div className="flex gap-1">
                           <button onClick={() => handleEditUser(u)} className="p-1.5 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-white"><Edit2 size={14} /></button>
                           <button onClick={() => handleDeleteUser(u.id)} className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-white"><Trash2 size={14} /></button>
                        </div>
                     </div>
                  ))
               )}
            </div>
         </div>
      </Modal>
    </div>
  );
};

export default AdminDashboard;

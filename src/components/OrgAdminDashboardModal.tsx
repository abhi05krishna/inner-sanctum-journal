import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Users, 
  UserPlus, 
  ShieldCheck, 
  Copy, 
  Check, 
  UserMinus, 
  UserCheck, 
  Search, 
  Filter, 
  AlertCircle, 
  X, 
  BarChart3, 
  Mail, 
  Calendar,
  Lock,
  RefreshCw,
  Sparkles,
  Info,
  Clock,
  FileText
} from 'lucide-react';
import type { Organization, OrgMember, OrgRole, OrgSeatStatus, OrgAuditLogEntry } from '../types';
import { 
  inviteEmployeeSeat, 
  removeEmployeeSeat, 
  reactivateEmployeeSeat, 
  subscribeOrgAuditLogs,
  logOrgAdminAction 
} from '../firebase';

interface OrgAdminDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  organization: Organization | null;
  members: OrgMember[];
  currentUserId: string;
  onRefreshMembers?: () => void;
}

export const OrgAdminDashboardModal: React.FC<OrgAdminDashboardModalProps> = ({
  isOpen,
  onClose,
  organization,
  members,
  currentUserId,
  onRefreshMembers,
}) => {
  const [activeTab, setActiveTab] = useState<'seats' | 'audit_log'>('seats');
  const [auditLogs, setAuditLogs] = useState<OrgAuditLogEntry[]>([]);
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | OrgSeatStatus>('all');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<OrgRole>('employee');
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
  const [actionProcessingId, setActionProcessingId] = useState<string | null>(null);

  // Subscribe to organization audit logs
  useEffect(() => {
    if (!organization?.id || !isOpen) return;
    const unsubscribe = subscribeOrgAuditLogs(organization.id, (logs) => {
      setAuditLogs(logs);
    });
    return () => unsubscribe();
  }, [organization?.id, isOpen]);

  if (!isOpen || !organization) return null;

  const currentAdminMember = members.find((m) => m.id === currentUserId);

  // Compute aggregate stats
  const totalConfiguredSeats = organization.totalSeats || 10;
  const activeMembers = members.filter(m => m.seatStatus === 'active');
  const pendingMembers = members.filter(m => m.seatStatus === 'pending');
  const removedMembers = members.filter(m => m.seatStatus === 'removed');
  
  // Calculate members active in the last 7 days (by date string only)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

  const activeThisWeekCount = activeMembers.filter(m => {
    if (!m.lastActiveDate) return false;
    return m.lastActiveDate >= sevenDaysAgoStr;
  }).length;

  const weeklyParticipationRate = activeMembers.length > 0
    ? Math.round((activeThisWeekCount / activeMembers.length) * 100)
    : 0;

  // Filtered members list
  const filteredMembers = members.filter(member => {
    const matchesSearch = 
      member.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (member.displayName && member.displayName.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || member.seatStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCopyInviteCode = () => {
    navigator.clipboard.writeText(organization.inviteCode);
    setCopiedInvite(true);
    logOrgAdminAction(organization.id, 'invite_code_copied', currentUserId, {
      performedByEmail: currentAdminMember?.email,
      details: 'Copied organization invite code to clipboard for distribution.',
    });
    setTimeout(() => setCopiedInvite(false), 2500);
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = inviteEmail.trim();
    if (!cleanEmail) return;

    setIsInviting(true);
    setInviteError(null);
    setInviteSuccess(null);

    try {
      await inviteEmployeeSeat(
        organization.id, 
        cleanEmail, 
        inviteRole, 
        currentUserId, 
        currentAdminMember?.email
      );
      setInviteSuccess(`Seat invitation created for ${cleanEmail}`);
      setInviteEmail('');
      if (onRefreshMembers) onRefreshMembers();
    } catch (err: any) {
      console.error('Failed to invite seat:', err);
      setInviteError(err.message || 'Failed to send invite');
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveSeat = async (memberId: string, memberEmail: string) => {
    if (!window.confirm(`Are you sure you want to remove the seat for ${memberEmail}? Their personal journal content will remain untouched and accessible under their personal account.`)) {
      return;
    }

    setActionProcessingId(memberId);
    try {
      await removeEmployeeSeat(organization.id, memberId, currentUserId, {
        adminEmail: currentAdminMember?.email,
        memberEmail,
      });
      if (onRefreshMembers) onRefreshMembers();
    } catch (err) {
      console.error('Failed to remove seat:', err);
      alert('Could not remove seat. Please verify permissions.');
    } finally {
      setActionProcessingId(null);
    }
  };

  const handleReactivateSeat = async (memberId: string) => {
    setActionProcessingId(memberId);
    try {
      const targetMember = members.find((m) => m.id === memberId);
      await reactivateEmployeeSeat(organization.id, memberId, currentUserId, {
        adminEmail: currentAdminMember?.email,
        memberEmail: targetMember?.email,
      });
      if (onRefreshMembers) onRefreshMembers();
    } catch (err) {
      console.error('Failed to reactivate seat:', err);
      alert('Could not reactivate seat.');
    } finally {
      setActionProcessingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-xs">
      <div 
        id="org-admin-dashboard-dialog"
        className="relative w-full max-w-4xl bg-[#FBF9F5] border border-[#DCD7C5] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-[#E6E2D3] bg-[#F5F2EA]/90 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-[#4A5D4E] text-[#FFFFFF] flex items-center justify-center shadow-xs">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-serif font-bold text-[#1A1A1A]">
                  {organization.name}
                </h2>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-mono uppercase font-semibold bg-[#4A5D4E]/10 text-[#4A5D4E] border border-[#4A5D4E]/20">
                  {organization.plan || 'Enterprise'} Plan
                </span>
              </div>
              <p className="text-xs text-[#6B6B6B] mt-0.5 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#4A5D4E]" />
                <span>Organization Administration & Seat Allocation Portal</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#737373] hover:text-[#1A1A1A] hover:bg-[#E6E2D3] rounded-lg transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-5 sm:px-6 border-b border-[#E6E2D3] bg-[#F5F2EA]/60 flex items-center gap-2">
          <button
            id="tab-org-seats"
            type="button"
            onClick={() => setActiveTab('seats')}
            className={`inline-flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'seats'
                ? 'border-[#4A5D4E] text-[#4A5D4E]'
                : 'border-transparent text-[#737373] hover:text-[#1A1A1A]'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Employee Seats ({activeMembers.length}/{totalConfiguredSeats})</span>
          </button>
          <button
            id="tab-org-audit-log"
            type="button"
            onClick={() => setActiveTab('audit_log')}
            className={`inline-flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'audit_log'
                ? 'border-[#4A5D4E] text-[#4A5D4E]'
                : 'border-transparent text-[#737373] hover:text-[#1A1A1A]'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Admin Audit Trail</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-[#E6E2D3] text-[#555]">
              {auditLogs.length}
            </span>
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {activeTab === 'seats' ? (
            <>
              {/* Top Banner: Invite Code & Quick Share */}
          <div className="p-4 rounded-xl bg-[#FFFFFF] border border-[#E6E2D3] flex items-center justify-between flex-wrap gap-4 shadow-2xs">
            <div>
              <div className="text-xs font-medium text-[#737373]">Employee Join Invitation Code</div>
              <div className="flex items-center gap-2 mt-1">
                <span className="font-mono text-base font-bold text-[#1A1A1A] bg-[#F0ECE1] px-3 py-1 rounded-lg border border-[#DCD7C5]">
                  {organization.inviteCode}
                </span>
                <button
                  id="btn-copy-org-invite"
                  onClick={handleCopyInviteCode}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-serif font-semibold bg-[#4A5D4E] hover:bg-[#3A4A3E] text-[#FFFFFF] transition-colors cursor-pointer"
                >
                  {copiedInvite ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Code</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="text-xs text-[#6B6B6B] max-w-sm">
              Share this invite code with your employees. When joining, they will be shown the <strong>Zero Content Visibility Privacy Disclosure</strong> before activating their seat.
            </div>
          </div>

          {/* Aggregate Anonymized Usage Metrics */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono uppercase tracking-wider text-[#4A5D4E] font-semibold flex items-center gap-1.5">
                <BarChart3 className="w-4 h-4" />
                <span>Aggregate Anonymized Participation</span>
              </h3>
              <span className="text-[11px] text-[#737373] flex items-center gap-1">
                <Lock className="w-3 h-3 text-[#4A5D4E]" />
                <span>Zero Individual Content Visibility</span>
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Total Seats */}
              <div className="p-3.5 rounded-xl bg-[#FFFFFF] border border-[#E6E2D3]">
                <div className="text-xs text-[#737373]">Seat Allocation</div>
                <div className="text-xl font-serif font-bold text-[#1A1A1A] mt-1">
                  {activeMembers.length} <span className="text-xs font-sans text-[#737373]">/ {totalConfiguredSeats} seats</span>
                </div>
                <div className="w-full bg-[#E6E2D3] h-1.5 rounded-full mt-2 overflow-hidden">
                  <div 
                    className="bg-[#4A5D4E] h-full rounded-full transition-all"
                    style={{ width: `${Math.min(100, Math.round((activeMembers.length / totalConfiguredSeats) * 100))}%` }}
                  />
                </div>
              </div>

              {/* Active Seats */}
              <div className="p-3.5 rounded-xl bg-[#FFFFFF] border border-[#E6E2D3]">
                <div className="text-xs text-[#737373]">Active Employees</div>
                <div className="text-xl font-serif font-bold text-[#2E5E3B] mt-1">
                  {activeMembers.length}
                </div>
                <div className="text-[11px] text-[#737373] mt-2">Provisioned licenses</div>
              </div>

              {/* Weekly Participation */}
              <div className="p-3.5 rounded-xl bg-[#FFFFFF] border border-[#E6E2D3]">
                <div className="text-xs text-[#737373]">Active This Week</div>
                <div className="text-xl font-serif font-bold text-[#1A1A1A] mt-1">
                  {activeThisWeekCount} <span className="text-xs font-sans text-[#737373]">({weeklyParticipationRate}%)</span>
                </div>
                <div className="text-[11px] text-[#737373] mt-2">Aggregated count only</div>
              </div>

              {/* Pending Invites */}
              <div className="p-3.5 rounded-xl bg-[#FFFFFF] border border-[#E6E2D3]">
                <div className="text-xs text-[#737373]">Pending / Removed</div>
                <div className="text-xl font-serif font-bold text-[#737373] mt-1">
                  {pendingMembers.length} <span className="text-xs font-sans text-[#737373]">pend / {removedMembers.length} rem</span>
                </div>
                <div className="text-[11px] text-[#737373] mt-2">Invitation state</div>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-[#F5F2EA] border border-[#E6E2D3] text-[11px] text-[#5A5A5A] flex items-start gap-2">
              <Info className="w-3.5 h-3.5 text-[#4A5D4E] shrink-0 mt-0.5" />
              <span>
                <strong>Privacy by Design:</strong> Participation metrics are aggregate counts only. 
                As an organization administrator, you cannot see who wrote what, specific dates journaled, mood graphs, summaries, or conversation texts.
              </span>
            </div>
          </div>

          {/* Invite Employee Form */}
          <div className="p-4 rounded-xl bg-[#FFFFFF] border border-[#E6E2D3] space-y-3">
            <h3 className="text-xs font-mono uppercase tracking-wider text-[#4A5D4E] font-semibold flex items-center gap-1.5">
              <UserPlus className="w-4 h-4" />
              <span>Invite New Employee Seat</span>
            </h3>

            <form onSubmit={handleInviteSubmit} className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#737373]" />
                <input
                  id="input-org-invite-email"
                  type="email"
                  maxLength={120}
                  placeholder="employee.email@company.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-[#FBF9F5] border border-[#DCD7C5] rounded-xl text-[#1A1A1A] placeholder-[#8C8C8C] focus:outline-hidden focus:border-[#4A5D4E]"
                  required
                />
              </div>

              <select
                id="select-org-invite-role"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as OrgRole)}
                className="px-3 py-2 text-xs bg-[#FBF9F5] border border-[#DCD7C5] rounded-xl text-[#1A1A1A] focus:outline-hidden focus:border-[#4A5D4E] cursor-pointer"
              >
                <option value="employee">Employee Seat</option>
                <option value="admin">Org Admin</option>
              </select>

              <button
                id="btn-submit-org-invite"
                type="submit"
                disabled={isInviting || !inviteEmail.trim()}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-serif font-semibold bg-[#4A5D4E] hover:bg-[#3A4A3E] text-[#FFFFFF] rounded-xl transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>{isInviting ? 'Inviting...' : 'Send Invitation'}</span>
              </button>
            </form>

            {inviteSuccess && (
              <div className="p-2.5 rounded-lg bg-[#F0F5F1] border border-[#D5E5D8] text-xs text-[#2E5E3B] flex items-center gap-2">
                <Check className="w-3.5 h-3.5 shrink-0" />
                <span>{inviteSuccess}</span>
              </div>
            )}

            {inviteError && (
              <div className="p-2.5 rounded-lg bg-[#FAF0F0] border border-[#F3D5D5] text-xs text-[#9E2A2B] flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{inviteError}</span>
              </div>
            )}
          </div>

          {/* Seat Management Table */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <h3 className="text-xs font-mono uppercase tracking-wider text-[#4A5D4E] font-semibold flex items-center gap-1.5">
                <Users className="w-4 h-4" />
                <span>Provisioned Seats & Members ({members.length})</span>
              </h3>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                {/* Search */}
                <div className="relative flex-1 sm:w-48">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#737373]" />
                  <input
                    type="text"
                    maxLength={120}
                    placeholder="Search seats..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-[#FFFFFF] border border-[#DCD7C5] rounded-lg text-[#1A1A1A] placeholder-[#8C8C8C] focus:outline-hidden focus:border-[#4A5D4E]"
                  />
                </div>

                {/* Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="px-2.5 py-1.5 text-xs bg-[#FFFFFF] border border-[#DCD7C5] rounded-lg text-[#1A1A1A] focus:outline-hidden focus:border-[#4A5D4E] cursor-pointer"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="removed">Removed</option>
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="border border-[#E6E2D3] rounded-xl overflow-hidden bg-[#FFFFFF] shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F5F2EA] text-[#6B6B6B] border-b border-[#E6E2D3] font-medium">
                    <tr>
                      <th className="p-3">Member / Email</th>
                      <th className="p-3">Role</th>
                      <th className="p-3">Seat Status</th>
                      <th className="p-3">Joined Date</th>
                      <th className="p-3">Last Active (Date only)</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E6E2D3] text-[#333333]">
                    {filteredMembers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-[#737373]">
                          No member seats found matching criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredMembers.map((member) => {
                        const isSelf = member.id === currentUserId;
                        const isProcessing = actionProcessingId === member.id;

                        return (
                          <tr key={member.id} className="hover:bg-[#FAF9F5] transition-colors">
                            <td className="p-3">
                              <div className="font-semibold text-[#1A1A1A]">
                                {member.displayName || 'Employee'}
                                {isSelf && <span className="ml-1 text-[10px] text-[#4A5D4E] font-normal">(You)</span>}
                              </div>
                              <div className="text-[11px] text-[#737373]">{member.email}</div>
                            </td>

                            <td className="p-3">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${
                                member.role === 'admin' 
                                  ? 'bg-[#4A5D4E]/10 text-[#4A5D4E] border border-[#4A5D4E]/20' 
                                  : 'bg-[#F0ECE1] text-[#555555]'
                              }`}>
                                {member.role === 'admin' ? 'Org Admin' : 'Employee'}
                              </span>
                            </td>

                            <td className="p-3">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${
                                member.seatStatus === 'active'
                                  ? 'bg-[#E8F3EB] text-[#2E5E3B]'
                                  : member.seatStatus === 'pending'
                                  ? 'bg-[#FFF8E6] text-[#B45309]'
                                  : 'bg-[#F0ECE1] text-[#737373]'
                              }`}>
                                {member.seatStatus === 'active' && 'Active'}
                                {member.seatStatus === 'pending' && 'Pending Invite'}
                                {member.seatStatus === 'removed' && 'Seat Revoked'}
                              </span>
                            </td>

                            <td className="p-3 text-[11px] text-[#6B6B6B]">
                              {member.joinedAt ? new Date(member.joinedAt).toLocaleDateString() : 'Pending'}
                            </td>

                            <td className="p-3 text-[11px] text-[#6B6B6B]">
                              {member.lastActiveDate ? (
                                <span className="font-mono">{member.lastActiveDate}</span>
                              ) : (
                                <span className="text-[#8C8C8C] italic">None recorded</span>
                              )}
                            </td>

                            <td className="p-3 text-right">
                              {isSelf ? (
                                <span className="text-[11px] text-[#8C8C8C]">Owner</span>
                              ) : member.seatStatus === 'removed' ? (
                                <button
                                  onClick={() => handleReactivateSeat(member.id)}
                                  disabled={isProcessing}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-[#E8F3EB] text-[#2E5E3B] hover:bg-[#D5E5D8] transition-colors cursor-pointer"
                                  title="Reactivate employee seat"
                                >
                                  <UserCheck className="w-3 h-3" />
                                  <span>{isProcessing ? 'Updating...' : 'Restore Seat'}</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleRemoveSeat(member.id, member.email)}
                                  disabled={isProcessing}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-[#FAF0F0] text-[#9E2A2B] hover:bg-[#F3D5D5] transition-colors cursor-pointer"
                                  title="Revoke employee seat (preserves their personal journal data)"
                                >
                                  <UserMinus className="w-3 h-3" />
                                  <span>{isProcessing ? 'Removing...' : 'Remove Seat'}</span>
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      ) : (
          /* Admin Action Audit Trail View */
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-[#FFFFFF] border border-[#E6E2D3] space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-mono uppercase tracking-wider text-[#4A5D4E] font-semibold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Security & Account Audit Trail</span>
                </h3>
                <span className="text-[11px] font-mono text-[#737373]">
                  {auditLogs.length} events logged
                </span>
              </div>

              <div className="p-3 rounded-lg bg-[#F5F2EA] border border-[#E6E2D3] text-[11px] text-[#5A5A5A] flex items-start gap-2">
                <Lock className="w-3.5 h-3.5 text-[#4A5D4E] shrink-0 mt-0.5" />
                <span>
                  <strong>Strict Privacy Mandate:</strong> This audit trail records administrative seat actions only (invitations, revocations, and configuration changes). 
                  Under no circumstance does this log contain or record any user journal reflections, mood metrics, embeddings, or conversation transcripts.
                </span>
              </div>
            </div>

            {/* Audit Log Entries List */}
            <div className="p-4 rounded-xl bg-[#FFFFFF] border border-[#E6E2D3] space-y-3">
              {auditLogs.length === 0 ? (
                <div className="py-10 text-center text-[#737373] text-xs">
                  <FileText className="w-8 h-8 text-[#B0A898] mx-auto mb-2 opacity-60" />
                  <p className="font-serif">No administrative actions recorded yet.</p>
                  <p className="text-[11px] text-[#8C8C8C] mt-1">Actions like invitations, removals, and code distributions will appear here automatically.</p>
                </div>
              ) : (
                <div className="divide-y divide-[#E6E2D3]">
                  {auditLogs.map((log) => {
                    const getActionBadge = (action: string) => {
                      switch (action) {
                        case 'seat_invited':
                          return (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono uppercase font-semibold bg-[#EBF2FA] text-[#1E5C9A] border border-[#C5DCF5]">
                              Seat Invited
                            </span>
                          );
                        case 'seat_removed':
                          return (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono uppercase font-semibold bg-[#FAF0F0] text-[#9E2A2B] border border-[#F3D5D5]">
                              Seat Revoked
                            </span>
                          );
                        case 'seat_reactivated':
                          return (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono uppercase font-semibold bg-[#E8F3EB] text-[#2E5E3B] border border-[#D5E5D8]">
                              Seat Restored
                            </span>
                          );
                        case 'org_created':
                          return (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono uppercase font-semibold bg-[#E8F3EB] text-[#2E5E3B] border border-[#D5E5D8]">
                              Org Created
                            </span>
                          );
                        case 'invite_code_copied':
                          return (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono uppercase font-semibold bg-[#F0ECE1] text-[#555] border border-[#DCD7C5]">
                              Code Shared
                            </span>
                          );
                        default:
                          return (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono uppercase font-semibold bg-[#F0ECE1] text-[#555]">
                              {action}
                            </span>
                          );
                      }
                    };

                    return (
                      <div key={log.id} className="py-3 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            {getActionBadge(log.action)}
                            <span className="text-xs text-[#1A1A1A] font-medium">
                              {log.details || 'Admin action executed'}
                            </span>
                          </div>

                          <div className="text-[11px] text-[#737373] flex items-center gap-2 flex-wrap">
                            <span>Admin: <span className="font-mono text-[#4A5D4E]">{log.performedByEmail || log.performedBy}</span></span>
                            {log.affectedEmail && (
                              <span>• Target: <span className="font-mono text-[#1A1A1A]">{log.affectedEmail}</span></span>
                            )}
                          </div>
                        </div>

                        <div className="text-[11px] font-mono text-[#8C8C8C] shrink-0 sm:text-right">
                          {new Date(log.timestamp).toLocaleString()}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-[#E6E2D3] bg-[#F5F2EA]/90 flex items-center justify-between gap-3">
          <div className="text-xs text-[#737373] hidden sm:flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-[#4A5D4E]" />
            <span>Database Rules Enforced: Zero Content Visibility Boundary active</span>
          </div>

          <button
            id="btn-close-org-admin-dashboard"
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-serif font-semibold bg-[#4A5D4E] hover:bg-[#3A4A3E] text-[#FFFFFF] rounded-xl transition-colors shadow-2xs cursor-pointer ml-auto"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

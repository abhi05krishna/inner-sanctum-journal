import React, { useState } from 'react';
import { 
  Building2, 
  Key, 
  PlusCircle, 
  ShieldCheck, 
  ArrowRight, 
  AlertCircle, 
  X, 
  CheckCircle2,
  Sparkles,
  Users
} from 'lucide-react';
import type { Organization, OrgMember } from '../types';
import { 
  getOrganizationByInviteCode, 
  createOrganizationInFirestore, 
  joinOrganizationWithInviteCode 
} from '../firebase';
import { OrgDisclosureModal } from './OrgDisclosureModal';

interface JoinOrgModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: { uid: string; email: string | null; displayName: string | null } | null;
  onJoinedOrganization?: (org: Organization, member: OrgMember) => void;
  onCreatedOrganization?: (org: Organization) => void;
}

export const JoinOrgModal: React.FC<JoinOrgModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onJoinedOrganization,
  onCreatedOrganization,
}) => {
  const [activeTab, setActiveTab] = useState<'join' | 'create'>('join');
  
  // Join Tab State
  const [inviteCode, setInviteCode] = useState('');
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [matchedOrg, setMatchedOrg] = useState<Organization | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [isDisclosureOpen, setIsDisclosureOpen] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  // Create Tab State
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgPlan, setNewOrgPlan] = useState<'starter' | 'team' | 'enterprise'>('team');
  const [newOrgSeats, setNewOrgSeats] = useState(25);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  if (!isOpen || !currentUser) return null;

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;

    setIsVerifyingCode(true);
    setJoinError(null);
    setMatchedOrg(null);

    try {
      const org = await getOrganizationByInviteCode(inviteCode.trim());
      if (!org) {
        setJoinError('Invalid invitation code. Please verify the code with your organization administrator.');
        return;
      }
      setMatchedOrg(org);
      setIsDisclosureOpen(true);
    } catch (err: any) {
      console.error('Error looking up organization:', err);
      setJoinError(err.message || 'Could not verify invitation code');
    } finally {
      setIsVerifyingCode(false);
    }
  };

  const handleConfirmJoinWithDisclosure = async () => {
    if (!matchedOrg || !currentUser) return;

    setIsJoining(true);
    try {
      const { organization, member } = await joinOrganizationWithInviteCode(
        matchedOrg.inviteCode,
        currentUser
      );
      setIsDisclosureOpen(false);
      onClose();
      if (onJoinedOrganization) {
        onJoinedOrganization(organization, member);
      }
    } catch (err: any) {
      console.error('Error joining organization:', err);
      setJoinError(err.message || 'Failed to join organization');
    } finally {
      setIsJoining(false);
    }
  };

  const handleCreateOrgSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName.trim()) return;

    setIsCreating(true);
    setCreateError(null);

    try {
      const createdOrg = await createOrganizationInFirestore(
        newOrgName.trim(),
        newOrgPlan,
        newOrgSeats,
        currentUser
      );
      onClose();
      if (onCreatedOrganization) {
        onCreatedOrganization(createdOrg);
      }
    } catch (err: any) {
      console.error('Error creating organization:', err);
      setCreateError(err.message || 'Failed to create organization');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-xs">
        <div 
          id="join-org-modal-dialog"
          className="relative w-full max-w-lg bg-[#FBF9F5] border border-[#DCD7C5] rounded-2xl shadow-xl overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="p-5 border-b border-[#E6E2D3] bg-[#F5F2EA]/90 flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#4A5D4E]/10 border border-[#4A5D4E]/20 flex items-center justify-center text-[#4A5D4E]">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-serif font-bold text-[#1A1A1A]">
                  Organization & Enterprise Hub
                </h2>
                <p className="text-xs text-[#6B6B6B]">
                  Link an employee seat or create a workspace with Zero Content Visibility.
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
          <div className="flex border-b border-[#E6E2D3] bg-[#FAF9F5] px-5 pt-3 gap-2">
            <button
              id="tab-join-org"
              onClick={() => setActiveTab('join')}
              className={`pb-2.5 px-3 text-xs font-serif font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'join'
                  ? 'border-[#4A5D4E] text-[#4A5D4E]'
                  : 'border-transparent text-[#737373] hover:text-[#1A1A1A]'
              }`}
            >
              <Key className="w-3.5 h-3.5" />
              <span>Join with Invite Code</span>
            </button>

            <button
              id="tab-create-org"
              onClick={() => setActiveTab('create')}
              className={`pb-2.5 px-3 text-xs font-serif font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'create'
                  ? 'border-[#4A5D4E] text-[#4A5D4E]'
                  : 'border-transparent text-[#737373] hover:text-[#1A1A1A]'
              }`}
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Create Organization</span>
            </button>
          </div>

          {/* Body Content */}
          <div className="p-5 sm:p-6 space-y-5">
            {activeTab === 'join' ? (
              <form onSubmit={handleVerifyCode} className="space-y-4">
                <div>
                  <label htmlFor="input-join-invite-code" className="block text-xs font-medium text-[#4A5D4E] mb-1.5">
                    Enter Organization Invite Code
                  </label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#737373]" />
                    <input
                      id="input-join-invite-code"
                      type="text"
                      maxLength={32}
                      placeholder="e.g. ORG-9X42-KM81"
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                      className="w-full pl-9 pr-3 py-2.5 text-sm font-mono uppercase bg-[#FFFFFF] border border-[#DCD7C5] rounded-xl text-[#1A1A1A] placeholder-[#8C8C8C] focus:outline-hidden focus:border-[#4A5D4E]"
                      required
                    />
                  </div>
                  <p className="text-[11px] text-[#737373] mt-1.5">
                    Provided by your company workspace administrator.
                  </p>
                </div>

                {joinError && (
                  <div className="p-3 rounded-xl bg-[#FAF0F0] border border-[#F3D5D5] text-xs text-[#9E2A2B] flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{joinError}</span>
                  </div>
                )}

                <div className="p-3.5 rounded-xl bg-[#F0F5F1] border border-[#D5E5D8] text-xs text-[#2A4D33] space-y-1">
                  <div className="font-semibold flex items-center gap-1.5 text-[#2E5E3B]">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Zero Content Visibility Trust Guarantee</span>
                  </div>
                  <p className="text-[11px] text-[#3D7D4F] leading-relaxed">
                    Joining links your company seat license, but your organization <strong>never sees your reflections, moods, or AI conversations</strong>.
                  </p>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    id="btn-verify-and-review-disclosure"
                    type="submit"
                    disabled={isVerifyingCode || !inviteCode.trim()}
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-serif font-semibold bg-[#4A5D4E] hover:bg-[#3A4A3E] text-[#FFFFFF] rounded-xl transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
                  >
                    <span>{isVerifyingCode ? 'Verifying Code...' : 'Review Privacy & Join'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleCreateOrgSubmit} className="space-y-4">
                <div>
                  <label htmlFor="input-new-org-name" className="block text-xs font-medium text-[#4A5D4E] mb-1.5">
                    Organization / Company Name
                  </label>
                  <input
                    id="input-new-org-name"
                    type="text"
                    maxLength={100}
                    placeholder="e.g. Acme Innovations Corp"
                    value={newOrgName}
                    onChange={(e) => setNewOrgName(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-[#FFFFFF] border border-[#DCD7C5] rounded-xl text-[#1A1A1A] placeholder-[#8C8C8C] focus:outline-hidden focus:border-[#4A5D4E]"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="select-new-org-plan" className="block text-xs font-medium text-[#4A5D4E] mb-1.5">
                      Workspace Tier
                    </label>
                    <select
                      id="select-new-org-plan"
                      value={newOrgPlan}
                      onChange={(e) => {
                        const plan = e.target.value as any;
                        setNewOrgPlan(plan);
                        setNewOrgSeats(plan === 'enterprise' ? 100 : plan === 'team' ? 25 : 10);
                      }}
                      className="w-full px-3 py-2 text-xs bg-[#FFFFFF] border border-[#DCD7C5] rounded-xl text-[#1A1A1A] focus:outline-hidden focus:border-[#4A5D4E] cursor-pointer"
                    >
                      <option value="starter">Starter (10 Seats)</option>
                      <option value="team">Team (25 Seats)</option>
                      <option value="enterprise">Enterprise (100 Seats)</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="input-new-org-seats" className="block text-xs font-medium text-[#4A5D4E] mb-1.5">
                      Total Seat Licenses
                    </label>
                    <input
                      id="input-new-org-seats"
                      type="number"
                      min={1}
                      max={1000}
                      value={newOrgSeats}
                      onChange={(e) => setNewOrgSeats(parseInt(e.target.value) || 10)}
                      className="w-full px-3 py-2 text-xs bg-[#FFFFFF] border border-[#DCD7C5] rounded-xl text-[#1A1A1A] focus:outline-hidden focus:border-[#4A5D4E]"
                    />
                  </div>
                </div>

                {createError && (
                  <div className="p-3 rounded-xl bg-[#FAF0F0] border border-[#F3D5D5] text-xs text-[#9E2A2B] flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{createError}</span>
                  </div>
                )}

                <div className="p-3 rounded-xl bg-[#F5F2EA] border border-[#E6E2D3] text-xs text-[#5A5A5A] leading-relaxed">
                  As the founding organization administrator, you will manage employee seats and review anonymized participation stats. 
                  Database security rules prevent any admin access to employee journal data.
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    id="btn-create-org-submit"
                    type="submit"
                    disabled={isCreating || !newOrgName.trim()}
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-serif font-semibold bg-[#4A5D4E] hover:bg-[#3A4A3E] text-[#FFFFFF] rounded-xl transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>{isCreating ? 'Creating Workspace...' : 'Create Organization Workspace'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Mandatory Employee Privacy Disclosure Screen before joining */}
      <OrgDisclosureModal
        isOpen={isDisclosureOpen}
        onClose={() => setIsDisclosureOpen(false)}
        organization={matchedOrg}
        isJoiningFlow={true}
        onConfirmJoin={handleConfirmJoinWithDisclosure}
        isProcessing={isJoining}
      />
    </>
  );
};

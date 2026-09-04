import React from 'react';
import { 
  ShieldCheck, 
  Lock, 
  EyeOff, 
  CheckCircle2, 
  XCircle, 
  Building2, 
  UserCheck, 
  AlertCircle,
  X,
  FileCheck
} from 'lucide-react';
import type { Organization, OrgMember } from '../types';

interface OrgDisclosureModalProps {
  isOpen: boolean;
  onClose: () => void;
  organization?: Organization | null;
  member?: OrgMember | null;
  isJoiningFlow?: boolean;
  onConfirmJoin?: () => void;
  isProcessing?: boolean;
}

export const OrgDisclosureModal: React.FC<OrgDisclosureModalProps> = ({
  isOpen,
  onClose,
  organization,
  member,
  isJoiningFlow = false,
  onConfirmJoin,
  isProcessing = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div 
        id="org-disclosure-modal-dialog"
        className="relative w-full max-w-2xl bg-[#FBF9F5] border border-[#DCD7C5] rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-[#E6E2D3] bg-[#F5F2EA]/80 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#4A5D4E]/10 border border-[#4A5D4E]/20 flex items-center justify-center text-[#4A5D4E]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono uppercase tracking-wider text-[#4A5D4E] font-semibold">
                  Zero Content Visibility Trust Model
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-serif font-bold text-[#1A1A1A]">
                {isJoiningFlow ? 'Organization Seat & Privacy Disclosure' : 'Your Organization Privacy Guarantee'}
              </h2>
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

        {/* Scrollable Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 text-sm text-[#3E3E3E]">
          {/* Org Header Context */}
          {organization && (
            <div className="p-4 rounded-xl bg-[#FFFFFF] border border-[#E6E2D3] flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <Building2 className="w-5 h-5 text-[#4A5D4E]" />
                <div>
                  <div className="text-xs text-[#737373]">Linked Organization</div>
                  <div className="font-serif font-semibold text-[#1A1A1A] text-base">{organization.name}</div>
                </div>
              </div>
              <div className="text-right">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#4A5D4E]/10 text-[#4A5D4E] border border-[#4A5D4E]/20">
                  {member?.role === 'admin' ? 'Organization Admin' : 'Employee Seat'}
                </span>
              </div>
            </div>
          )}

          {/* Intro Statement */}
          <p className="leading-relaxed text-[#5A5A5A]">
            This application is architected from the ground up around a <strong>strict zero-content-visibility model</strong>. 
            When your company provisions or sponsors an employee seat, they manage licensing and seat allocation, 
            but have <strong>absolute zero access</strong> to any of your journal entries, moods, thoughts, or AI conversations.
          </p>

          {/* Split Comparison Matrix */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* What Org CANNOT See */}
            <div className="p-4 rounded-xl bg-[#FAF0F0] border border-[#F3D5D5] space-y-3">
              <div className="flex items-center gap-2 text-[#9E2A2B] font-semibold text-xs uppercase tracking-wide">
                <EyeOff className="w-4 h-4" />
                <span>What your org CANNOT see (Ever)</span>
              </div>
              <ul className="space-y-2 text-xs text-[#5C2425]">
                <li className="flex items-start gap-2">
                  <XCircle className="w-4 h-4 text-[#C13838] shrink-0 mt-0.5" />
                  <span><strong>Journal entries & titles:</strong> Your private writings, reflections, and drafts.</span>
                </li>
                <li className="flex items-start gap-2">
                  <XCircle className="w-4 h-4 text-[#C13838] shrink-0 mt-0.5" />
                  <span><strong>AI dialogues:</strong> Every question, response, inquiry, and prompt.</span>
                </li>
                <li className="flex items-start gap-2">
                  <XCircle className="w-4 h-4 text-[#C13838] shrink-0 mt-0.5" />
                  <span><strong>Moods & emotions:</strong> Your recorded feelings, tags, and takeaways.</span>
                </li>
                <li className="flex items-start gap-2">
                  <XCircle className="w-4 h-4 text-[#C13838] shrink-0 mt-0.5" />
                  <span><strong>Spotify connections:</strong> Playlists, listening habits, or audio history.</span>
                </li>
                <li className="flex items-start gap-2">
                  <XCircle className="w-4 h-4 text-[#C13838] shrink-0 mt-0.5" />
                  <span><strong>AI embeddings:</strong> Semantic vector representations of your thoughts.</span>
                </li>
              </ul>
            </div>

            {/* What Org CAN See */}
            <div className="p-4 rounded-xl bg-[#F0F5F1] border border-[#D5E5D8] space-y-3">
              <div className="flex items-center gap-2 text-[#2E5E3B] font-semibold text-xs uppercase tracking-wide">
                <UserCheck className="w-4 h-4" />
                <span>What your org CAN see (Metadata only)</span>
              </div>
              <ul className="space-y-2 text-xs text-[#2A4D33]">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#3D7D4F] shrink-0 mt-0.5" />
                  <span><strong>Seat status:</strong> Whether your seat is Active, Pending, or Removed.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#3D7D4F] shrink-0 mt-0.5" />
                  <span><strong>Account metadata:</strong> Your work email address and display name.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#3D7D4F] shrink-0 mt-0.5" />
                  <span><strong>Activity timestamp:</strong> The calendar date of your last session (e.g. "Aug 31") — with zero content.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#3D7D4F] shrink-0 mt-0.5" />
                  <span><strong>Aggregate metrics:</strong> Anonymized team totals (e.g. "12 of 15 members journaled this week").</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Seat Policy & Data Ownership Callout */}
          <div className="p-4 rounded-xl bg-[#FFFFFF] border border-[#E6E2D3] space-y-2.5">
            <div className="flex items-center gap-2 text-[#4A5D4E] font-semibold text-sm">
              <Lock className="w-4 h-4" />
              <span>Independent Account Ownership & Seat Policy</span>
            </div>
            <p className="text-xs text-[#5A5A5A] leading-relaxed">
              Every user is fundamentally an individual account tied to their own Google Sign-In UID. 
              Only an organization administrator can remove or manage your organization seat. 
              <strong> If your seat is removed, your personal journal entries remain 100% intact, private, and fully accessible under your own account.</strong> 
              Your organization cannot delete, lock, or export your personal data.
            </p>
          </div>

          {/* Database Rule Security Assurance */}
          <div className="p-3.5 rounded-xl bg-[#F7F5EE] border border-[#E0DBCB] flex items-start gap-3">
            <ShieldCheck className="w-4 h-4 text-[#4A5D4E] shrink-0 mt-0.5" />
            <div className="text-xs text-[#6B6B6B] leading-relaxed">
              <strong>Cryptographic & Database Enforcement:</strong> This guarantee is not a cosmetic UI switch. 
              Cloud Firestore security rules enforce <code>request.auth.uid == userId</code> strictly on all <code>users/{'{userId}'}/entries/*</code> collections. 
              No admin role bypass exists in the database security architecture.
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-[#E6E2D3] bg-[#F5F2EA]/80 flex items-center justify-end gap-3">
          {isJoiningFlow ? (
            <>
              <button
                id="btn-cancel-org-disclosure"
                type="button"
                onClick={onClose}
                disabled={isProcessing}
                className="px-4 py-2 text-xs font-serif font-semibold text-[#666666] hover:text-[#1A1A1A] hover:bg-[#E6E2D3] rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="btn-accept-org-disclosure"
                type="button"
                onClick={onConfirmJoin}
                disabled={isProcessing}
                className="inline-flex items-center gap-2 px-5 py-2 text-xs font-serif font-semibold bg-[#4A5D4E] hover:bg-[#3A4A3E] text-[#FFFFFF] rounded-xl transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
              >
                <FileCheck className="w-4 h-4" />
                <span>{isProcessing ? 'Linking Seat...' : 'I Understand & Link Seat'}</span>
              </button>
            </>
          ) : (
            <button
              id="btn-dismiss-org-disclosure"
              type="button"
              onClick={onClose}
              className="px-5 py-2 text-xs font-serif font-semibold bg-[#4A5D4E] hover:bg-[#3A4A3E] text-[#FFFFFF] rounded-xl transition-colors shadow-2xs cursor-pointer"
            >
              Understood
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

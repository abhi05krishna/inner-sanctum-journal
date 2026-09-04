import React from 'react';
import { 
  X, 
  ShieldCheck, 
  Lock, 
  KeyRound, 
  Database, 
  Terminal, 
  FileCode2, 
  CheckCircle2,
  Server
} from 'lucide-react';

interface SecurityModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SecurityArchitectureModal: React.FC<SecurityModalProps> = ({
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="fixed inset-0 bg-[#1A1A1A]/40 backdrop-blur-xs transition-opacity" 
        onClick={onClose} 
      />

      <div className="relative w-full max-w-3xl rounded-2xl bg-[#FDFCF9] p-6 shadow-2xl border border-[#E6E2D3] z-10 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#E6E2D3]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F0ECE1] text-[#4A5D4E] border border-[#E6E2D3]">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-serif font-semibold text-[#1A1A1A]">
                Agentic Threat Model & Security Controls
              </h2>
              <p className="text-xs text-[#7C786A]">
                OWASP Top 10 for LLMs • Firebase RBAC • Secret Manager Hygiene
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-[#7C786A] hover:text-[#1A1A1A] hover:bg-[#F0ECE1] rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Scroll Content */}
        <div className="flex-1 overflow-y-auto py-5 space-y-6 text-xs sm:text-sm">
          {/* Section 1: Threat Model Summary Table */}
          <div>
            <h3 className="text-xs font-serif font-bold uppercase tracking-wider text-[#1A1A1A] mb-2.5 flex items-center gap-1.5">
              <Lock className="h-4 w-4 text-[#4A5D4E]" />
              <span>1. The 5 Threat Zones & Active Countermeasures</span>
            </h3>
            
            <div className="overflow-x-auto rounded-xl border border-[#E6E2D3] bg-[#FFFFFF]">
              <table className="w-full text-left text-[11px] sm:text-xs">
                <thead className="bg-[#F9F7F0] border-b border-[#E6E2D3] text-[#1A1A1A] font-serif font-semibold">
                  <tr>
                    <th className="p-2.5">Threat Zone</th>
                    <th className="p-2.5">Identified Risk</th>
                    <th className="p-2.5">Active Countermeasure</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E6E2D3]/60 text-[#7C786A]">
                  <tr>
                    <td className="p-2.5 font-medium text-[#1A1A1A]">Input Surfaces</td>
                    <td className="p-2.5">Prompt injection / Malicious payload tampering</td>
                    <td className="p-2.5">Strict schema validation; payload size caps (`10MB`); inputs treated as plain data.</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-medium text-[#1A1A1A]">Planning & Reasoning</td>
                    <td className="p-2.5">System prompt hijacking / hallucinated tool execution</td>
                    <td className="p-2.5">Hardened system instructions with explicit behavioral guardrails per reflection mode.</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-medium text-[#1A1A1A]">Tool Execution & API</td>
                    <td className="p-2.5">Gemini API failure / 429/503 service exhaustion</td>
                    <td className="p-2.5">Resilient Fallback Ladder (`3.6-flash` &rarr; `3.1-flash-lite` &rarr; `flash-latest` &rarr; `3.7-flash`).</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-medium text-[#1A1A1A]">Memory & State</td>
                    <td className="p-2.5">Cross-user data leakage / unauthorized day access</td>
                    <td className="p-2.5">Owner-bound Firestore Security Rules (<code>request.auth.uid == userId</code>) enforcing <code>/users/&#123;userId&#125;/entries/&#123;date&#125;</code> and <code>messages</code> subcollections.</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-medium text-[#1A1A1A]">Inter-System & Tokens</td>
                    <td className="p-2.5">Hardcoded credentials / token leakage in client JS</td>
                    <td className="p-2.5">Server-side proxying of `GEMINI_API_KEY`; federated passwordless Google Auth.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 2: Deployed Firestore Security Rules */}
          <div>
            <h3 className="text-xs font-serif font-bold uppercase tracking-wider text-[#1A1A1A] mb-2 flex items-center gap-1.5">
              <Database className="h-4 w-4 text-[#4A5D4E]" />
              <span>2. Deployed Firestore Security Rules (`firestore.rules`)</span>
            </h3>
            <pre className="rounded-xl bg-[#1A1A1A] text-[#FDFCF9] p-3.5 font-mono text-[11px] overflow-x-auto">
{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;

      // Calendar-based entries (YYYY-MM-DD)
      match /entries/{date} {
        allow read, write: if request.auth != null && request.auth.uid == userId;

        // Nested multi-turn dialogue subcollection
        match /messages/{messageId} {
          allow read, write: if request.auth != null && request.auth.uid == userId;
        }
      }

      // Legacy fallback
      match /journals/{journalId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}`}
            </pre>
          </div>

          {/* Section 3: Secret Manager & Cloud Run Verification */}
          <div>
            <h3 className="text-xs font-serif font-bold uppercase tracking-wider text-[#1A1A1A] mb-2 flex items-center gap-1.5">
              <Terminal className="h-4 w-4 text-[#996515]" />
              <span>3. Secret Manager & Cloud Run Deploy Bindings</span>
            </h3>
            <pre className="rounded-xl bg-[#1A1A1A] text-[#FDFCF9] p-3.5 font-mono text-[11px] overflow-x-auto">
{`# Create Secret & add IAM Accessor Role for Cloud Run Service Account
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"
echo -n "YOUR_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

gcloud secrets add-iam-policy-binding GEMINI_API_KEY \\
  --member="serviceAccount:YOUR_PROJECT_NUMBER-compute@developer.gserviceaccount.com" \\
  --role="roles/secretmanager.secretAccessor"

# Deploy to Cloud Run with Challenge Verification Tag
gcloud run deploy gemini-journal-reflections \\
  --source . \\
  --region us-central1 \\
  --set-secrets GEMINI_API_KEY=GEMINI_API_KEY:latest \\
  --update-labels=dev-tutorial=cloud-run-ai-challenge`}
            </pre>
          </div>

          {/* Enterprise Zero Content Visibility Architecture */}
          <div>
            <h3 className="text-xs font-serif font-bold uppercase tracking-wider text-[#1A1A1A] mb-2 flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-[#4A5D4E]" />
              <span>4. Enterprise Zero Content Visibility Standard</span>
            </h3>
            <div className="rounded-xl bg-[#F5F2EA] border border-[#E6E2D3] p-3.5 text-xs text-[#555555] space-y-2 leading-relaxed">
              <p>
                <strong>Structural Data Isolation:</strong> Organization records exist solely at <code>organizations/{'{orgId}'}</code> and <code>organizations/{'{orgId}'}/members/{'{userId}'}</code> containing account-level metadata only (email, seat status, last active date).
              </p>
              <p>
                <strong>Zero Admin Bypass in Database Rules:</strong> The user's personal journal path <code>users/{'{userId}'}/entries/*</code> requires <code>request.auth.uid == userId</code> with zero admin-role bypass. Even organization administrators have zero read, write, or export access to employee journal content.
              </p>
              <p>
                <strong>Seat Revocation Independence:</strong> If an org administrator revokes or removes an employee seat, the employee's personal reflections remain 100% intact, private, and accessible under their individual Google account.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-[#E6E2D3]">
          <span className="text-xs text-[#7C786A] flex items-center gap-1 font-serif">
            <CheckCircle2 className="h-3.5 w-3.5 text-[#4A5D4E]" />
            <span>Zero Insecure Defaults Verified</span>
          </span>
          <button
            onClick={onClose}
            className="rounded-lg bg-[#4A5D4E] px-4 py-1.5 text-xs font-medium text-[#FDFCF9] hover:bg-[#3C4C3F] transition-colors shadow-2xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

# Gemini Journal & Reflections: Inner Sanctum

A production-grade, privacy-first personal reflection sanctuary and multi-turn Socratic journaling web application powered by **Google Gemini 3.6 Flash**, **Firebase Authentication (Google Sign-In)**, and **Cloud Firestore**, engineered for high-availability deployment on **Google Cloud Run**.

---

## 📋 Table of Contents
1. [Architecture & Unique Features Built Beyond Base Spec](#-architecture--unique-features-built-beyond-base-spec)
2. [Prerequisites & Environment Setup](#-prerequisites--environment-setup)
3. [Secret Management with Google Cloud Secret Manager](#-secret-management-with-google-cloud-secret-manager)
4. [Spotify Developer Application Setup](#-spotify-developer-application-setup)
5. [Cloud Firestore Security Rules](#-cloud-firestore-security-rules)
6. [Cloud Run Deployment & Verification Label](#-cloud-run-deployment--verification-label)
7. [Security & Robustness Hardening Standards](#-security--robustness-hardening-standards)
8. [Local Development & Testing](#-local-development--testing)

---

## 🌟 Architecture & Unique Features (Built Beyond Base Spec)

Inner Sanctum transforms digital journaling from a static text repository into an ambient, emotionally grounded, and cognitively supportive reflection partner:

### 1. Calendar-First Navigation Data Model
- **Strict Date-Keyed Hierarchy**: Stored at `users/{userId}/entries/{YYYY-MM-DD}`, maintaining one authoritative document per calendar day per user. Multi-turn reflective dialogues live in an isolated subcollection (`messages/{messageId}`) under that calendar day.
- **Interactive Calendar Grid**: Full monthly navigation with clean visual hierarchy, today highlighting, and quick-reflection launch actions.
- **Glitch-Free Entry Indicators**: Calendar cells calculate `hasSavedContent` using strict content verification (valid turns, custom title, summary, or mood reason) rather than empty draft instances. Blank dates show zero false indicators or phantom metadata bars.
- **Direct Per-Date Deletion**: Each calendar day cell and archive card features a direct delete action with confirmation modal, safely moving entries to Recently Deleted without leaving the calendar view.

### 2. Two-Stage Soft-Delete & 15-Day Trash Recovery
- **Accidental Deletion Protection**: Deleting an entry sets `isDeleted: true` and records a timestamp (`deletedAt: ISOString`).
- **Dedicated Trash Archive**: The slide-out Navigation Drawer features a **Recently Deleted** folder listing deleted entries, countdowns for remaining recovery days (15-day window), and one-click **Restore** or **Permanently Delete** capabilities.
- **Calendar & Search Exclusion**: Soft-deleted entries are immediately excluded from active calendar statistics, monthly archive cards, streaks, and semantic search results.

### 3. In-Card Reflection Pagination
- **Multi-Turn Excerpt Chunking**: In the **Monthly Archive & Search** view, extensive reflections, summaries, key takeaways, and action items are automatically divided into bite-sized pages.
- **Self-Contained Controls**: Each archive card provides independent `[Page X of Y]` pagination with previous and next arrow buttons. Click events use strict stop-propagation so browsing card pages does not trigger parent date selection.

### 4. Interactive App Tour (Every Login)
- **12-Step Guided Walkthrough**: Welcomes users upon authentication and explains core sanctuary features, including reflection modes, mood tracking, weather atmosphere, Spotify pairing, and organization privacy.
- **Every Login Activation**: Displays every time the user logs in or re-authenticates to ensure continuous feature discoverability.
- **Zero-Friction Dismissal**: Fully skippable at any step via `Escape`, the close button (`✕`), or "Skip Tour". Dismissing hides the walkthrough for the remainder of the session.
- **On-Demand Drawer Trigger**: Accessible at any time via the **Interactive Walkthrough** button in the slide-out navigation drawer.

### 5. Personalized Welcome Back Prompt (Every Login)
- **Streak & Continuity Awareness**: Appears on every app load, recognizing whether the user reflected yesterday to celebrate active streaks or gently invite a fresh reflection for today.
- **4.5-Second Auto-Dismiss Progress Bar**: Features a subtle progress bar at the base of the modal that smoothly elapses over 4.5 seconds before auto-closing, or can be dismissed immediately via "Maybe later".
- **One-Click Reflect Action**: Clicking **"Reflect Today"** immediately opens today's reflection canvas.

### 6. Agentic Spotify Integration via Native Function Calling
- **True Agentic Tool Calling**: Gemini detects emotional shifts or reflective milestones and autonomously invokes the registered `suggest_music` tool using native function declarations (`FunctionDeclaration`). Music is never parsed from raw string patterns or simulated JSON flags.
- **Spotify Web API Proxy**: Secure server-side proxy handles client credentials and OAuth user tokens to query tracks and playlists.
- **Interactive Playback Preview & Web Embeds**: Music cards display album art, artist credits, genre/mood reasoning, open-in-Spotify buttons, and embedded 30-second audio previews or Spotify web player widgets.

### 7. Dual Ambient Visual Drivers & Live Weather Integration
- **Video & Canvas Atmosphere Modes**: Users can switch seamlessly between rich looping ambient nature backgrounds (sunlit forest, gentle rain, starry twilight, autumn dusk) and interactive procedural HTML5 canvas particle engines.
- **Open-Meteo Weather Proxy**: Server-side proxy fetches local atmospheric conditions (clear, rain, overcast, storm, snow) based on coordinates or city name, dynamically adapting the editor's visual tone without exposing client IPs.

### 8. Native Semantic Vector Search
- **Embedding Generation**: Reflective dialogues and synthesized summaries are vectorized via `text-embedding-004` into dense vector embeddings stored directly in Firestore.
- **Cosine Similarity Ranking**: Search input is embedded on the server and compared against user entries, surfacing conceptually related reflections even when exact keywords differ (e.g., searching *"moments of clarity"* identifies entries discussing *"peaceful morning coffee"*).

### 9. Zero-Content-Visibility Enterprise & Organization Licensing
- **Corporate Account Provisioning**: Organizations can purchase and allocate employee seats (`organizations/{orgId}/members/{userId}`).
- **Strict Privacy Guarantee**: Firestore security rules structurally guarantee that organization administrators **CANNOT** read, query, or access any employee's private reflections, mood data, or conversation transcripts under any circumstances (`users/{userId}/entries/*` remains exclusively bound to `request.auth.uid == userId`).
- **Transparency & Disclosure**: Employees are shown an explicit disclosure modal outlining what the company can see (seat status, email, join date) and what is strictly private (all journal entries, mood, and audio).
- **Admin Audit Trail**: Seat actions (`seat_invited`, `seat_removed`, `seat_reactivated`) append immutable audit logs to `organizations/{orgId}/auditLog/{logId}`.

### 10. Weekly Review Synthesis & Daily Flashcards
- **Multi-Day Longitudinal Synthesis**: Analyzes an entire week of reflections and produces an executive overview, primary themes, emotional trajectories, and key takeaways.
- **Interactive Daily Flashcards**: Allows the author to flip through individual day cards within the week, reviewing summaries, turns, and emotional milestones.

### 11. Reflection Universe Interactive Constellation
- **Interactive 2D Cosmos**: Maps journal entries as glowing stars in an orbital universe canvas. Proximity reflects semantic relatedness, with color denoting detected mood.
- **Pan, Orbit & Focus**: Full physics-driven zooming, panning, keyword filtering, and star selection to re-open historical reflections.

### 12. Shareable Reflection Quote Cards
- **High-Resolution Card Generator**: Converts chosen reflection quotes and takeaways into aesthetic visual cards ready for downloading or sharing, keeping the rest of the journal entirely confidential.

---

## ⚙️ Prerequisites & Environment Setup

### 1. Google Cloud Project & CLI
Install and authenticate the [Google Cloud SDK (`gcloud` CLI)](https://cloud.google.com/sdk/docs/install):
```bash
# Authenticate with your Google Cloud account
gcloud auth login

# Set your target Google Cloud project
gcloud config set project YOUR_PROJECT_ID
```

### 2. Enable Required Google Cloud APIs
Enable Cloud Run, Cloud Secret Manager, Cloud Firestore, and Artifact Registry:
```bash
gcloud services enable \
  run.googleapis.com \
  secretmanager.googleapis.com \
  firestore.googleapis.com \
  artifactregistry.googleapis.com
```

### 3. Provision Cloud Firestore
If Firestore is not yet initialized in your Google Cloud project:
```bash
gcloud firestore databases create --location=us-central1 --type=firestore-native
```

---

## 🔐 Secret Management with Google Cloud Secret Manager

All sensitive operational credentials must be stored in Google Cloud Secret Manager and dynamically mapped to Cloud Run container environment variables.

### 1. Create Secrets in Secret Manager
```bash
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"
gcloud secrets create SPOTIFY_CLIENT_ID --replication-policy="automatic"
gcloud secrets create SPOTIFY_CLIENT_SECRET --replication-policy="automatic"
```

### 2. Populate Secret Versions
```bash
# Add your Gemini API Key
echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

# Add your Spotify Client ID
echo -n "YOUR_SPOTIFY_CLIENT_ID" | gcloud secrets versions add SPOTIFY_CLIENT_ID --data-file=-

# Add your Spotify Client Secret
echo -n "YOUR_SPOTIFY_CLIENT_SECRET" | gcloud secrets versions add SPOTIFY_CLIENT_SECRET --data-file=-
```

### 3. Grant Cloud Run Runtime Service Account Permissions
Retrieve your project number and grant `roles/secretmanager.secretAccessor` to the compute service account:
```bash
PROJECT_NUMBER=$(gcloud projects describe $(gcloud config get-value project) --format="value(projectNumber)")

gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding SPOTIFY_CLIENT_ID \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding SPOTIFY_CLIENT_SECRET \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## 🎧 Spotify Developer Application Setup

To enable mood-grounded music recommendations and playback previews:

1. **Register an Application**:
   - Navigate to the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard).
   - Click **Create App**.
   - Set **App Name** (e.g., `Inner Sanctum Reflection Companion`) and App Description.
   - Select **Web API** under APIs/SDKs to use.

2. **Configure Redirect URIs**:
   - In app settings, add your authorized redirect URIs:
     - Local development: `http://localhost:3000/api/spotify/callback` and `http://localhost:3000`
     - Production: `https://<YOUR-CLOUD-RUN-SERVICE-URL>/api/spotify/callback` and `https://<YOUR-CLOUD-RUN-SERVICE-URL>`
   - Save the configuration.

3. **Store Credentials in Secret Manager**:
   - Copy **Client ID** and **Client Secret**.
   - Add them to Secret Manager as shown in the previous section.

4. **Requested Read-Only OAuth Scopes**:
   - `user-read-private`: Verify country catalog compatibility.
   - `user-read-email`: Verify account connection.
   - `user-top-read`: Contextualize recommendations based on top artists and genres.
   - `playlist-read-private`: Retrieve curated ambient and reflective playlists.

> [!NOTE]
> While the Spotify app is in "Development Mode", authorize testers by adding their Spotify email under **Dashboard > Settings > User Management**. Full Spotify Web Playback streaming requires an active Spotify Premium subscription on the user account.

---

## 🛡️ Cloud Firestore Security Rules

Deploy the following security rules via Firebase CLI (`firebase deploy --only firestore:rules`) or the Google Cloud Console. These rules enforce strict owner-isolation for entries, subcollection cascading, and zero-content visibility for organization administrators:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Global catch-all default deny for defense-in-depth
    match /{document=**} {
      allow read, write: if false;
    }

    // User profile isolation (ABSOLUTE ISOLATION: Zero admin or organization bypass)
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;

      // Calendar-based daily journal entries: users/{userId}/entries/{YYYY-MM-DD}
      // CRITICAL: request.auth.uid == userId ONLY. No org role or admin bypass condition exists here.
      match /entries/{date} {
        allow read, write: if request.auth != null && request.auth.uid == userId;

        // Multi-turn conversation messages nested under each day's document
        match /messages/{messageId} {
          allow read, write: if request.auth != null && request.auth.uid == userId;
        }
      }

      // Spotify OAuth tokens and settings isolation (strictly owner-bound)
      match /spotifyAuth/{docId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }

      // Interaction logs (strictly owner-bound)
      match /interactions/{interactionId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }

    // Organization and Enterprise Account Management
    match /organizations/{orgId} {
      // Authenticated users can create an organization
      allow create: if request.auth != null && request.resource.data.createdBy == request.auth.uid;
      
      // Read access to org metadata for authenticated users
      allow read: if request.auth != null;

      // Only org admins/creators can update or delete org metadata
      allow update, delete: if request.auth != null && (
        resource.data.createdBy == request.auth.uid ||
        (exists(/databases/$(database)/documents/organizations/$(orgId)/members/$(request.auth.uid)) &&
         get(/databases/$(database)/documents/organizations/$(orgId)/members/$(request.auth.uid)).data.role == 'admin')
      );

      // Organization Members (Account-level seat metadata ONLY - NEVER journal content)
      match /members/{memberId} {
        // Members can read their own seat record; Org Admins can read all member seat records in their org
        allow read: if request.auth != null && (
          request.auth.uid == memberId ||
          (exists(/databases/$(database)/documents/organizations/$(orgId)/members/$(request.auth.uid)) &&
           get(/databases/$(database)/documents/organizations/$(orgId)/members/$(request.auth.uid)).data.role == 'admin') ||
          get(/databases/$(database)/documents/organizations/$(orgId)).data.createdBy == request.auth.uid
        );

        // Admins can invite/add members; users can create their own member record when joining via invite
        allow create: if request.auth != null && (
          request.auth.uid == memberId ||
          (exists(/databases/$(database)/documents/organizations/$(orgId)/members/$(request.auth.uid)) &&
           get(/databases/$(database)/documents/organizations/$(orgId)/members/$(request.auth.uid)).data.role == 'admin') ||
          get(/databases/$(database)/documents/organizations/$(orgId)).data.createdBy == request.auth.uid
        );

        // ONLY Org Admins can update/remove member seat status. Employees CANNOT unlink/delete their own seat record.
        allow update, delete: if request.auth != null && (
          (exists(/databases/$(database)/documents/organizations/$(orgId)/members/$(request.auth.uid)) &&
           get(/databases/$(database)/documents/organizations/$(orgId)/members/$(request.auth.uid)).data.role == 'admin') ||
          get(/databases/$(database)/documents/organizations/$(orgId)).data.createdBy == request.auth.uid
        );
      }

      // Organization Seat Invitations
      match /invites/{inviteId} {
        allow read: if request.auth != null;
        allow create, update, delete: if request.auth != null && (
          (exists(/databases/$(database)/documents/organizations/$(orgId)/members/$(request.auth.uid)) &&
           get(/databases/$(database)/documents/organizations/$(orgId)/members/$(request.auth.uid)).data.role == 'admin') ||
          get(/databases/$(database)/documents/organizations/$(orgId)).data.createdBy == request.auth.uid
        );
      }

      // Organization Admin Audit Trail (Account/Seat actions ONLY - Zero journal content)
      match /auditLog/{logId} {
        // Only Org Admins / creator can read or record audit trail entries
        allow read, write: if request.auth != null && (
          (exists(/databases/$(database)/documents/organizations/$(orgId)/members/$(request.auth.uid)) &&
           get(/databases/$(database)/documents/organizations/$(orgId)/members/$(request.auth.uid)).data.role == 'admin') ||
          get(/databases/$(database)/documents/organizations/$(orgId)).data.createdBy == request.auth.uid
        );
      }
    }
  }
}
```

---

## 🚀 Cloud Run Deployment & Verification Label

### 1. Build and Deploy to Google Cloud Run
Deploy the application directly from source. Cloud Build compiles the TypeScript client bundle, packages the standalone CommonJS server (`dist/server.cjs`), and binds runtime secrets:

```bash
gcloud run deploy inner-sanctum-journal \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-secrets GEMINI_API_KEY=GEMINI_API_KEY:latest,SPOTIFY_CLIENT_ID=SPOTIFY_CLIENT_ID:latest,SPOTIFY_CLIENT_SECRET=SPOTIFY_CLIENT_SECRET:latest \
  --port 3000
```

### 2. Apply Mandatory Campaign Verification Label
Update the Cloud Run service with the required label for challenge verification:

```bash
gcloud run services update inner-sanctum-journal \
  --update-labels=dev-tutorial=cloud-run-ai-challenge \
  --region=us-central1
```

---

## 🔒 Security & Robustness Hardening Standards

The system adheres to the OWASP Top 10 for Web Applications and OWASP Top 10 for LLMs:

| Mitigation Control | Architectural Implementation |
| :--- | :--- |
| **Startup Secret Fail-Fast** | `validateStartupSecrets()` verifies at container boot that `GEMINI_API_KEY`, `SPOTIFY_CLIENT_ID`, and `SPOTIFY_CLIENT_SECRET` are non-empty strings. Prevents silent misconfigured launches. |
| **Input Boundaries & Sanitization** | `INPUT_LIMITS` rejects oversized payloads on all routes (`4,000` chars/message, `120` chars/title, `300` chars/search query, `50` turns max), backed by client HTML `maxLength` attributes. |
| **Model Resilience Fallback Ladder** | `generateContentWithFallback` cycles through a 4-tier model ladder (`gemini-3.6-flash` → `gemini-3.1-flash-lite` → `gemini-flash-latest` → `gemini-3.7-flash`) on HTTP `503`, `429`, or `500` status codes before surfacing an error. |
| **Zero-Content Employee Privacy** | Organization admins manage seats and billing, but Firestore security rules structurally forbid any organization query against `users/{userId}/entries/*`. Clear disclosures inform employees prior to joining. |
| **Safe Error Extraction** | Client-side error handling uses `extractErrorMessage()` to parse nested API error payloads into clear human-readable strings, preventing raw `[object Object]` displays. |
| **React Error Boundaries** | Hierarchical boundaries wrap the application root and heavy interactive modules (Constellation Universe canvas, Calendar view, Journal editor) to isolate errors and prevent white-screen crashes. |
| **Pristine Production Build** | TypeScript compiler (`tsc --noEmit`) and Vite/esbuild run with **0 errors and 0 warnings**. Zero client-side debug statements or mock placeholders exist in production code. |

---

## 💻 Local Development & Testing

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Local Environment Variables
Create a `.env` file at the project root:
```env
GEMINI_API_KEY=your_gemini_api_key_here
SPOTIFY_CLIENT_ID=your_spotify_client_id_here
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret_here
```

### 3. Start Local Development Server
```bash
npm run dev
```
The server will start at `http://localhost:3000` with Vite middleware and backend endpoints active.

### 4. Run Build & Typecheck Verifications
```bash
# Verify TypeScript without emitting output
npm run lint

# Compile production bundle
npm run build
```

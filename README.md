# Gemini Journal & Reflections

A production-grade, privacy-first personal reflection and multi-turn Socratic journaling web application powered by **Google Gemini 3.6 Flash**, **Firebase Authentication (Google Sign-In)**, and **Cloud Firestore**, designed for secure deployment on **Google Cloud Run**.

---

## 📋 Table of Contents
1. [Architecture & Unique Features](#-architecture--unique-features-built-beyond-base-spec)
2. [Prerequisites & Environment Setup](#-prerequisites--environment-setup)
3. [Secret Management with Google Cloud Secret Manager](#-secret-management-with-google-cloud-secret-manager)
4. [Spotify Developer Application Setup](#-spotify-developer-application-setup)
5. [Cloud Firestore Security Rules](#-cloud-firestore-security-rules)
6. [Cloud Run Deployment & Verification Label](#-cloud-run-deployment--verification-label)
7. [Security & Robustness Hardening Standards](#-security--robustness-hardening-standards)
8. [Local Development](#-local-development)

---

## 🌟 Architecture & Unique Features (Built Beyond Base Spec)

This platform elevates digital journaling from a simple static text box into an intelligent, ambient, and mathematically grounded reflective companion:

- 📅 **Calendar-First Navigation Data Model**:
  Strict adherence to a date-keyed hierarchy (`users/{userId}/entries/{YYYY-MM-DD}`). Multi-turn reflective dialogues live in an isolated subcollection (`messages/{messageId}`) under that calendar day. Every date is accessible via an interactive month-grid calendar with entry status dots, mood badges, and prompt triggers.
- 🌤️ **Agentic Mood & Weather Ambient Theming**:
  Reflections adapt visually to the author's emotional state and environment. As Gemini evaluates entry sentiment and mood, the UI subtly adjusts between curated themes (*Serene Sage, Warm Solstice, Deep Twilight, Mist Grey*), paired with ambient local weather conditions retrieved via secure server-side weather proxies.
- 🔍 **Semantic Search with Native Firestore Vector Search**:
  Features vector embedding search powered by `text-embedding-004`. Journal entries and reflection transcripts are vectorized into dense embeddings, stored directly in Firestore, and indexed for semantic similarity queries (e.g., searching *"moments of creative flow"* surfaces matching entries even if exact keywords never appear).
- 🎵 **Agentic Spotify Suggestions via Native Function Calling**:
  Music suggestions are **not** hardcoded JSON tags or regex hacks. Gemini autonomously invokes a registered tool (`suggest_music`) via native function declarations when it detects an emotional pivot or reflective juncture, recommending mood-tailored Spotify tracks and playlists.
- 🏢 **Zero-Content-Visibility Enterprise & Organization Model**:
  Supports corporate/team seat management (`organizations/{orgId}/members/{userId}`) while cryptographically and structurally guaranteeing **zero employer visibility** into personal entries, mood data, or reflections. Admins can invite, provision, and revoke seats, but Firestore rules strictly forbid any organization role from reading `users/{userId}/entries/*`.
- 🗂️ **Weekly Reflection Flashcards & Executive Synthesis**:
  Generates multi-perspective weekly flashcards summarizing themes, emotional milestones, key lessons, and suggested focus areas across 7-day calendar arcs.
- 🌌 **Reflection Universe Interactive Constellation**:
  Visualizes reflections as an interactive cosmic constellation canvas. Each entry is plotted based on semantic similarity and emotional resonance, allowing users to orbit, pan, search, and click stars to reopen historical dialogues.
- 🧠 **RAG-Enhanced Longitudinal Reflections**:
  Leverages Retrieval-Augmented Generation to ground ongoing dialogues in historical context. When reflecting on current struggles or aspirations, Gemini draws upon semantic parallels from prior months to offer perspective on personal growth.
- 🎙️ **Voice Input**:
  Seamless Web Speech API integration with live interim transcription, enabling hands-free reflective dictation.
- 📇 **Shareable Reflection Cards**:
  Allows users to export beautifully formatted, styled reflection quote cards suitable for saving or sharing, while keeping the full journal private.
- 🛡️ **Robustness & Defense-in-Depth Hardening**:
  Fail-fast server startup secret validation, uniform input length limits (server & client), resilient 4-stage model fallback ladder (`3.6-flash` → `3.1-flash-lite` → `flash-latest` → `3.7-flash`), top-level and section-level React Error Boundaries, and immutable organization admin audit logging.

---

## ⚙️ Prerequisites & Environment Setup

### 1. Google Cloud Project & Tools
Ensure you have the [Google Cloud SDK (`gcloud` CLI)](https://cloud.google.com/sdk/docs/install) installed and authenticated:
```bash
# Authenticate gcloud CLI
gcloud auth login

# Set your active Google Cloud project
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
If you have not already created a Firestore database in your Google Cloud project:
```bash
gcloud firestore databases create --location=us-central1 --type=firestore-native
```

---

## 🔐 Secret Management with Google Cloud Secret Manager

All sensitive API keys and client credentials must be managed via Google Cloud Secret Manager and injected at runtime as environment variables.

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

### 3. Grant Cloud Run Runtime Service Account Access
Retrieve your project number and bind the `secretmanager.secretAccessor` IAM role to the default Compute service account:
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

To enable mood-grounded music suggestions, set up an application on the Spotify Developer Dashboard:

1. **Create an App**:
   - Go to the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard).
   - Log in and click **Create App**.
   - Set **App Name** (e.g., `Gemini Journal Companion`) and description.
   - Set **Which API/SDKs are you planning to use?** to **Web API**.

2. **Configure Redirect URIs**:
   - In your app settings, add your authorized Redirect URIs:
     - Local development: `http://localhost:3000/api/spotify/callback` and `http://localhost:3000`
     - Production: `https://<YOUR-CLOUD-RUN-SERVICE-URL>/api/spotify/callback` and `https://<YOUR-CLOUD-RUN-SERVICE-URL>`
   - Save changes.

3. **Retrieve Credentials**:
   - Copy the **Client ID** and click **View client secret** to copy the **Client Secret**.
   - Add these values to Secret Manager as shown in the previous section.

4. **OAuth Scopes Used**:
   The application requests minimal, read-only scopes:
   - `user-read-private`: Fetch display name and user country for music catalog compatibility.
   - `user-read-email`: Verify account linkage.
   - `user-top-read`: Ground recommendations in user music taste.
   - `playlist-read-private`: Read playlists for contextual suggestions.

> [!NOTE]
> **Spotify Development Mode & Premium Requirement**:
> While an app is in Spotify's "Development Mode", only users explicitly added under **Dashboard > Settings > User Management** can authorize. Additionally, Spotify Web Playback SDK or full playback streaming features require an active **Spotify Premium subscription** on the developer/tester account.

---

## 🛡️ Cloud Firestore Security Rules

Deploy the following production rules via Firebase CLI (`firebase deploy --only firestore:rules`) or the Google Cloud Console. These rules enforce complete user isolation, calendar-based hierarchy, and zero-content visibility for organization administrators:

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

      // Interaction logs if needed (strictly owner-bound)
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
Deploy the application directly from source. Cloud Build will containerize the application, resolve Node.js dependencies, and bind the runtime secrets:

```bash
gcloud run deploy gemini-journal-reflections \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-secrets GEMINI_API_KEY=GEMINI_API_KEY:latest,SPOTIFY_CLIENT_ID=SPOTIFY_CLIENT_ID:latest,SPOTIFY_CLIENT_SECRET=SPOTIFY_CLIENT_SECRET:latest \
  --port 3000
```

### 2. Apply Mandatory Campaign Verification Label
Update the Cloud Run service with the required verification label to register it for automated evaluation:

```bash
gcloud run services update gemini-journal-reflections \
  --update-labels=dev-tutorial=cloud-run-ai-challenge \
  --region=us-central1
```

---

## 🔒 Security & Robustness Hardening Standards

The system adheres strictly to the OWASP Top 10 for Web and LLM Applications:

| Mitigation Control | Architectural Implementation |
| :--- | :--- |
| **Startup Secret Fail-Fast** | `validateStartupSecrets()` verifies at container boot that `GEMINI_API_KEY`, `SPOTIFY_CLIENT_ID`, and `SPOTIFY_CLIENT_SECRET` are non-empty strings. Refuses to listen on port 3000 if any key is missing. |
| **Input Length Boundaries** | `INPUT_LIMITS` rejects oversized payloads on all routes (`4,000` chars/message, `120` chars/title, `300` chars/search query, `50` turns max), supplemented by HTML `maxLength` attributes. |
| **Model Resilience Fallback** | `generateContentWithFallback` cycles through a 4-tier model ladder (`gemini-3.6-flash` → `gemini-3.1-flash-lite` → `gemini-flash-latest` → `gemini-3.7-flash`) on HTTP `503`, `429`, or `500` status codes. |
| **Zero-Content Privacy** | Organization admins can invite and manage seats, but Firestore rules structurally forbid access to `users/{userId}/entries/*`. The UI provides clear upfront disclosures to employees. |
| **Immutable Admin Audit Log** | All seat lifecycle actions (`seat_invited`, `seat_removed`, `seat_reactivated`, `invite_code_copied`) append records to `organizations/{orgId}/auditLog/{logId}` without user journal data. |
| **React Error Boundaries** | Hierarchical boundaries wrap the application root and individual heavy modules (Universe canvas, Calendar view, Journal editor) to prevent full-page blank crashes. |
| **Unprivileged Health Check** | `GET /api/health` and `GET /health` return `{ "status": "ok", "timestamp": "..." }` with zero environment variable or key leakage. |

---

## 💻 Local Development

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup Local Environment Variables
Create a local `.env` file based on `.env.example`:
```env
GEMINI_API_KEY=your_gemini_api_key_here
SPOTIFY_CLIENT_ID=your_spotify_client_id_here
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret_here
```

### 3. Start Local Development Server
```bash
npm run dev
```
The server will start at `http://localhost:3000` with Vite middleware and API endpoints active.

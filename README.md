# Inner Sanctum — Private AI-Augmented Journal & Reflections

Inner Sanctum is an editorial, privacy-first personal reflection sanctuary and multi-turn Socratic journaling web application powered by **Google Gemini 3.6 Flash**, **Firebase Authentication (Google Sign-In)**, and **Cloud Firestore**, engineered for high-availability deployment on **Google Cloud Run**.

---

## 📋 Table of Contents
1. [Core Features & System Architecture](#-core-features--system-architecture)
2. [Prerequisites & Environment Setup](#-prerequisites--environment-setup)
3. [Secret Management with Google Cloud Secret Manager](#-secret-management-with-google-cloud-secret-manager)
4. [Spotify Developer Application Setup](#-spotify-developer-application-setup)
5. [Complete Cloud Firestore Security Rules](#-complete-cloud-firestore-security-rules)
6. [Google Cloud Run Deployment & Campaign Labeling](#-google-cloud-run-deployment--campaign-labeling)
7. [Security & Robustness Hardening Standards](#-security--robustness-hardening-standards)
8. [Local Development & Verification](#-local-development--verification)
9. [Future Scope (Planned Roadmap)](#-future-scope-planned-roadmap)

---

## 🌟 Core Features & System Architecture

Inner Sanctum transforms digital journaling from a static text repository into an ambient, emotionally grounded, and cognitively supportive reflection partner:

### 1. Calendar-First Navigation Data Model
- **Strict Date-Keyed Hierarchy**: Journal entries are stored at `users/{userId}/entries/{YYYY-MM-DD}`, maintaining one authoritative document per calendar day per user. Multi-turn reflective dialogues live in an isolated subcollection (`messages/{messageId}`) under that calendar day.
- **Interactive Calendar Grid**: Full monthly navigation with clean visual hierarchy, today highlighting, and quick-reflection launch actions.
- **Glitch-Free Entry Indicators**: Calendar cells calculate `hasSavedContent` using strict content verification (valid turns, custom title, summary, or mood reason) rather than empty draft instances. Blank dates show zero false indicators or phantom metadata bars.
- **Direct Per-Date Deletion**: Each calendar day cell and archive card features a direct delete action with confirmation modal, safely moving entries to Recently Deleted without leaving the calendar view.

### 2. Agentic Mood & Weather Ambient Theming (Geolocation-Aware)
- **Sentiment-Driven Ambiance**: Synthesizes the emotional tone of the journal entry (peaceful, contemplative, melancholy, energized, joyful, anxious, grateful, or neutral) into dynamic ambient backgrounds.
- **Atmosphere Drivers**: Seamlessly switch between rich looping ambient nature video backgrounds (sunlit forest, gentle rain, starry twilight, autumn dusk) and interactive procedural HTML5 canvas particle engines.
- **Corrected Geolocation-Based Day/Night Weather**: Resolves real-time atmospheric conditions via Open-Meteo. Uses client GPS coordinates (`navigator.geolocation`) with browser permission, falling back gracefully to the user's browser IANA timezone (e.g. `Asia/Kolkata`). Open-Meteo calculates astronomical solar elevation (`is_day`) based on the coordinates' actual local sunrise/sunset rather than container UTC time, accurately presenting daytime or starlit night ambiances with human-readable resolved city names (e.g., `📍 Bengaluru, India`).

### 3. Native Semantic Vector Search (Firestore Vector Search)
- **Dense Vector Embeddings**: Reflective dialogues and synthesized summaries are vectorized via `text-embedding-004` into 768-dimensional dense vector embeddings stored directly within Firestore.
- **Cosine Similarity Ranking**: Search queries are embedded on the server and compared against user entries, surfacing conceptually related reflections even when exact keywords differ (e.g., searching *"moments of clarity"* identifies entries discussing *"peaceful morning coffee"*).

### 4. Agentic Spotify Music Suggestions via Native Function Calling
- **True Agentic Tool Calling**: Gemini detects emotional shifts or reflective milestones and autonomously invokes the registered `suggest_music` tool using native function declarations (`FunctionDeclaration`). Music is never parsed from raw string patterns or simulated JSON flags.
- **Spotify Web API Proxy**: Secure server-side proxy handles client credentials and OAuth user tokens to query tracks and playlists.
- **Interactive Playback & Embeds**: Music cards display album art, artist credits, genre/mood reasoning, open-in-Spotify buttons, and embedded 30-second audio previews or Spotify web player widgets.

### 5. Zero-Content-Visibility Enterprise & Organization RBAC
- **Corporate Account Provisioning**: Organizations can purchase and allocate employee seats (`organizations/{orgId}/members/{userId}`).
- **Strict Content Privacy Guarantee**: Firestore security rules structurally guarantee that organization administrators **CANNOT** read, query, or access any employee's private reflections, mood data, embeddings, or conversation transcripts under any circumstances (`users/{userId}/entries/*` remains exclusively bound to `request.auth.uid == userId`).
- **Explicit Transparency & Disclosure**: Employees are presented with an explicit disclosure modal outlining what the company can see (seat status, email, join date) and what is strictly private (all journal entries, mood, and audio).
- **Admin Audit Trail**: Seat actions (`seat_invited`, `seat_removed`, `seat_reactivated`) append immutable audit logs to `organizations/{orgId}/auditLog/{logId}`.

### 6. Weekly Review Synthesis & Daily Flashcards
- **Multi-Day Longitudinal Synthesis**: Analyzes an entire week of reflections and produces an executive overview, primary themes, emotional trajectories, and key takeaways.
- **Interactive Daily Flashcards**: Allows the author to flip through individual day cards within the week, reviewing summaries, turns, and emotional milestones.

### 7. Reflection Universe (Embedding-Based Clustering Visualization)
- **Interactive 2D Cosmos**: Maps journal entries as glowing celestial bodies in an orbital canvas. Proximity reflects semantic relatedness calculated via Principal Component Analysis (PCA) dimensionality reduction, with star color denoting detected mood.
- **Pan, Orbit & Focus**: Full physics-driven zooming, panning, keyword filtering, and star selection to re-open historical reflections directly from the cosmos.

### 8. RAG-Enhanced Reflections (Historical Recall)
- **Autonomous Contextual Memory**: When conducting a multi-turn reflection, the system uses semantic retrieval over past journal entries to weave historical context, long-term personal themes, and recurring patterns into Gemini's Socratic dialogue.

### 9. Voice Input & Speech Transcription
- **Hands-Free Reflection**: Direct audio input via browser Speech Recognition API, enabling frictionless, streaming stream-of-consciousness journaling.

### 10. Shareable Reflection Cards with Clean Excerpt Generation
- **High-Resolution Card Generator**: Converts chosen reflection quotes and takeaways into aesthetic visual cards with custom typography and neutral backdrops.
- **Algorithmic Excerpt Sanitation**: Cleans raw conversational turns to extract cohesive, polished, standalone quotes ready for exporting or sharing without leaking unselected journal context.

### 11. Personalized Onboarding & Welcome-Back Flows
- **Interactive App Tour**: A 12-step guided walkthrough welcoming users upon authentication, explaining reflection modes, mood tracking, weather atmosphere, Spotify pairing, and organization privacy. Dismissible at any time and accessible on demand from the navigation drawer.
- **Personalized Welcome Back Prompt**: Recognizes whether the user reflected yesterday to celebrate active streaks or gently invite a fresh reflection for today, complete with a 4.5-second auto-dismiss progress bar.

### 12. Security & Robustness Hardening
- **Two-Stage Soft-Delete with 15-Day Recovery**: Deleting an entry flags `isDeleted: true` and moves it to a dedicated **Recently Deleted** archive with day countdowns, instant restore, and permanent purge capabilities.
- **Startup Secret Fail-Fast**: Server validates non-empty operational secrets (`GEMINI_API_KEY`, `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`) during container initialization.
- **Defensive Request Ingestion & Input Limits**: All endpoints enforce strict payload bounds (`4,000` chars/message, `120` chars/title, `300` chars/search query, `50` turns max).
- **Hierarchical Error Boundaries**: React Error Boundaries wrap the application root, Constellation canvas, Calendar view, and Journal editor to prevent blank-screen failure cascades.
- **Structured Audit Logging**: Dedicated immutable collection records organization seat and administrative operations without ever capturing user-authored journal content.

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

All sensitive operational credentials are kept out of source code and Docker images, stored securely in Google Cloud Secret Manager, and dynamically mounted to the Cloud Run container.

### 1. Create Secrets in Secret Manager
```bash
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"
gcloud secrets create SPOTIFY_CLIENT_ID --replication-policy="automatic"
gcloud secrets create SPOTIFY_CLIENT_SECRET --replication-policy="automatic"
```

### 2. Add Secret Versions
```bash
# Add your Gemini API Key
echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

# Add your Spotify Client ID
echo -n "YOUR_SPOTIFY_CLIENT_ID" | gcloud secrets versions add SPOTIFY_CLIENT_ID --data-file=-

# Add your Spotify Client Secret
echo -n "YOUR_SPOTIFY_CLIENT_SECRET" | gcloud secrets versions add SPOTIFY_CLIENT_SECRET --data-file=-
```

### 3. Grant Cloud Run Compute Service Account Access
Retrieve your project number and bind the `roles/secretmanager.secretAccessor` IAM role to the default Cloud Run service account:
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

1. **Create Developer Application**:
   - Navigate to the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard).
   - Log in and click **Create App**.
   - Set **App Name** (e.g., `Inner Sanctum Reflection Companion`) and App Description.
   - Under **Which API/SDKs are you planning to use?**, select **Web API**.

2. **Configure Redirect URIs**:
   - In your Spotify App settings, add the following authorized redirect URIs:
     - Published Production Domain: `https://your-own-moments-to-pen.ai.studio` (or `https://your-own-moments-to-pen.ai.studio/spotify-callback`)
     - Local development: `http://localhost:3000/spotify-callback` and `http://localhost:3000`
     - Optional Cloud Run service direct URL: `https://<YOUR-CLOUD-RUN-SERVICE-URL>/spotify-callback`
   - Set the optional `SPOTIFY_REDIRECT_URI` environment variable if you wish to enforce an explicit fixed callback URI (defaults to `https://your-own-moments-to-pen.ai.studio`).
   - Save the configuration.

3. **Required OAuth Scopes Used**:
   - `user-read-private`: Validates user country catalog compatibility.
   - `user-read-email`: Verifies account identity.
   - `user-top-read`: Contextualizes recommendations with top artists/genres.
   - `playlist-read-private`: Fetches curated ambient and reflective playlists.

4. **Account & Playback Requirements**:
   - **User Management in Development Mode**: Add the user's Spotify email under **Dashboard > Settings > User Management** while the app is in development mode.
   - **Spotify Premium Requirement**: Full interactive web playback streaming and full track audio previews require an active Spotify Premium subscription on the developer/tester's own account per Spotify Web Playback SDK policy. Free accounts will render album art, track links, and open-in-Spotify actions.

---

## 🛡️ Complete Cloud Firestore Security Rules

Deploy the complete `firestore.rules` below via Firebase CLI (`firebase deploy --only firestore:rules`) or the Google Cloud Console. These rules enforce strict owner-isolation for entries, subcollection cascading, and zero-content visibility for organization administrators:

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

## 🚀 Google Cloud Run Deployment & Campaign Labeling

### 1. Build and Deploy to Cloud Run
Deploy the application directly from source. Cloud Build compiles the TypeScript client bundle, packages the standalone CommonJS server (`dist/server.cjs`), and binds Secret Manager secrets to runtime environment variables:

```bash
gcloud run deploy inner-sanctum-journal \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-secrets GEMINI_API_KEY=GEMINI_API_KEY:latest,SPOTIFY_CLIENT_ID=SPOTIFY_CLIENT_ID:latest,SPOTIFY_CLIENT_SECRET=SPOTIFY_CLIENT_SECRET:latest \
  --port 3000
```

### 2. Apply Mandatory Campaign Verification Label
Update the Cloud Run service with the required label to register the deployment for automated challenge verification:

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
| **Startup Secret Fail-Fast** | `validateStartupSecrets()` verifies during container boot that `GEMINI_API_KEY`, `SPOTIFY_CLIENT_ID`, and `SPOTIFY_CLIENT_SECRET` are non-empty strings. Prevents silent misconfigured launches. |
| **Input Boundaries & Sanitization** | `INPUT_LIMITS` rejects oversized payloads on all routes (`4,000` chars/message, `120` chars/title, `300` chars/search query, `50` turns max), backed by client HTML `maxLength` attributes. |
| **Model Resilience Fallback Ladder** | `generateContentWithFallback` cycles through a 4-tier model ladder (`gemini-3.6-flash` → `gemini-3.1-flash-lite` → `gemini-flash-latest` → `gemini-3.7-flash`) on HTTP `503`, `429`, or `500` status codes before surfacing an error. |
| **Zero-Content Employee Privacy** | Organization admins manage seats and billing, but Firestore security rules structurally forbid any organization query against `users/{userId}/entries/*`. Clear disclosures inform employees prior to joining. |
| **Safe Error Extraction** | Client-side error handling uses `extractErrorMessage()` to parse nested API error payloads into clear human-readable strings, preventing raw `[object Object]` displays. |
| **React Error Boundaries** | Hierarchical boundaries wrap the application root and heavy interactive modules (Constellation Universe canvas, Calendar view, Journal editor) to isolate errors and prevent white-screen crashes. |
| **Pristine Production Build** | TypeScript compiler (`tsc --noEmit`) and Vite/esbuild run with **0 errors and 0 warnings**. Zero client-side debug statements or mock placeholders exist in production code. |

---

## 💻 Local Development & Verification

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Local Environment Variables
Create a `.env` file in the project root:
```env
GEMINI_API_KEY=your_gemini_api_key_here
SPOTIFY_CLIENT_ID=your_spotify_client_id_here
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret_here
```

### 3. Start Unified Development Server
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

---

## 🔮 Future Scope (Planned Roadmap)

The following architectural directions represent planned future extensions designed to expand Inner Sanctum's cognitive and ambient capabilities while preserving its strict zero-compromise privacy posture:

1. **On-Device Sentiment Pre-Classification (TensorFlow.js)**:
   - Implement a lightweight, client-side sentiment classifier running directly in the browser via TensorFlow.js.
   - Provides instant, zero-latency, offline-capable mood feedback as the user types, seamlessly complementing Gemini's deep cloud-based Socratic analysis in a hybrid edge + cloud architecture.

2. **Location-Aware Entries (Opt-In Geotagging)**:
   - Introduce optional, author-controlled geotagging of reflections using privacy-preserving reverse-geocoding.
   - Extends the existing zero-content-visibility model: location coordinates are stored strictly within the user's date-keyed document (`users/{userId}/entries/{YYYY-MM-DD}`) with zero organization or administrative visibility.

3. **CI-Integrated Automated Test Suite**:
   - Convert the exhaustive manual functional walkthroughs into an automated Playwright/Vitest end-to-end testing suite integrated into continuous deployment pipelines, covering multi-turn dialogue, mood classifying, Spotify tool triggering, soft-delete restoration, and security rule enforcement.

4. **Multi-Language Journaling & Socratic Reflection**:
   - Enable multi-language journaling support, allowing authors to express thoughts in any language of choice while configuring Gemini to reflect back natively in the user's preferred conversational dialect.

<!-- Temporary planning reference for future Google-auth/token work. -->

# Google Auth and Smart Photo Sync Plan

## Goal
Bring the new FastAPI + Vite + SQLite app closer to the main branch’s Google-auth capabilities by:

1. persisting Google OAuth credentials server-side
2. enabling user-authorized Google API access after sign-in
3. supporting automatic smart photo uploads to Google Photos
4. keeping SQLite as the app’s source of truth for runtime context

## Why This Was Not Already Implemented

The current branch intentionally simplified auth and external integrations:

- The backend currently uses Google OAuth only for identity.
- After exchanging the Google code, it fetches the profile and creates an app session cookie.
- It does **not** persist Google `access_token` or `refresh_token`.
- That is enough for sign-in, but not enough for later calls to:
  - Google Photos
  - Google Docs
  - other Google APIs on behalf of the user

This branch also moved core runtime context into app-owned persistence:

- `Skill`
- `SkillResearch`
- `SkillProgressEvent`
- planned `SkillSessionSummary`

That means Google integrations are now optional product extensions, not architectural dependencies.

## What “Auth Like Main” Means

It does **not** mean changing the app away from session-cookie auth.

It means:

- keep the app session cookie for normal authentication
- additionally persist Google OAuth credentials in the backend
- request broader Google scopes during OAuth
- refresh tokens server-side as needed
- let backend routes call Google APIs on behalf of the signed-in user

## Backend Impact

Changing auth “like main” affects the backend in these areas:

### 1. OAuth exchange flow

Current behavior:

- receive Google auth code
- exchange for tokens
- fetch user profile
- issue app session cookie
- discard Google tokens

Needed behavior:

- receive Google auth code
- exchange for tokens
- fetch user profile
- issue app session cookie
- persist Google OAuth credentials for that user

Persist:

- `access_token`
- `refresh_token`
- `expires_at`
- granted `scope`
- token type / metadata if useful

### 2. Database schema

Add a table for stored Google credentials, for example:

- `user_sub`
- `provider`
- `access_token`
- `refresh_token`
- `expires_at`
- `scope`
- `created_at`
- `updated_at`

Recommended:

- encrypt tokens at rest
- one row per provider per user

### 3. OAuth scopes

Identity-only scopes are not enough.

For Google Photos support, request:

- `https://www.googleapis.com/auth/photoslibrary.appendonly`
- optionally `https://www.googleapis.com/auth/photoslibrary.readonly.appcreateddata`

For refresh tokens, use Google OAuth parameters such as:

- `access_type=offline`
- `prompt=consent` on initial consent flow

### 4. Token refresh

Backend needs a token refresh service:

- detect expired / near-expired access token
- exchange refresh token for new access token
- update stored credentials
- handle revoked tokens and missing consent cleanly

### 5. Google-backed backend routes

Once tokens are stored, backend routes can support:

- Google Photos uploads
- Google Docs exports
- other Google API integrations

These routes must fail gracefully when:

- no Google credentials exist
- refresh token is invalid
- scopes were not granted
- Google API quota / permission errors occur

## Smart Photo Sync Plan

### Product goal

Automatically upload high-signal coaching images to the user’s Google Photos library.

### What should upload

Recommended first pass:

- successful annotated stills
- manual capture button photos

Optional later:

- milestone-triggered stills
- coach-requested save moments

Do **not** upload:

- every video frame
- every transient camera capture

### Backend additions

#### 1. Google Photos service

Add a backend service that:

- uploads bytes to Google Photos
- creates media items
- optionally manages app-created albums

Suggested service responsibilities:

- `refresh_google_access_token_if_needed(user_sub)`
- `upload_photo_bytes_to_google_photos(user_sub, bytes, mime_type, filename)`
- `create_media_item(...)`
- optional album lookup/creation

#### 2. Upload route

Add route such as:

- `POST /api/photos/upload`

Input:

- `imageBase64`
- `mimeType`
- `skillId`
- `label`
- `kind`

Behavior:

- require authenticated app session
- resolve stored Google credentials
- refresh token if needed
- upload image
- return media item metadata / URL if available

#### 3. App persistence

Store uploaded-photo references in app DB, either via:

- a dedicated photo table
- or structured progress/session summary metadata

Recommended data:

- `skill_id`
- `user_sub`
- `kind`
- `label`
- `google_media_item_id`
- `google_product_url`
- `created_at`

### Frontend additions

In the live session flow:

- auto-upload annotated stills after successful annotation response
- allow manual capture upload
- add a simple session-level toggle:
  - `Auto-save coaching photos`

### Safety / UX constraints

- strong rate limit
- explicit user-visible control
- never block coaching on upload failure
- surface auth/connectivity problems without breaking live session

## Recommended Architecture Direction

Keep these boundaries:

### Source of truth

Use app DB for:

- runtime live context
- research
- progress
- session summaries
- photo references

### External systems

Use Google services only for:

- user-owned photo storage
- optional Docs exports
- optional sharing / audit artifacts

### Do not do

- do not move runtime context back into Google Docs
- do not make Live coaching depend on Google API success

## Suggested Implementation Order

1. Persist Google OAuth credentials in backend
2. Add token refresh service
3. Add Google Photos upload service + route
4. Add smart upload triggers for annotated stills
5. Add manual capture upload
6. Persist uploaded-photo references in DB
7. Optionally connect photo refs into session summaries / Docs export

## Summary

Yes, the app can be changed to “auth like main,” but that is a backend feature expansion, not a frontend-only tweak.

It impacts:

- OAuth exchange
- database schema
- token storage
- token refresh
- Google API service layers

It does **not** require changing:

- SQLite as the source of truth
- app session cookie as normal auth
- backend-owned live context design

Best path:

- keep app-owned persistence
- add Google credentials as an auxiliary integration layer
- implement Google Photos on top of that

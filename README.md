TaskFlow PWA: Production-Ready Task Manager

TaskFlow is a smart, offline-first Progressive Web Application (PWA) built to demonstrate 
high-level full-stack architecture. It enables users to manage tasks seamlessly, regardless 
of network connectivity, using a robust synchronization engine and a secure Node.js backend.

================================================================================
Features Implemented
================================================================================

Offline-First Architecture    : Full CRUD capabilities while offline using IndexedDB.
Intelligent Sync Manager      : "Queue Squashing" to prevent redundant API calls and 
                                conflict resolution using Last-Write-Wins (LWW) logic.
Native PWA Experience         : Installable on Desktop/Mobile with custom splash 
                                screens and update prompts.
Security-First Auth           : JWT-based authentication with Refresh Token Rotation 
                                and HTTP-Only cookies.
Real-time Reminders           : Integrated Push Notifications (Web-Push) to keep users 
                                on track.
Modern UI                     : Responsive design with Tailwind CSS, including a smooth 
                                Dark Mode toggle.
Drag-and-Drop                 : Intuitive task reordering that persists across devices.

================================================================================
Tech Stack
================================================================================

Layer         | Technology
--------------|------------------------------------------
Frontend      | React, Redux Toolkit, Tailwind CSS
Backend       | Node.js, Express.js
Database      | MongoDB (Mongoose)
State/Storage | Redux, IndexedDB (idb), LocalStorage
PWA Engine    | Vite PWA Plugin, Workbox
Security      | JWT, bcryptjs, HTTP-Only Cookies

================================================================================
Architectural Deep Dives
================================================================================

Offline Sync Strategy

We implemented a Bidirectional Reconciliation strategy:

   • Optimistic UI      : Changes are immediately reflected in the UI and persisted 
                          to IndexedDB.
   • Sync Queue         : Operations (Create, Update, Delete) are queued in a separate 
                          IndexedDB store.
   • Conflict Resolution: When back online, the server acts as the Time Authority. 
                          We compare the client's lastModified against the server's updatedAt.
                          - If Client > Server : Server is updated.
                          - If Server > Client : Client's local DB is overwritten with 
                            the server's truth.

Authentication & Security

Instead of standard JWT storage, we used:

   • HTTP-Only Cookies     : Prevents XSS-based token theft.
   • Refresh Token Rotation: On every refresh, a new token pair is issued. This invalidates 
                             stolen refresh tokens the moment they are used by an attacker.
   • Atomic Notification Cleanup: Handled race conditions in push notification token 
                                  management using MongoDB $pull operations.

================================================================================
How to Run the App
================================================================================

1. Prerequisites
   • Node.js (v16+)
   • MongoDB (Local or Atlas)

2. Backend Setup

   cd backend
   npm install
   # Create a .env file (see .env.example)
   npm run dev

3. Frontend Setup

   cd frontend
   npm install
   npm run dev

4. Production Build (PWA)

   To test the PWA features correctly, you must build the app:

   npm run build
   npm run preview

================================================================================
Known Issues & Limitations
================================================================================

   • Clock Skew    : While mitigated by server-side checks, significant device time 
                     discrepancies can still cause minor sync delays.
   • Media Support : Currently optimized for text-based tasks only.

================================================================================
 AI Usage Disclosure
================================================================================

   • Initial Logic : Used Gemini to draft the initial Express controller logic and 
                      Mongoose schemas.
   • Optimization  : Leveraged AI to harden the SyncManager queue-squashing logic and 
                      implement the VitePWA configuration.
   • Audit         : Used AI to perform a "System Stress Test" to identify race conditions 
                      and security vulnerabilities in the JWT lifecycle.
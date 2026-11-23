# CoFounder AI

CoFounder AI is a full-stack matchmaking workspace for students, developers, designers, and early-stage founders. It recommends complementary teammates, helps members find hackathons, and provides connections, chat, teams, and notifications.

## Features

- Email/password authentication with hashed passwords and JWT-protected API routes.
- Guided profile setup with roles, skills, interests, goals, availability, and location.
- Ranked people recommendations with compatibility scores, breakdowns, and match explanations.
- Search and filters for roles, skills, interests, city, minimum score, and recency.
- Upcoming hackathons with recommendations, interest tracking, and suggested teammates.
- Connection requests, accepted connections, team invites, notifications, and conversation APIs.
- Realtime messaging and typing indicators using Socket.IO.
- Responsive dark-first dashboard with a light theme, profile editing, and analytics charts.
- Seed dataset with 35 sample builder profiles, 22 upcoming hackathons, and a demo workspace.

## Tech stack

**Frontend:** React 18, Vite, React Router, Tailwind CSS, Framer Motion, Axios, Zustand, React Hook Form, Zod, lucide-react, react-hot-toast, Socket.IO Client, Recharts.

**Backend:** Node.js ES modules, Express 4, MongoDB/Mongoose, JWT, bcryptjs, express-validator, Socket.IO, helmet, cors, morgan, express-rate-limit, cookie-parser, multer.

## Project structure

```text
backend/
  server.js
  src/config/       environment and database connection
  src/models/       Mongoose domain models
  src/routes/       REST endpoints
  src/services/     matching, recommendations, and sockets
  src/seed/         sample profiles, events, and seed runner
frontend/
  src/api/          Axios client
  src/hooks/        Socket connection
  src/layouts/      authenticated application shell
  src/pages/        landing, onboarding, dashboard, and workspace views
```

## Matching approach

Candidates who are already connected, have a pending request, are the current member, or have not completed onboarding are excluded. Remaining profiles are evaluated using:

| Factor | Weight |
|---|---:|
| Skill complementarity | 35% |
| Interest Jaccard similarity | 25% |
| Goal Jaccard similarity | 15% |
| Availability | 10% |
| Location / remote compatibility | 10% |
| Experience balance | 5% |

Inputs are normalized and common skill aliases are canonicalized before comparison. The API returns an integer percentage, factor breakdown, shared interests, complementary skills, and natural-language reasons.

## Local setup

Requirements: Node.js 20+, npm, and MongoDB running locally or an Atlas connection string.

1. Copy `backend/.env.example` to `backend/.env` and set `MONGO_URI` and a long random `JWT_SECRET`. Copy `frontend/.env.example` to `frontend/.env` if the default local URLs need changing. The checked-out `.env` files are development conveniences only; never use their local JWT secret in production.
2. Install dependencies:

   ```sh
   npm run install-all
   ```

3. Populate the database:

   ```sh
   npm run seed
   ```

4. Start the API and frontend:

   ```sh
   npm run dev
   ```

The client runs at `http://localhost:5173`, the API at `http://localhost:5000`, and the health check is `GET /api/health`.

Demo credentials: `demo@cofounder.ai` / `Password@123`. Seeded sample accounts use `Password@123` as well.

## API overview

All routes are prefixed with `/api`. Successful responses use `{ success, data, message }`.

| Area | Routes |
|---|---|
| Auth | `POST /auth/register`, `POST /auth/login`, `GET /auth/me`, `POST /auth/logout` |
| Users | `GET /users/meta/options`, `GET /users/me/stats`, `PUT /users/me`, `PUT /users/me/onboarding`, `POST /users/me/avatar`, `GET /users/:id` |
| Matches | `GET /matches`, `GET /matches/:userId/compatibility` |
| Hackathons | `GET /hackathons`, `GET /hackathons/recommended`, `GET /hackathons/:id`, `POST /hackathons/:id/interest`, `GET /hackathons/:id/teammates` |
| Connections | `POST /connections/:userId`, `GET /connections`, `GET /connections/requests/received`, `GET /connections/requests/sent`, `PATCH /connections/:id`, `DELETE /connections/:id` |
| Chat | `GET /chat/conversations`, `POST /chat/conversations/:userId`, `GET /chat/conversations/:id/messages`, `POST /chat/conversations/:id/messages`, `PATCH /chat/conversations/:id/read` |
| Teams | `POST /teams`, `GET /teams/mine`, `GET /teams/:id`, `PUT /teams/:id`, `POST /teams/:id/invite/:userId`, `POST /teams/:id/accept`, `POST /teams/:id/leave` |
| Notifications | `GET /notifications`, `PATCH /notifications/:id/read`, `PATCH /notifications/read-all` |

Socket.IO authenticates with `auth.token`; clients join the authenticated user room. Events include `message:send`, `message:new`, `typing`, `user:online`, `user:offline`, and `notification:new`.

## Tests

```sh
npm test --prefix backend
npm run build --prefix frontend
```

## Deploy frontend and API on Vercel

The repository includes Vercel configuration for two separate projects:

1. Create a Vercel project with the repository root directory set to `frontend`. The included `frontend/vercel.json` sends client-side routes back to the SPA entry point.
2. Create a second Vercel project from the same repository with the root directory set to `backend`. The included catch-all function in `backend/api/` forwards requests to Express.
3. Provision MongoDB Atlas and allow the deployed API to reach the cluster. Run the seed command from a trusted local environment or one-off job; do not expose a database reset endpoint.
4. Configure backend environment variables: `MONGO_URI`, a long random `JWT_SECRET`, `JWT_EXPIRES_IN`, `CLIENT_URL` (the frontend's exact Vercel origin), `SOCKET_BRIDGE_URL` (the external socket service origin), and `SOCKET_BRIDGE_SECRET` (a long random shared secret).
5. Configure frontend variables: `VITE_API_URL=https://<api-project>.vercel.app/api` and `VITE_SOCKET_URL=https://<socket-service-host>`.

Vercel Functions do not provide the persistent WebSocket server required by Socket.IO. To retain realtime chat, typing, and notification events, run the same backend package as a long-lived service on Render, Railway, or another Node host using `npm start`. Set its `MONGO_URI`, the same `JWT_SECRET`, the frontend `CLIENT_URL`, and the same `SOCKET_BRIDGE_SECRET`. Set `SOCKET_BRIDGE_URL` on the Vercel API project to that service's origin. The Vercel API forwards realtime events to the protected `/internal/events` endpoint; the shared secret must be identical and kept private.

Vercel's filesystem is ephemeral, so profile photo uploads made through the Vercel API are stored in MongoDB and served from an authenticated image endpoint. Local development continues to save photos under `backend/uploads/`.

The checked-in Vercel project settings use each app folder as its project root. Add the environment variables in each project's Vercel dashboard and redeploy after setting them. Never use the development JWT secret in production.

## Deployment alternative

If you prefer not to operate the separate socket host, deploy the complete `backend` package as a long-running Node service instead of a Vercel Function and set `VITE_API_URL` and `VITE_SOCKET_URL` to that service. This supports REST and Socket.IO from the same origin.

## Screenshots

Screenshots can be added here after running the application in a browser.

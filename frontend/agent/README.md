# Agent Panel

This folder represents the Agent Partner Panel module for SimplDSC.

The agent components and layouts are mounted via React Router under `/agent` and `/agent/*`:
- Entry Portal: `src/pages/AgentDashboard.js`
- Login & Registration: `src/pages/AgentLogin.js`
- Auth Context: `src/context/AgentAuthContext.js`
- Nested Routes:
  - Overview / Dashboard: `/agent`, `/agent/dashboard`
  - Clients & Applications: `/agent/clients`, `/agent/applications`, `/agent/orders`
  - Profile & Settings: `/agent/profile`, `/agent/settings`

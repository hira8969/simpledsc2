# Client Panel

This folder represents the Client / Customer Panel module for SimplDSC.

The client components and layouts are mounted via React Router under `/client` and `/client/*`:
- Entry Portal: `src/pages/Dashboard.js`
- Dedicated Login: `src/pages/ClientLogin.js`
- Auth Context: `src/context/AuthContext.js`
- Nested Routes:
  - Overview: `/client`, `/client/dashboard`
  - Orders: `/client/orders`, `/client/applications`
  - DSCs & Services: `/client/dscs`, `/client/services`
  - Invoices: `/client/invoices`
  - Support Tickets: `/client/support`
  - Profile & Settings: `/client/profile`, `/client/settings`
  - Notifications: `/client/notifications`

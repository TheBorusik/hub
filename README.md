# Hub

Unified WFM management console — process configurator, viewer, command tester, CRUD editor, and system admin in one place.

## Development

```bash
npm install
npm run dev
```

## Architecture

- **Vite** + **React 19** + **TypeScript 6** + **Tailwind CSS 4**
- **@theborusik/ws** + **@theborusik/ws-react** — typed WebSocket layer
- **Multi-contour** — connect to multiple WFM deployments simultaneously via tabs
- **Management Contour** — "System" tab for platform administration and project management

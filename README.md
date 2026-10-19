# Vacation Rental Channel Manager

## Project Overview

The Vacation Rental Channel Manager is a portfolio application inspired by property management systems used to manage vacation rental listings, reservations, pricing, and availability across multiple booking channels.

The goal is to build a working application from scratch and progressively implement DevOps practices.

## Project Objectives

- Build a property management dashboard.
- Manage properties and reservations.
- Track calendar availability, nightly rates, and minimum-stay rules.
- Simulate synchronization with Airbnb and Vrbo.
- Build an owner portal.
- Demonstrate invoices and payments using Stripe test mode.
- Implement automated testing, Docker, CI/CD, and monitoring.

## Technology Stack

| Technology | Purpose | Status |
|---|---|---|
| React | Frontend | Initial setup complete |
| Vite | Frontend development server | Configured |
| Node.js | JavaScript runtime | Installed |
| npm | Package management | Installed |
| Python | Backend development | Installed |
| FastAPI | Backend API | Planned |
| PostgreSQL | Database | Planned |
| Docker | Containerization | Installed |
| Git and GitHub | Version control | Git initialized |
| GitHub Actions | CI/CD | Planned |
| Stripe | Test payments | Planned |
| Prometheus and Grafana | Monitoring | Planned |
| Terraform and AWS | Optional cloud deployment | Planned |

## Project Structure

```text
vacation-rental-channel-manager/
├── frontend/
├── backend/
├── docs/
├── screenshots/
├── README.md
└── .gitignore
```

## Run the Frontend Locally

From the project root, run:

```bash
cd frontend
npm install
npm run dev
```

Open the local URL displayed by Vite, usually http://localhost:5173/.

Press `Ctrl + C` to stop the development server.

## Development Roadmap

1. Initialize and document the project.
2. Build the React dashboard.
3. Implement the backend REST API.
4. Add database persistence.
5. Develop simulated Airbnb and Vrbo integrations.
6. Implement booking, calendar, and pricing workflows.
7. Build the owner portal and Stripe test payment workflows.
8. Add automated tests.
9. Containerize the application with Docker.
10. Implement CI/CD, security checks, and monitoring.
11. Document optional AWS deployment.

## Integration Limitations

Initial OTA integrations will use simulated adapters and test data. This does not establish a live connection to Airbnb or Vrbo. Real integrations require appropriate platform access, supported APIs, and permissions.

Payment demonstrations will use Stripe test mode.

## Security

- Never commit passwords, API keys, or access tokens.
- Keep environment files containing secrets out of Git.
- Use test credentials during development.
- Verify integrations before describing them as complete.

## Project Status

**Current phase:** React frontend dashboard implemented; production build verified.

### Completed

- Initialized the project repository with Git.
- Created the React frontend using Vite.
- Built the Staywise vacation rental dashboard with a modern, light theme.
- Added overview metrics, a sample revenue chart, channel performance, and recent reservations.
- Added property cards and navigation for properties, reservations, calendar, channels, guests, and settings.
- Added responsive styling for smaller screens.
- Verified the production build using `npm run build`.

### Current Limitations

- Dashboard data is illustrative sample data.
- Booking channels are not connected to live Airbnb or Vrbo accounts.
- Backend APIs, database persistence, authentication, and real booking synchronization are not implemented yet.

### Next Steps

1. Commit the verified frontend milestone.
2. Push the project to GitHub.
3. Build a FastAPI backend.
4. Add PostgreSQL database persistence.
5. Connect the frontend to the backend API.
6. Add tests, Docker, CI/CD, security checks, and monitoring.
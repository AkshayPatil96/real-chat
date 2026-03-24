# Documentation Quick Reference

**Need something quickly? Use this reference card.**

---

## 🎯 I want to...

### Understand the System
- **See overall architecture** → [`docs/architecture.md`](./architecture.md)
- **Understand security** → [`docs/security.md`](./security.md)
- **Learn about real-time features** → [`docs/realtime.md`](./realtime.md)

### Use the API
- **See all REST endpoints** → [`docs/api/api-contracts.md`](./api/api-contracts.md)
- **See Socket.IO events** → [`docs/api/socket-events.md`](./api/socket-events.md)
- **Try API interactively** → [Swagger UI](http://localhost:3001/api-docs) (when running)

### Set Up & Configure
- **Set up AWS S3 file upload** → [`docs/guides/SETUP_GUIDE.md`](./guides/SETUP_GUIDE.md#-aws-s3-file-upload-setup)
- **Configure Jest testing** → [`docs/guides/SETUP_GUIDE.md`](./guides/SETUP_GUIDE.md#-jest-testing-esm-support)
- **Set up GitHub Actions CI/CD** → [`docs/guides/SETUP_GUIDE.md`](./guides/SETUP_GUIDE.md#-github-actions-cicd-setup)
- **Deploy with Docker** → [`docs/guides/SETUP_GUIDE.md`](./guides/SETUP_GUIDE.md#-docker-deployment)

### Deploy to Production
- **Deployment checklist** → [`docs/production-hardening/PRODUCTION_HARDENING_REPORT.md`](./production-hardening/PRODUCTION_HARDENING_REPORT.md#-deployment-readiness)
- **Environment variables** → [`../README.md`](../README.md#environment-variables)
- **Docker setup** → [`../docker-compose.yml`](../docker-compose.yml)

### Debug & Monitor
- **Check logs** → [`docs/logging-and-monitoring.md`](./logging-and-monitoring.md)
- **Troubleshoot issues** → [`docs/guides/SETUP_GUIDE.md`](./guides/SETUP_GUIDE.md#-troubleshooting)
- **Health checks** → [`docs/guides/SETUP_GUIDE.md`](./guides/SETUP_GUIDE.md#-health-checks)

### Review Project Status
- **See what's implemented** → [`docs/production-hardening/BACKEND_FEATURES.md`](./production-hardening/BACKEND_FEATURES.md)
- **Production improvements** → [`docs/production-hardening/PRODUCTION_HARDENING_REPORT.md`](./production-hardening/PRODUCTION_HARDENING_REPORT.md)
- **Future roadmap** → [`docs/future-improvements.md`](./future-improvements.md)

---

## 📁 File Location Map

```
apps/backend/
│
├── README.md                          # Start here - Project overview
├── docker-compose.yml                 # Local development with Docker
├── .env.example                       # Environment variable template
│
└── docs/
    ├── README.md                      # 📖 Documentation index (full guide)
    ├── QUICK_REFERENCE.md            # ⚡ This file - Quick links
    │
    ├── architecture.md                # System design
    ├── security.md                    # Security implementation
    ├── realtime.md                    # Real-time messaging
    ├── logging-and-monitoring.md      # Observability
    ├── future-improvements.md         # Roadmap
    │
    ├── api/
    │   ├── api-contracts.md          # REST API endpoints
    │   └── socket-events.md          # Socket.IO events
    │
    ├── guides/
    │   └── SETUP_GUIDE.md            # Setup for Jest, AWS, CI/CD, Docker
    │
    └── production-hardening/
        ├── BACKEND_TODO.md           # Production tasks (completed)
        ├── BACKEND_FEATURES.md       # Feature inventory
        └── PRODUCTION_HARDENING_REPORT.md  # Final report
```

---

## 🔗 External Resources

- **Swagger UI** - http://localhost:3001/api-docs (when running)
- **Health Check** - http://localhost:3001/health
- **Metrics** - http://localhost:3001/metrics

---

## 💡 Pro Tips

1. **Start with** [`docs/README.md`](./README.md) for complete navigation
2. **Bookmark** [Swagger UI](http://localhost:3001/api-docs) for API testing
3. **Check** [`SETUP_GUIDE.md`](./guides/SETUP_GUIDE.md) before configuring new features
4. **Review** [`PRODUCTION_HARDENING_REPORT.md`](./production-hardening/PRODUCTION_HARDENING_REPORT.md) for interview prep

---

**Lost?** Go to [`docs/README.md`](./README.md) for the complete documentation guide.

# Part 1 — Containerizing the Vacation Rental Channel Manager

Step-by-step log of how this app (React 19 + FastAPI + SQLite) went from "runs on my laptop" to "runs in containers". Each step lists the files, the commands, the reasoning behind them, and the bugs I hit along the way.

**DevOps roadmap**

| # | Stage | Status |
|---|---|---|
| 1 | Docker — backend image | ✅ Done |
| 2 | Docker — frontend multi-stage image | ✅ Done |
| 3a | docker-compose + nginx reverse proxy (SQLite) | 🚧 In progress |
| 3b | Switch SQLite → PostgreSQL | ⏳ Planned |
| 4 | GitHub Actions CI (test, Trivy scan, push to registry) | ⏳ Planned |
| 5 | Kubernetes on minikube | ⏳ Planned |
| 6 | Helm chart | ⏳ Planned |
| 7 | Argo CD (GitOps) | ⏳ Planned |
| 8 | Prometheus + Grafana | ⏳ Planned |
| 9 | Terraform for AWS (VPC, EKS, ECR, RDS), `plan` only | ⏳ Planned |
| 10 | OTA sync worker + queue | ⏳ Planned |

**Prerequisites:** Docker Desktop, Git Bash (Windows). Check with `docker --version` and `docker compose version`.

---

## Key concepts

- **Image**: a read-only template containing the code, the runtime and the dependencies.
- **Container**: a running instance of an image. It gets its own filesystem, and **that filesystem is deleted when the container is removed**. This matters because SQLite stores data in a file.
- **Volume**: storage managed by Docker that outlives containers. We use one to keep the database.
- **Layer caching**: each Dockerfile instruction makes a layer. Docker reuses a cached layer until its input changes, so the instructions that change least go first.

---

## Step 1 — Containerize the backend (FastAPI)

### 1.1 Create `backend/Dockerfile`

```dockerfile
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DATABASE_PATH=/data/vacation_rental.db \
    CORS_ORIGINS=http://localhost:5173

RUN useradd --create-home --uid 1000 appuser \
    && mkdir /data && chown appuser:appuser /data

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY --chown=appuser:appuser . .

USER appuser
EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**Why each line is there**

| Line | Reason |
|---|---|
| `python:3.12-slim` | Small Debian base (~150 MB vs ~1 GB for the full image). The code uses `bool \| None`, which needs Python 3.10+. |
| `PYTHONUNBUFFERED=1` | Logs go straight to stdout, so `docker logs` shows them right away. |
| `DATABASE_PATH=/data/...` | Puts the DB in one folder that is mounted as a volume. |
| `useradd` + `USER appuser` | The app doesn't run as root. If someone breaks into the app, they don't get root in the container. |
| `COPY requirements.txt` before `COPY . .` | Layer caching. A code change doesn't re-run `pip install`. |
| `--no-cache-dir` | pip doesn't store its download cache in the image, which keeps the image smaller. |
| `--host 0.0.0.0` | Uvicorn's default `127.0.0.1` only accepts connections from inside the container, so port mapping wouldn't work. |
| `HEALTHCHECK` | Calls the existing `/health` endpoint. Docker reports the container as `healthy` or `unhealthy`. Kubernetes probes work the same way later. |
| No multi-stage | Left out on purpose: the dependencies are pure wheels, so a second stage saves almost nothing. |

### 1.2 Create `backend/.dockerignore`

```
__pycache__/
*.pyc
.env
*.db
.pytest_cache/
tests/
requirements-dev.txt
```

Keeps secrets (`.env`), the local DB and test files out of the image.

### 1.3 Build and run

```bash
cd backend
docker build -t vrcm-backend:0.1 .
docker run -d --name vrcm-api -p 8000:8000 -v vrcm-data:/data vrcm-backend:0.1
docker ps                      # STATUS should show (healthy) after ~10–30 s
curl localhost:8000/health
```

- `-p 8000:8000` maps laptop port → container port.
- `-v vrcm-data:/data` mounts a named volume so bookings survive `docker rm`.

### 1.4 Verify

```bash
docker logs vrcm-api
docker run --rm vrcm-backend:0.1 pip list     # uvicorn, fastapi etc. must be listed
docker inspect --format '{{.State.Health.Status}}' vrcm-api
```

Open `http://localhost:8000/docs` for the Swagger UI.

### 1.5 Bugs I hit (and what they taught me)

| Symptom | Cause | Fix |
|---|---|---|
| `exec: "uvicorn": executable file not found in $PATH` | `RUN pip install` was missing; `requirements.txt` was copied but never installed. `pip list` showed only `pip`. | Add `RUN pip install --no-cache-dir -r requirements.txt` after `COPY requirements.txt .` |
| `dockerfile parse error ... Unknown type "PYTHON" in HEALTHCHECK` | `--retries=3\`: no space before `\`, so Docker joined it into `--retries=3CMD`. | Always write ` \` (space before the backslash) and indent the next line. |
| CORS silently not applied | Typo `CORS_ORGINS` | `CORS_ORIGINS`. The app ignores unknown env vars, so nothing errors. |
| Healthcheck would always fail | Typo `urllib.rquest`, plus double quotes nested inside double quotes | `urllib.request`, with single quotes inside the string |
| Old broken container started after a failed build | `docker run` used the previous image tag | Check that the build succeeded before running. Remove old containers with `docker rm -f`. |

**Lesson:** a Dockerfile can build cleanly and still be wrong. Three of these bugs passed `docker build`. Only running and checking the container (`pip list`, health status, logs) caught them. That's why CI (Step 4) will run the container, not just build it.

### 1.6 Commit

```bash
git add backend/Dockerfile backend/.dockerignore
git commit -m "Add backend Dockerfile with healthcheck and non-root user"
git push
```

---

## Step 2 — Containerize the frontend (multi-stage build)

### Concept

A React app needs Node.js and npm to **build**, but only static HTML/JS/CSS to **serve**.

- **Stage 1 (build):** Node image runs `npm run build` → produces `dist/`.
- **Stage 2 (serve):** a small nginx image gets **only `dist/`**. The whole Node toolchain is thrown away.

Build in a big image, ship a small one.

### Gotcha: Vite bakes env vars at build time

`src/api.js` reads `VITE_API_URL`. Vite writes that value into the JS files **during `npm run build`**. The JS runs in the user's browser, not in the container, so `docker run -e` can't change it later. It has to be passed as a `--build-arg`.

### 2.1 Create `frontend/Dockerfile`

```dockerfile
# ---------- Stage 1: build ----------
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
ARG VITE_API_URL=http://localhost:8000
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# ---------- Stage 2: serve ----------
FROM nginxinc/nginx-unprivileged:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
```

| Line | Reason |
|---|---|
| `AS build` | Names stage 1 so stage 2 can copy from it. |
| `npm ci` (not `npm install`) | Installs the **exact** versions in `package-lock.json`, so every build is identical. Standard for CI. |
| `package*.json` before `COPY . .` | Same layer-caching rule as Step 1. |
| `ARG` + `ENV` | `ARG` exists only during the build; `ENV` passes it to `npm run build`. |
| `COPY --from=build` | Takes only `dist/` from stage 1. |
| `nginx-unprivileged` | nginx runs as non-root. Non-root can't bind ports below 1024, so it listens on **8080**. |

### 2.2 Create `frontend/.dockerignore`

```
node_modules/
dist/
.env
```

- `node_modules/` is huge and gets reinstalled inside the image anyway.
- `.env` is excluded so my local `127.0.0.1` URL doesn't get baked in instead of the build arg.

### 2.3 Build and run

```bash
docker build -t vrcm-frontend:0.1 ./frontend
docker run -d --name vrcm-web -p 8080:8080 vrcm-frontend:0.1
```

Open `http://localhost:8080`.

The backend only allows `http://localhost:5173` (CORS), so restart it allowing the new origin:

```bash
docker rm -f vrcm-api
docker run -d --name vrcm-api -p 8000:8000 -v vrcm-data:/data \
  -e CORS_ORIGINS=http://localhost:8080 vrcm-backend:0.1
```

### 2.4 Experiments

1. **Baked URL:** build with `--build-arg VITE_API_URL=http://localhost:9999` and open `localhost:8080`. The site loads but shows "Can't reach the API at http://localhost:9999". This proves the URL is fixed inside the JS.
2. **CORS:** with the backend still on `CORS_ORIGINS=http://localhost:5173`, the browser console shows a CORS policy error. `curl` still works. **CORS is enforced by browsers only**, and the fix is on the server side (allow the origin).

### 2.5 Result

| Image | Size | Compressed |
|---|---|---|
| `vrcm-backend:0.1` | 273 MB | ~65 MB |
| `vrcm-frontend:0.1` | 91.5 MB | ~26 MB |

The `node:22-alpine` base alone is ~160 MB; the final frontend image ships none of it.

### 2.6 Bugs I hit

| Symptom | Cause | Fix |
|---|---|---|
| `git status` still showed `frontend/Dockerfile` untracked after `git add` | `frontend/.dockerignore` didn't exist. When one path in `git add a b` is missing, git prints `fatal: pathspec ...` and adds **nothing**. | Create the missing file, then add both. Run `git status` before and after every commit. |
| Build context was many MB | No `.dockerignore`, so `node_modules` was sent to the Docker daemon | After adding `.dockerignore`, the `transferring context` line in the build output drops to a few hundred KB. |

### 2.7 Commit

```bash
git add frontend/Dockerfile frontend/.dockerignore
git commit -m "Add multi-stage frontend Dockerfile with nginx"
git push
```

---

## Step 3a — docker-compose + nginx reverse proxy 🚧

**Problem with Step 2:** two manual `docker run` commands, a CORS flag, and an API URL baked into the image. That breaks "build once, deploy everywhere": dev, staging and prod would each need a different frontend image.

**Fix:** the frontend calls a **relative** path (`/api/...`). nginx receives everything on port 8080 and forwards `/api/` to the backend. Same origin means no CORS, and one image works in every environment.

> SQLite is kept for now. The code uses SQLite-specific SQL (`?` placeholders, `BEGIN IMMEDIATE`, `PRAGMA`, `lastrowid`), so the Postgres switch is its own step (3b).

### 3.1 Create `frontend/nginx.conf`

```nginx
server {
    listen 8080;
    root /usr/share/nginx/html;
    index index.html;

    location /api/ {
        proxy_pass http://backend:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

- `http://backend:8000`: `backend` is the **service name** in the compose file. Compose creates a private network with its own DNS, so containers find each other by name. Kubernetes Services work the same way.
- `proxy_set_header`: passes the real client IP to the backend. Without it, every request looks like it came from nginx.
- `try_files ... /index.html`: sends unknown paths to the React app (SPA routing).

### 3.2 Edit `frontend/Dockerfile`

Change the `ARG` line:

```dockerfile
ARG VITE_API_URL=/
```

Add at the end of stage 2:

```dockerfile
COPY nginx.conf /etc/nginx/conf.d/default.conf
```

**Why `/` and not empty?** `api.js` does `VITE_API_URL || "http://127.0.0.1:8000"`. An empty string is falsy in JavaScript, so it would fall back to 127.0.0.1. `/` passes the check, the trailing slash is stripped, and requests become relative: `/api/...`.

### 3.3 Create `docker-compose.yml` (project root)

```yaml
services:
  backend:
    build: ./backend
    image: vrcm-backend:0.2
    volumes:
      - backend-data:/data
    restart: unless-stopped

  frontend:
    build: ./frontend
    image: vrcm-frontend:0.2
    ports:
      - "8080:8080"
    depends_on:
      backend:
        condition: service_healthy
    restart: unless-stopped

volumes:
  backend-data:
```

| Setting | Reason |
|---|---|
| Backend has **no `ports:`** | Deliberate: it can't be reached from the laptop, only through nginx. Smaller attack surface. |
| `depends_on` + `service_healthy` | Frontend starts only after the backend's HEALTHCHECK passes. This is why Step 1 added one. |
| `restart: unless-stopped` | Docker restarts a crashed container. |
| No `CORS_ORIGINS` | Not needed: everything is same-origin now. |

YAML uses **spaces only, never tabs**.

### 3.4 Run

```bash
docker rm -f vrcm-web vrcm-api          # free port 8080 from Step 2
docker compose up -d --build
docker compose ps
curl localhost:8080/api/stats           # works, through nginx
curl localhost:8000/health              # should FAIL — backend isn't exposed
```

Open `http://localhost:8080`.

### 3.5 Experiments

1. **Container DNS:** `docker compose exec frontend wget -qO- http://backend:8000/health`
2. **Volumes:** is the booking created in Step 2 still there? (`docker volume ls`: compose creates its own volume, `<project>_backend-data`, separate from `vrcm-data`.)
3. **Persistence:** `docker compose down` then `up -d`: data survives. `docker compose down -v`: the volume is deleted, and the data with it.
4. **Logs:** `docker compose logs -f backend`, then click around the dashboard.

### 3.6 Commit (once verified)

```bash
git add frontend/nginx.conf frontend/Dockerfile docker-compose.yml
git commit -m "Add docker-compose with nginx reverse proxy"
git push
```

---

## Interview Q&A

**Why copy `requirements.txt` / `package.json` before the rest of the code?**
Layer caching. Dependencies change rarely and code changes often. Copying the dependency files first means a code edit reuses the cached install layer, so builds take seconds instead of minutes.

**Why run as a non-root user?**
If the app is compromised, the attacker doesn't get root inside the container, which limits what they can do and makes a container escape harder.

**When is multi-stage worth it?**
When build tools are much bigger than the runtime output, like a Node toolchain producing static files. For the Python backend, with pure-wheel dependencies, it saves almost nothing, so I didn't use it there.

**Why is baking `VITE_API_URL` at build time a problem?**
Each environment would need its own image, which breaks "build once, deploy everywhere": the image tested in staging wouldn't be the image shipped to prod. Calling a relative `/api` path and letting nginx (or a Kubernetes Ingress) route it fixes that and removes CORS too.

**What is CORS?**
The browser enforcing which origins may call an API. Different port = different origin. It's enforced only by browsers (curl ignores it), and it's fixed on the server by allowing the origin, or avoided by serving everything from one origin.

**How do containers in compose find each other?**
Compose creates a network with built-in DNS. Each service name resolves to its container's IP, so nginx reaches the backend at `http://backend:8000`.

**What does `HEALTHCHECK` do, and why does compose care?**
Docker runs the command periodically and marks the container `healthy` or `unhealthy`. `depends_on: condition: service_healthy` uses that status so the frontend starts only when the API is actually ready, not just started.

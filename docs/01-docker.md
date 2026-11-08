# Part 1 — Containerizing the Vacation Rental Channel Manager

Step-by-step log of how this app (React 19 + FastAPI, first on SQLite, now PostgreSQL) went from "runs on my laptop" to "runs in containers". Each step lists the files, the commands, the reasoning behind them, and the bugs I hit along the way.

**DevOps roadmap**

| # | Stage | Status |
|---|---|---|
| 1 | Docker — backend image | ✅ Done |
| 2 | Docker — frontend multi-stage image | ✅ Done |
| 3a | docker-compose + nginx reverse proxy (SQLite) | ✅ Done |
| 3b | Switch SQLite → PostgreSQL | ✅ Done |
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

## Step 3a — docker-compose + nginx reverse proxy

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

### 3.6 Results (verified)

`docker compose config` validated the file and showed what compose adds automatically: a private network (`vacation-rental-channel-manager_default`) and a project-prefixed volume (`vacation-rental-channel-manager_backend-data`).

`docker compose ps`:
```
NAME                                         IMAGE               STATUS                    PORTS
vacation-rental-channel-manager-backend-1    vrcm-backend:0.2    Up 22 seconds (healthy)   8000/tcp
vacation-rental-channel-manager-frontend-1   vrcm-frontend:0.2   Up 16 seconds             0.0.0.0:8080->8080/tcp
```

| Check | Result | What it proves |
|---|---|---|
| `curl localhost:8080/api/stats` | Returned stats JSON | nginx proxies `/api` to `backend:8000` over the compose network |
| `curl localhost:8000/health` | `Failed to connect` | Backend is private: `8000/tcp` (internal only) vs frontend's `0.0.0.0:8080->8080` (published) |
| Startup order | Backend `Healthy` at 6.0 s, frontend `Started` at 6.2 s | `depends_on: condition: service_healthy` waits for the HEALTHCHECK |
| `docker compose down` | Removed 2 containers + network (3 items), **volume kept** | Data survives container removal |
| `docker compose down -v` | Removed 2 containers + network + **volume** (4 items) | `-v` deletes named volumes, so data is reset to seed data |
| Old `vrcm-data` booking | Not visible in compose | Compose created its own project-prefixed volume |

### 3.7 Bugs I hit

| Symptom | Cause | Fix |
|---|---|---|
| Hand-typed `docker-compose.yml` invalid | `build:` at the same level as `backend:`; `image`/`volumes`/`restart` nested under `build:`; empty frontend `build:`; DB volume attached to frontend; no top-level `volumes:` | Indentation defines structure in YAML: 2 spaces per level. Validate with `docker compose config` before `up`. |
| Stray `Dockerfile` in project root | Ran `echo ... >> Dockerfile` from the wrong folder, so `>>` created a new file | Run `pwd` before any command that writes or deletes files. |
| `failed to connect to the docker API at npipe:...` | Docker Desktop not running. (`docker compose config` still worked because it only reads the file.) | Start Docker Desktop and wait for "Engine running". |

### 3.8 Commit

```bash
git add frontend/nginx.conf frontend/Dockerfile docker-compose.yml
git commit -m "Add docker-compose with nginx reverse proxy"
git push
```

---

## Step 3b — Switch SQLite → PostgreSQL

**Why:** SQLite is a single file and allows one writer at a time. That's fine on one laptop, but it can't be shared by several backend replicas (Kubernetes, Step 5) and it isn't what production runs. PostgreSQL is a separate database server that many app instances can connect to over the network.

**Split of work:** the app-code changes (about 190 lines across 11 files) came in as a patch. The DevOps part (compose service, healthcheck, secrets, Dockerfile) I did by hand.

### 3b.1 App-code changes (applied as a patch)

```bash
git am "/c/Users/almal/Downloads/0001-Switch-backend-from-SQLite-to-PostgreSQL.patch"
```

| SQLite (before) | PostgreSQL (after) | Why |
|---|---|---|
| `sqlite3` module | `psycopg[binary]==3.3.8` | Postgres driver for Python |
| `DATABASE_PATH` (a file) | `DATABASE_URL` (`postgresql://user:pass@host:5432/db`) | The DB is now a network service, not a file |
| `?` placeholders | `%s` placeholders | psycopg's parameter style. Values are still sent separately, never pasted into SQL (no SQL injection). |
| Dates stored as `TEXT` | `DATE` and `TIMESTAMPTZ` columns | Real types: the DB validates them and can do date maths (`check_out - check_in` = nights) |
| `cursor.lastrowid` | `INSERT ... RETURNING id` | Postgres returns the new id in the same statement |
| `BEGIN IMMEDIATE` (locks the **whole database**) | `SELECT ... FOR UPDATE` on the property row (locks **one property**) | Two bookings for the same property queue up; bookings for different properties don't block each other |
| `PRAGMA user_version` | `schema_meta` table + `pg_advisory_xact_lock` | Tracks the schema version. The advisory lock stops several replicas from creating tables at the same moment. |
| Tests on a temp SQLite file | Tests on a real Postgres (`TEST_DATABASE_URL`) | Test against the same database you run in production |

**New test: concurrent double-booking.** It fires the same booking 10 times at once and expects exactly one `201` and nine `409`s. With `FOR UPDATE` removed, the test caught the double-booking in 1 of 3 runs (races depend on timing). With the lock, it passes every time. Result: **20 tests passing** on PostgreSQL 16.

### 3b.2 Clean up `backend/Dockerfile`

SQLite needed a `/data` folder and `DATABASE_PATH`. Postgres needs neither:

```dockerfile
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    CORS_ORIGINS=http://localhost:5173

RUN useradd --create-home --uid 1000 appuser
```

### 3b.3 Secrets in `.env`

```bash
printf "POSTGRES_USER=vrcm\nPOSTGRES_PASSWORD=change-me\nPOSTGRES_DB=vrcm\n" > .env.example
cp .env.example .env
git status      # .env must NOT be listed
```

- Compose automatically reads `.env` from the project root and fills in `${POSTGRES_PASSWORD}` etc.
- `.env` is in `.gitignore`, so the real password never reaches GitHub. Only `.env.example` (placeholder values) is committed.
- In Kubernetes this becomes a **Secret**; on AWS, Secrets Manager.

### 3b.4 Add the `db` service to `docker-compose.yml`

```yaml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - db-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U $${POSTGRES_USER} -d $${POSTGRES_DB}"]
      interval: 5s
      timeout: 3s
      retries: 10
    restart: unless-stopped

  backend:
    build: ./backend
    image: vrcm-backend:0.3
    environment:
      DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}
    depends_on:
      db:
        condition: service_healthy
    restart: unless-stopped

  frontend:
    build: ./frontend
    image: vrcm-frontend:0.3
    ports:
      - "8080:8080"
    depends_on:
      backend:
        condition: service_healthy
    restart: unless-stopped

volumes:
  db-data:
```

| Setting | Reason |
|---|---|
| `postgres:16-alpine` (pinned) | Never `latest` for a database: a major-version jump can make existing data files unreadable. |
| `pg_isready` healthcheck | Postgres's own readiness check. "Container running" ≠ "database accepting connections". |
| `$$` in the healthcheck | `$$` escapes `$`, so the variable is read **inside the container** at check time instead of being filled in by compose. |
| `@db:5432` in `DATABASE_URL` | `db` is the service name: compose DNS again. |
| `db` has no `ports:` | Only the backend can reach the database. |
| `db-data` volume at `/var/lib/postgresql/data` | Where Postgres stores its files. Data survives `docker compose down`. |
| Chain `db → backend → frontend` | Each waits for the previous one's healthcheck. |

### 3b.5 Run and verify

```bash
docker compose config | grep DATABASE_URL     # password filled in from .env
docker compose down -v                        # remove the old SQLite volume
docker compose up -d --build
docker compose ps
docker compose exec db psql -U vrcm -d vrcm -c "SELECT COUNT(*) FROM reservations;"
```

### 3b.6 Results (verified)

`docker compose config` → `DATABASE_URL: postgresql://vrcm:change-me@db:5432/vrcm` (`.env` was read).

`docker compose ps`:
```
NAME                                         IMAGE                STATUS                    PORTS
vacation-rental-channel-manager-db-1         postgres:16-alpine   Up 19 seconds (healthy)   5432/tcp
vacation-rental-channel-manager-backend-1    vrcm-backend:0.3     Up 13 seconds (healthy)   8000/tcp
vacation-rental-channel-manager-frontend-1   vrcm-frontend:0.3    Up 5 seconds              0.0.0.0:8080->8080/tcp
```

| Check | Result | What it proves |
|---|---|---|
| Uptimes 19 s → 13 s → 5 s | db, then backend, then frontend | The healthcheck chain controls startup order |
| Ports column | Only `8080` published; `5432` and `8000` internal | DB and API are private |
| `psql ... SELECT COUNT(*) FROM reservations` | `83` | Seed data lives in PostgreSQL, checked directly in the DB, not through the app |
| pytest | 20 passed | App works on Postgres, including the concurrency test |

### 3b.7 Bugs / gotchas

| Symptom | Cause | Fix |
|---|---|---|
| `git am` → `could not open '<path find printed>'` | Typed the placeholder literally; patch also hadn't been downloaded | Download the file, then use the real path `find` prints |
| `git status`: "You are in the middle of an am session" | Ran `git am` a second time; the patch was already applied | `git am --quit` (clears the session, keeps commits). Not `--abort`, which rewinds the branch to where that `git am` started. |
| `grep DATABASE_URL` printed nothing | `docker-compose.yml` was still the old version | Check the file with `cat` before debugging further |

### 3b.8 Commit

```bash
git add backend/Dockerfile docker-compose.yml .env.example
git commit -m "Add PostgreSQL to docker-compose with healthcheck and env-based secrets"
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

**What is a reverse proxy?**
A server in front of backend services that receives every client request and forwards it to the right service. Here, users only connect to nginx on 8080. nginx serves the React files and forwards `/api` to the backend on 8000 inside the Docker network. The backend has no published port, so users can't reach it directly. One origin means no CORS. In Kubernetes, an Ingress controller does the same job. (A *forward* proxy is the opposite: it sits in front of clients, like a corporate proxy or VPN.)

**What happens to data on `docker compose down` vs `down -v`?**
Containers are disposable. `down` removes containers and networks but keeps named volumes, so new containers reattach to the same data. `down -v` also deletes the volumes, and the data with them.

**How do containers in compose find each other?**
Compose creates a network with built-in DNS. Each service name resolves to its container's IP, so nginx reaches the backend at `http://backend:8000`.

**What does `HEALTHCHECK` do, and why does compose care?**
Docker runs the command periodically and marks the container `healthy` or `unhealthy`. `depends_on: condition: service_healthy` uses that status so the frontend starts only when the API is actually ready, not just started.

**Why move from SQLite to PostgreSQL?**
SQLite is a file with one writer at a time, so several backend replicas can't share it. PostgreSQL is a server that many app instances connect to over the network, handles concurrent writes, and is what production runs.

**How do you prevent double-booking when two requests arrive at the same moment?**
Inside one transaction, `SELECT ... FOR UPDATE` locks the property's row, then the code checks for overlapping stays and inserts. A second request for the same property waits at the lock until the first commits, then sees the new booking and gets a 409. Other properties aren't blocked. A concurrency test fires 10 identical requests and asserts exactly one succeeds. (An alternative is a Postgres exclusion constraint on the date range, which enforces it in the schema itself.)

**How do you handle the database password?**
It lives in a `.env` file that's gitignored; compose substitutes it into the containers. Only `.env.example` with placeholder values is committed. In Kubernetes it moves to a Secret, and on AWS to Secrets Manager.

**Why not use `postgres:latest`?**
A new major version can't read the old version's data files without an upgrade step. Pinning `16-alpine` means a rebuild never silently changes the database version.

**What does `depends_on: condition: service_healthy` not guarantee?**
It only controls startup order. If the database restarts later, the backend's requests fail until it's back; the backend's `/health` checks the DB, so Docker marks it unhealthy meanwhile. Kubernetes has no `depends_on` at all, so apps should retry connections on their own.
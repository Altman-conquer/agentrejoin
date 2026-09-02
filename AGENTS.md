# Agent Workflow

## Sync To Main

When the user says `sync to main` or `synt to main`, they mean:

1. Fetch `origin/main`.
2. Rebase the current branch on `origin/main`.
3. Push the current HEAD directly to `main` with a normal push, for example:
   `git push origin HEAD:main`

Do not force push for this workflow.

## Default Delivery

After completing and verifying a user-requested code change:

1. Commit only the relevant tracked changes and push `main` to `origin/main`
   without waiting for a separate push request. Never force push or include
   unrelated user changes.
2. Deploy the production web stack at `https://agentrejoin.zhandj.com` using
   the existing deployment on `root@agentrejoin-prod` in `/opt/agentrejoin`,
   then verify the website and web app. Preserve the server `.env`,
   `AGENTREJOIN_MASTER_SECRET`, and persistent data volumes.
   Wait for `.github/workflows/container.yml` to publish the production image to
   `ghcr.io/altman-conquer/agentrejoin`, pull the image tagged with the full Git
   commit on the server, and only then recreate the container. Never build a
   production image on the local workstation or production server. After the
   new deployment is healthy and verified, promptly remove unused older
   `ghcr.io/altman-conquer/agentrejoin` and local `agentrejoin` images, while
   preserving the running image and persistent data volumes, then recheck disk
   usage.
3. When a change affects `packages/agentrejoin-app`, mobile/shared UI or behavior,
   app assets, configuration, or native dependencies, rely on
   `.github/workflows/android-apk.yml` to build, sign, verify, and publish the
   arm64 APK from GitHub Actions. Wait for that workflow and verify its GitHub
   Release artifact. Do not build APKs on the local workstation or production
   server. Documentation-only and server-only changes do not require an APK.
   Build standalone APKs only. Do not add Google Play, AAB, or Play App Signing
   configuration unless explicitly requested.

If push, deployment, or packaging is genuinely blocked, report the blocker
and the completed local work instead of silently skipping delivery.

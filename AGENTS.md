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
   Build production Docker images on the local workstation with Docker Desktop;
   never build them on the production server, which does not have enough build
   capacity. Transfer the completed image to the server, load it there, and only
   then recreate the container.
3. Rebuild the Android arm64 APK when the change affects
   `packages/agentrejoin-app`, mobile/shared UI or behavior, app assets,
   configuration, or native dependencies. Increment `versionCode`, verify the
   package, ABI, and signature, and place the APK in `releases/`. Do not commit
   large APK files to Git history. Documentation-only and server-only changes
   do not require an APK rebuild.
   Sign public APKs with the long-lived release key stored outside the repository
   at `~/.local/share/agentrejoin/signing/agentrejoin-release.p12`; never ship an
   APK signed with the Android debug key. Build standalone APKs only. Do not add
   Google Play, AAB, or Play App Signing configuration unless explicitly requested.

If push, deployment, or packaging is genuinely blocked, report the blocker
and the completed local work instead of silently skipping delivery.

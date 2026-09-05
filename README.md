# Hearth

PWA frontend for Home Assistant.

## Unraid deployment

Deploy the latest commit from the checked-out `main` branch:

```bash
cd /mnt/cache/appdata/hearth
bash update.sh
```

The deployment script:

- updates `main` with a fast-forward-only pull
- builds an image tagged with the Git commit
- validates the image in a loopback-only test container
- checks Nginx, HTTP, service-worker headers, the application bundle, and the recovery page
- retains the previous live container for rollback
- restores the previous container when deployment validation fails
- removes older stopped rollback containers after a successful deployment

If an installed client remains on an older cached release, open `/api/pwa-update.html` on the deployed Hearth origin.

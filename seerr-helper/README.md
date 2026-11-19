# IvanaFin Seerr helper

A small service that gives IvanaFin's Discover a real **Cancel** button, on Samsung, Android and
Jellyfin web (with the IvanaFin scripts):

- the request is deleted in Seerr, **and**
- the download is stopped: the film is removed from Radarr / the show from Sonarr, together with its
  item in the download client. Anything already downloaded is never touched (then only the request goes;
  for a show that is partly downloaded, only the cancelled seasons stop).

Who may cancel follows Seerr's own rule: Seerr admins and users with *Manage Requests* can cancel any
request, everyone else only their own request that is still waiting for approval. The helper checks the
person's Jellyfin sign-in itself and finds their Seerr user, so nobody needs to enter anything.

Without the helper, Samsung and web show no Cancel button, and Android's Cancel only removes the request
in Seerr (the download carries on).

## Running it

Run it with Docker **on the same machine as Jellyfin**: the apps look for it on port **5056** of the
address they use for your Jellyfin server.

```
docker run -d --name ivf-seerr-helper --init --restart unless-stopped -p 5056:5056 \
  -e SEERR=http://<seerr-address>:5055 \
  -e JELLYFIN=http://<jellyfin-address>:8096 \
  -e SEERR_KEY=<Seerr API key> \
  -v "<folder with main.ts>:/app:ro" \
  denoland/deno:2.9.8 run --allow-net --allow-env /app/main.ts
```

- `SEERR_KEY`: in Seerr, *Settings > General > API Key*.
- `SEERR` / `JELLYFIN`: addresses the helper can reach (on Docker Desktop, `http://host.docker.internal:5055`
  works when they run on the same PC).
- Radarr and Sonarr are found through Seerr's own settings - nothing else to enter.
- On Windows with Git Bash, put `MSYS_NO_PATHCONV=1` in front of the command.

Check it: `http://<jellyfin-address>:5056/health` should show `{"ok":true}`. Each cancel writes one line to
`docker logs ivf-seerr-helper`.

The apps talk to the helper over plain `http`, on your home network. On Jellyfin web opened over `https`,
the browser blocks that, so the Cancel button doesn't appear there.

# IvanaFin for Samsung

<p align="center"><img src="cat.jpg" width="240" alt="The cat on IvanaFin's welcome screen"><br><sub>The cat on IvanaFin's welcome screen</sub></p>

IvanaFin is a [Jellyfin](https://jellyfin.org) app for Samsung smart TVs (Tizen), with its own look:
a big-tile home screen, full-screen film and show pages, a music library in the style of a TV music app,
and extras for Star Wars films and shows. It is the Samsung version of
[IvanaFin for Android TV / Fire TV](https://github.com/CHAD2BAD/IvanaFin-Android). For the same look in a
browser, see [IvanaFin for Jellyfin web](https://github.com/CHAD2BAD/IvanaFin-Web).

It works with **any Jellyfin server**. Nothing needs to be installed on the server: the IvanaFin look is
built into the app.

> **Status:** early. The same scripts run on the author's Samsung S90D (Tizen 9); this any-server build is new.

## What you get

- **Home:** big tiles for your libraries. The first time, IvanaFin shows your biggest Movies, Shows and
  Music library, plus a library named **Other** if you have one. To choose the tiles yourself, open Jellyfin's
  **Settings > Home**: the library order and the *Display in My Media* ticks decide which tiles appear
  and in which order. This is saved on your server, so it is the same on every TV.
- **Film and show pages** in full screen, with cast, chapters (Scenes) and More Like This.
- **Music:** artist pages with Popular songs and Albums / EPs & Singles / Mixtapes rows. These come from
  [Deezer](https://www.deezer.com): the artist's name is sent to Deezer's free public API when the page opens.
- **Star Wars extras** for the official films and shows (matched by their TMDB id): Featured Planets,
  Characters and Starships rows with a card for each, the in-universe year, the opening crawl and
  "In Story Order". A library that is mostly Star Wars gets a timeline sort button.
- **Discover** (browse and request films and shows) - **needs Seerr set up first** (see below).

## Discover needs Seerr

Everything else works with a plain Jellyfin server, but **Discover only appears if your server has
[Seerr](https://github.com/seerr-team/seerr) set up**. Without it, the Discover tile and button are hidden.
To turn it on:

1. Set up the download side first. All of these are needed - Discover depends on them working together:
   - [Radarr](https://github.com/Radarr/Radarr) (films) and [Sonarr](https://github.com/Sonarr/Sonarr) (shows),
     with a download client (for example qBittorrent).
   - [Prowlarr](https://github.com/Prowlarr/Prowlarr), connected to Radarr and Sonarr: it gives them the
     indexers to search. Without it, requests are accepted but nothing is ever found.
   - [Cleanuparr](https://github.com/Cleanuparr/Cleanuparr), connected to Radarr and Sonarr: it removes
     stuck or stalled downloads and searches again. Without it, a request can sit at "Downloading" forever.

   Also recommended:
   - [FlareSolverr](https://github.com/FlareSolverr/FlareSolverr), added to Prowlarr: lets Prowlarr use
     indexers that sit behind Cloudflare's "checking your browser" page. Without it, those indexers fail.
   - [Recyclarr](https://github.com/recyclarr/recyclarr): keeps Radarr's and Sonarr's quality profiles in
     line with the [TRaSH Guides](https://trash-guides.info), so requests download in a sensible quality and size.
   - [Bazarr](https://github.com/morpheus65535/bazarr), connected to Radarr and Sonarr: downloads subtitles
     for what they bring in.
2. Install and set up [Seerr](https://github.com/seerr-team/seerr), connected to your Jellyfin server and to
   Radarr / Sonarr. In Seerr's settings:
   - **Users:** import your Jellyfin users (*Users > Import Jellyfin Users*). Every person who should
     request needs a Seerr user with the **Request** permission - without it Discover still opens, but
     requests are refused. Give **Auto-Approve** too if requests should download straight away instead of
     waiting for you to approve them.
   - **Services:** pick the default Radarr and Sonarr server, with a root folder and quality profile that
     really exist there (a wrong root folder makes every request fail).
3. Install the [Jellyfin Enhanced](https://github.com/n00bcodr/Jellyfin-Enhanced) plugin on your
   Jellyfin server and enter your Seerr address and API key in its settings.
4. **Cancel button (recommended):** run the small [IvanaFin Seerr helper](seerr-helper) with Docker
   on the same machine as Jellyfin. It gives Discover a real **Cancel**: the request is removed in Seerr
   *and* the download is stopped in Radarr / Sonarr. Without it, the Cancel button isn't shown.
5. Restart IvanaFin on the TV.

## Install

Samsung only installs apps from its store, so this is installed in developer mode with
[Apps2Samsung](https://github.com/Apps2Samsung/Apps2Samsung) (Windows), which signs the
app for your TV:

1. Download `IvanaFin.wgt` from [Releases](../../releases).
2. Put the TV in developer mode: open **Apps**, press **1 2 3 4 5** on the remote, switch
   **Developer mode** on and enter your computer's IP address, then restart the TV.
3. Run Apps2Samsung on the computer, pick your TV and choose **Install a file...** with `IvanaFin.wgt`.
4. Open IvanaFin on the TV and sign in to your Jellyfin server.

IvanaFin installs next to the official Jellyfin app (it has its own app id). To update it, install a newer
`IvanaFin.wgt` the same way.

## Build it yourself

Windows PowerShell, with a Jellyfin server's web client on the same computer:

```
powershell -File build.ps1 [-WebDir <folder of jellyfin-web>]
```

This writes `IvanaFin.wgt` (unsigned). `-WebDir` defaults to `C:\Program Files\Jellyfin\Server\jellyfin-web`.
Use the web client of the same Jellyfin version as your server.

## Credits and licences

- **Jellyfin** web client (inside the `.wgt`) - GPL-2.0. The Tizen shell (`tizen.js`, `config.xml`) follows
  [jellyfin-tizen](https://github.com/jellyfin/jellyfin-tizen) - MPL-2.0.
- **ElegantFin** theme by lscambo13 (loaded from its CDN) - see its own licence.
- **Star Wars facts** shown in the Planets / Characters / Starships rows are summarised from
  [Wookieepedia](https://starwars.fandom.com) (text under CC BY-SA 3.0). The pictures are copies from
  Wookieepedia kept in the [IvanaFin repo](https://github.com/CHAD2BAD/IvanaFin-Android/tree/main/extras/star-wars);
  they belong to their owners. Star Wars is a trademark of Lucasfilm Ltd. This project is not affiliated
  with Lucasfilm or Disney.
- **Deezer** data is used for artist pages through Deezer's public API; IvanaFin is not affiliated with Deezer.

This repository is under the **Mozilla Public License 2.0** (see [LICENSE](LICENSE)).

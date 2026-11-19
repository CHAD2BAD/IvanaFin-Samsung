# IvanaFin for Samsung

IvanaFin is a [Jellyfin](https://jellyfin.org) app for Samsung smart TVs (Tizen), with its own look:
a big-tile home screen, full-screen film and show pages, a music library in the style of a TV music app,
and extras for Star Wars films and shows. It is the Samsung version of
[IvanaFin for Android TV / Fire TV](https://github.com/CHAD2BAD/IvanaFin-Android).

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

1. Install and set up Seerr, connected to your Jellyfin server (and to Radarr / Sonarr so requests
   are downloaded).
2. Install the [Jellyfin Enhanced](https://github.com/n00bcodr/Jellyfin-Enhanced) plugin on your
   Jellyfin server and enter your Seerr address and API key in its settings.
3. Restart IvanaFin on the TV.

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

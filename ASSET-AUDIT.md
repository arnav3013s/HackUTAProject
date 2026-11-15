# Gallery asset audit · 15 November 2026

`node scripts/audit-gallery.mjs` made a byte-range GET for every remote gallery image and checked for a successful image response. The original list had 30 images. Twenty-one returned an image and kept their URLs: IDs 1, 2, 4–8, 11, 12, 14–16, 19, 20, 22–28. Nine failed and were handled below. The requested ALGS Birmingham Championship and RLCS Worlds cards (IDs 26–27) were then removed. A network-enabled audit of the 24 remaining images and seven video thumbnails passed 31/31. Remote sites can change or block a browser later; the UI uses a local SVG fallback on load failure.

| ID | Original card | Failure | Resolution |
| --- | --- | --- | --- |
| 3 | 2025 Six Invitational | Publisher CDN returned HTTP 403. | Removed card; no verified replacement for that exact photo. |
| 9 | FaZe Vegas trophy | Old image URL returned HTTP 404. | Replaced with the source article's verified `og:image` URL. |
| 10 | Rain on the Major stage | HLTV CDN returned HTTP 403. | Removed card; no verified replacement for that exact photo. |
| 13 | Sparg0 on the Smash circuit | Old image host could not be reached and the source page returned HTTP 403. | Removed card; another working Sparg0 gallery image remains at ID 25. |
| 17 | Continental Cup champions | Old ONE Esports CDN returned HTTP 404. | Replaced with a working ONE Esports `og:image` URL. |
| 18 | TonyK in the FaZe jersey | Image host could not be reached; source page returned HTTP 403. | Removed card; no unrelated player photo was substituted. |
| 21 | HCS Dallas champions | Old image URL returned HTTP 404. | Replaced with the source article's verified `og:image` URL. |
| 29 | FaZe at FIFAe | Old blob host could not be reached. | Replaced with a working ONE Esports `og:image` URL. |
| 30 | Thailand lineup | Old ONE Esports CDN returned HTTP 404. | Replaced with a working ONE Esports `og:image` URL. |

The gallery video uses local `public/hero.mp4` with `public/hero.png` as poster, metadata preload, mobile inline playback, and an on-error message. Both files are present and return HTTP 200 in local preview. The audit also checked all seven YouTube thumbnails; each returned an image response. YouTube cards use an image fallback and open `youtube-nocookie.com` embeds. Embed playback depends on the publisher allowing embedding and the viewer's browser/network; the modal also links directly to YouTube.

The Super Smash Bros. game image previously referenced an unrelated retail URL. The Esports and Teams pages now use local `public/images/games/smash.svg`. Player portraits use the separate photo convention in `PLAYER-PHOTO-CHECKLIST.md` and show initials and a silhouette until approved images are supplied.

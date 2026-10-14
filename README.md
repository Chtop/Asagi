# Asagi

Read-only 4chan reader for an iPhone through SideStore. The title does not use the 4chan name: the public API terms forbid it in the application name.

Expo SDK 57 and React Native 0.86. The iOS bundle identifier is `app.asagi.reader`. The interface is in English.

## Features

- Board list, local search, and a worksafe / NSFW filter from the `ws_board` field.
- Open a board or a thread from a pasted `boards.4chan.org` or `boards.4channel.org` link.
- Catalog as a grid or a list. Sort by bump, date, replies, or images. Search the catalog that is already loaded. Sort and order stay hidden until Sort is tapped.
- Full threads. Opening a thread again returns to the last post on screen. Refresh, Top, and Bottom sit at the bottom of a thread, a catalog, and a quote view.
- Gallery: swipe through the thread's files, zoom, and play MP4 and WebM. The WebM player has play, pause, duration, a timeline, and mute.
- Quotes: the post, the posts it quotes, and the posts that quote it. Back returns one level at a time.
- Links in a post open on tap. A board link stays in the app. Other web links open in the browser. Plain post text can be selected and copied.
- Save images, GIFs, and MP4 into one Photos album per board. WebM cannot go into Photos, so it goes through the share sheet, to Files.
- Media kept in the app, one folder per board, and grouped in the Media tab. Those files stay when the cache is cleared.
- Cache size and a one-tap clear. History, favorites, the last read post, and saved media stay.
- Favorites, history, and settings stored on the device, in AsyncStorage.
- Dark, light, or system theme.

The app reads `a.4cdn.org` and `i.4cdn.org`: one request at a time, at most one per second, with `If-Modified-Since`. Nothing is sent to another server. MP4 uses the iOS player. WebM, the most common video format, is decoded by an embedded VLC player, because the iOS player cannot open it.

## Development

Node.js 22.

```bash
npm install
npm start
npm run typecheck
```

## Install on an iPhone

The **Build SideStore IPA** workflow builds an unsigned iPhone IPA on a macOS runner. SideStore signs it with a free Apple account. No local Mac and no Apple Developer subscription are required.

1. Open the **Actions** tab, workflow **Build SideStore IPA**, **Run workflow**.
2. Download [Asagi-unsigned.ipa](https://github.com/Chtop/Asagi/releases/download/sidestore/Asagi-unsigned.ipa). That is the IPA itself, not a zip. The same link is in the run summary. Each successful build replaces the [sidestore](https://github.com/Chtop/Asagi/releases/tag/sidestore) release.
3. Install that file with SideStore.

The build takes about 20 to 40 minutes. An app signed with a free account expires after about 7 days, and at most three apps can be installed. Changing `app.asagi.reader` after the first install counts as a new App ID.

## License

MIT. See [LICENSE](LICENSE).

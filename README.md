# Asagi

Lecteur 4chan en lecture seule, prévu pour un iPhone via SideStore. Le titre n'utilise pas la marque 4chan : les conditions de l'API publique l'interdisent dans le nom de l'application.

Expo SDK 57 et React Native 0.86. L'identifiant iOS est `app.asagi.reader`.

## Fonctions

- Liste des boards, avec filtre worksafe / NSFW à partir du champ `ws_board`.
- Catalogues et threads complets, images, vidéos MP4 et WebM.
- Favoris et historique stockés sur l'appareil, dans AsyncStorage.
- Thème sombre, clair ou système.

L'app lit `a.4cdn.org` et `i.4cdn.org` : une requête à la fois, au plus une par seconde, avec `If-Modified-Since`. Rien n'est envoyé à un autre serveur. Les MP4 passent par le lecteur iOS. Les WebM, le format le plus courant des vidéos, sont décodés par un lecteur VLC embarqué, parce que le lecteur iOS ne sait pas les ouvrir.

## Développement

Node.js 22.

```bash
npm install
npm start
npm run typecheck
```

## Installer sur un iPhone

Le workflow **Build SideStore IPA** compile, sur un runner macOS, un IPA iPhone non signé. SideStore le signe avec un compte Apple gratuit. Aucun Mac local et aucun abonnement Apple Developer ne sont nécessaires.

1. Onglet **Actions**, workflow **Build SideStore IPA**, **Run workflow**.
2. Télécharger [Asagi-unsigned.ipa](https://github.com/Chtop/Asagi/releases/download/sidestore/Asagi-unsigned.ipa). C'est le fichier IPA, pas un zip. Le même lien est dans le résumé du run. Chaque build réussi remplace la release [sidestore](https://github.com/Chtop/Asagi/releases/tag/sidestore).
3. Installer ce fichier avec SideStore.

Le build dure environ 20 à 40 minutes. Une app signée avec un compte gratuit expire après environ 7 jours, et trois apps au plus peuvent être installées. Changer `app.asagi.reader` après la première installation compte comme un nouvel App ID.

## Licence

MIT. Voir [LICENSE](LICENSE).

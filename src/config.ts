/**
 * Nom affiché. Les conditions de l'API publique interdisent d'utiliser
 * « 4chan » dans le titre de l'application, du produit ou du service.
 * Le bundle iOS (app.asagi.reader) est dans app.json : le changer après
 * la première installation SideStore compte comme un nouvel App ID.
 */
export const APP_NAME = "Asagi";

/** JSON en lecture seule. Aucun paramètre de query n'est accepté par l'API. */
export const API_ORIGIN = "https://a.4cdn.org";

/**
 * Fichiers utilisateurs.
 * Miniature : `{tim}s.jpg` (toujours JPEG).
 * Fichier : `{tim}{ext}`, ext inclut le point (`.jpg`, `.webm`, …).
 */
export const MEDIA_ORIGIN = "https://i.4cdn.org";

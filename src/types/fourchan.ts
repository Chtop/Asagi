/** Board tel que renvoyé par `/boards.json`. Seuls les champs utilisés sont typés. */
export type Board = {
  board: string;
  title: string;
  /** 1 = worksafe, 0 = NSFW. C'est le drapeau officiel de l'API, pas une liste locale. */
  ws_board: 0 | 1;
  meta_description?: string;
  pages?: number;
  spoilers?: 0 | 1;
};

export type BoardsResponse = {
  boards: Board[];
};

/**
 * Post d'un catalog ou d'un thread.
 * Dans un thread, `resto === 0` désigne l'OP. `ext` inclut le point.
 */
export type Post = {
  no: number;
  resto?: number;
  time?: number;
  name?: string;
  trip?: string;
  sub?: string;
  com?: string;
  filename?: string;
  ext?: string;
  w?: number;
  h?: number;
  tim?: number;
  fsize?: number;
  replies?: number;
  images?: number;
  sticky?: 0 | 1;
  closed?: 0 | 1;
  filedeleted?: 0 | 1;
  spoiler?: 0 | 1;
  capcode?: string;
};

export type CatalogPage = {
  page: number;
  threads: Post[];
};

export type ThreadResponse = {
  posts: Post[];
};

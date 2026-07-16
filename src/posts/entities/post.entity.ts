export class Post {
  id: string;
  content: string;
  author_id: string;
  author_handle: string; // ej: "maria@planeta-marte"
  is_remote: boolean;
  remote_id?: string; // ID original en el servidor remoto
  remote_url?: string; // URL original del post
  likes_count: number;
  shares_count: number;
  visibility: string; // public, unlisted, followers-only, direct
  created_at: string;
  updated_at: string;
  liked_by_me?: boolean;
}

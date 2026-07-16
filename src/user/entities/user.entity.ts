export class User {
  id: string;
  username: string;
  email: string;
  password: string;
  server: string; // ej: "planeta-tierra"
  full_handle: string; // ej: "raul@planeta-tierra"
  display_name?: string;
  bio?: string;
  avatar_url?: string;
  is_remote: boolean; // true si es de otro servidor
  remote_url?: string; // URL del perfil en el servidor remoto
  public_key?: string; // Para verificar firmas de actividades
  inbox_url?: string; // URL del inbox para usuarios remotos
  notifications_seen_at?: Date; // Marca temporal de última lectura de notificaciones
  created_at: Date;
  updated_at: Date;
}

export interface ImageInfo {
  id?: number | string;
  image_name: string;
  image_url: string;
  original_file_name: string;
  date_time?: string | null;
  location?: string | null;
  latitude?: string | null;
  longitude?: string | null;
  file_size?: number;
  file_type?: string;
  uploaded_at?: string;
  created_at?: string;
} 
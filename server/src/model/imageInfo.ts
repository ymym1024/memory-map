export interface ImageInfo {
  image_name: string;
  image_url: string;
  original_file_name: string;
  date_time?: string | null;
  location?: string | null;
  latitude?: string | null;
  longitude?: string | null;
  file_size?: number;
  file_type?: string;
  created_at?: string;
  image_uploaded_at?: string;
} 
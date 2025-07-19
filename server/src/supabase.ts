import dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';

const supabaseUrl:string= process.env.SUPABASE_URL as string || '';
const supabaseKey:string = process.env.SUPABASE_KEY  as string || '';
export const supabase = createClient(supabaseUrl, supabaseKey); 
import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
import multer from 'multer';
import { supabase } from './supabase';
import { ImageInfo } from './model/imageInfo';

const app = express();
const port = 5000;

// 미들웨어 설정
app.use(cors());
app.use(express.json());

// multer 설정
const upload = multer({ storage: multer.memoryStorage() });

// 서버가 server 디렉토리에서 실행되므로 상위 디렉토리로 이동
const distPath = path.join(process.cwd(), '..', 'dist');
const indexPath = path.join(distPath, 'index.html');

// 디버깅: 경로와 파일 존재 여부 출력
console.log('Current working directory:', process.cwd());
console.log('distPath:', distPath);
console.log('indexPath:', indexPath);
console.log('index.html exists:', fs.existsSync(indexPath));

app.use(express.static(distPath));

// 이미지와 메타데이터 업로드 API
app.post('/api/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const { name, date, location, latitude, longitude } = req.body;
    const file = req.file;
    
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // 1. Supabase Storage에 파일 업로드
    const filePath = `images/${Date.now()}_${file.originalname}`;
    const { data: storageData, error: storageError } = await supabase
      .storage
      .from('images') // 'images'는 Supabase Storage의 버킷 이름
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false
      });

    if (storageError) {
      console.error('Storage upload error:', storageError);
      return res.status(500).json({ error: 'Storage upload failed', details: storageError.message });
    }

    // 2. Public URL 생성
    const { data: publicUrlData } = supabase
      .storage
      .from('images')
      .getPublicUrl(filePath);

    const imageURL = publicUrlData?.publicUrl;
    console.log('이미지 경로 :',imageURL);

    // 3. Supabase Database에 메타데이터 저장
    const imageInfo: ImageInfo = {
      image_name: name || file.originalname,
      image_url: imageURL,
      original_file_name: file.originalname,
      date_time: date || null,
      location: location || null,
      latitude: latitude || null,
      longitude: longitude || null,
      file_size: file.size,
      file_type: file.mimetype,
      created_at: new Date().toISOString(),
      image_uploaded_at: new Date().toISOString()
    };

    const { data: dbData, error: dbError } = await supabase
      .from('image_info')
      .insert([imageInfo]);

    if (dbError) {
      console.error('DB insert error:', dbError);
      return res.status(500).json({ error: 'DB insert failed', details: dbError.message });
    }

    res.json({ success: true, imageURL, message: '업로드가 완료되었습니다.' });
  } catch (error) {
    console.error('업로드 실패:', error);
    res.status(500).json({ error: 'Upload failed', message: '업로드에 실패했습니다.' });
  }
});

// 이미지 정보 전체 조회 API
app.get('/api/images', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('image_info')
      .select('*')
      .order('date_time', { ascending: false });
    if (error) {
      console.error('DB select error:', error);
      return res.status(500).json({ error: 'DB select failed', details: error.message });
    }

    console.log('조회 결과 : ',data)
    res.json({ success: true, images: data });
  } catch (error) {
    console.error('조회 실패:', error);
    res.status(500).json({ error: 'Fetch failed', message: '이미지 정보를 불러오지 못했습니다.' });
  }
});

// 모든 GET 요청에 대해 index.html 반환
app.get('/', (req: Request, res: Response) => {
  res.sendFile(indexPath);
});

// 정적 파일이 아닌 모든 경로에 대해 index.html 반환
app.get('*', (req: Request, res: Response) => {
  // 정적 파일 요청이 아닌 경우에만 index.html 반환
  if (!req.path.includes('.')) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('Not found');
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

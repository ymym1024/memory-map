import { useState } from "react";
import EXIF from "exif-js";
import exifr from "exifr";
import { heicTo, isHeic } from "heic-to";
import MetadataInput from "./MetadataInput";

interface ExtractedMetadata {
  latitude?: number;
  longitude?: number;
  DateTimeOriginal?: string | Date;
  DateTime?: string | Date;
  CreateDate?: string | Date;
  [key: string]: any;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function UploadDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("/photo3.jpg");
  const [name, setName] = useState("");
  const [date, setDate] = useState<string>("");
  const [location, setLocation] = useState<string>("");
  const [latitude, setLatitude] = useState<string>("");
  const [longitude, setLongitude] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [metadataStatus, setMetadataStatus] = useState<string>("");
  const [uploadStatus, setUploadStatus] = useState<string>("");
  const [showMetadataInput, setShowMetadataInput] = useState(false);


  // 경도/위도 좌표로 주소를 가져오는 함수 (OpenStreetMap Nominatim API 사용)
  const getLocationFromCoordinates = async (latitude: number, longitude: number): Promise<string> => {
    try {
      console.log('좌표로 주소 조회 중:', latitude, longitude);
      
      // OpenStreetMap Nominatim API 사용 (무료, API 키 불필요)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
        {
          headers: {
            'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
            'User-Agent': 'MemoryMap/1.0'
          }
        }
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('주소 조회 결과:', data);
      
      if (data.address){
        const country = data.address.country;
        const city = data.address.city;
        const district = data.address.borough?data.address.borough : (data.address.city_district?data.address.city_district : data.address.town);
        const suburb = data.address.suburb?data.address.suburb : (data.address.quarter?data.address.quarter : data.address.road);

        return country+", "+city+", "+district+", "+suburb
      } else {
        return data.display_name;
      }
    } catch (error) {
      console.error('주소 조회 실패:', error);
      return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    }
  };

  // exifr와 exif-js를 이용한 표준화된 메타데이터 추출 함수
  const extractExifData = async (file: File): Promise<ExtractedMetadata | null> => {
    try {
      // 1. Try with exifr first
      const exifData = await exifr.parse(file, {
        gps: true,
        exif: true,
        mergeOutput: true,
        reviveValues: false,
      });

      if (exifData && exifData.latitude && exifData.longitude) {
        return exifData as ExtractedMetadata;
      }

      // 2. Fallback to exif-js if exifr fails or lacks GPS data
      return new Promise((resolve) => {
        EXIF.getData(file as any, function(this: any) {
          const allTags = EXIF.getAllTags(this);
          if (allTags.GPSLatitude && allTags.GPSLongitude) {
            function dmsToDeg([d, m, s]: any[], ref: string) {
              const deg = d + m / 60 + s / 3600;
              return (ref === "S" || ref === "W") ? -deg : deg;
            }
            const manualLats = Array.isArray(allTags.GPSLatitude) ? allTags.GPSLatitude : [allTags.GPSLatitude, 0, 0];
            const manualLngs = Array.isArray(allTags.GPSLongitude) ? allTags.GPSLongitude : [allTags.GPSLongitude, 0, 0];

            allTags.latitude = dmsToDeg(manualLats, allTags.GPSLatitudeRef);
            allTags.longitude = dmsToDeg(manualLngs, allTags.GPSLongitudeRef);
          }
          resolve(allTags as ExtractedMetadata);
        });
      });
    } catch (error) {
      console.error('메타데이터 추출 중 오류 발생:', error);
      return null;
    }
  };

  // 파일 확장자 확인 (기존 함수 대체)
  const isHeicFile = async (file: File): Promise<boolean> => {
    try {
      return await isHeic(file);
    } catch (error) {
      console.warn('HEIC 파일 체크 실패:', error);
      // 파일 이름으로 대체 체크
      return file.name.toLowerCase().endsWith('.heic') || 
             file.name.toLowerCase().endsWith('.heif');
    }
  };
  // HEIF/HEIC 파일 변환 함수
  const convertHeifFile = async (file: File): Promise<File | null> => {
    try {
      console.log('HEIC/HEIF 파일 변환 시작:', {
        name: file.name,
        type: file.type,
        size: file.size
      });

      // heic-to를 사용하여 JPG로 변환
      const jpegBlob = await heicTo({
        blob: file,
        type: "image/jpeg",
        quality: 0.92  // 높은 품질 유지
      });

      // Blob을 File로 변환
      const convertedFile = new File([jpegBlob], file.name.replace(/\.(heic|heif)$/i, '.jpg'), {
        type: 'image/jpeg',
        lastModified: Date.now()
      });

      console.log('HEIC → JPG 변환 완료:', {
        name: convertedFile.name,
        type: convertedFile.type,
        size: convertedFile.size
      });

      // 변환된 파일 검증
      const isValid = await validateImageFile(convertedFile);
      if (isValid) {
        console.log('heic2any 변환 성공:', {
          name: convertedFile.name,
          type: convertedFile.type,
          size: convertedFile.size
        });
        return convertedFile;
      }

      // 변환 실패 시 Canvas 변환 시도
      try {
        console.log('Canvas 변환 시도...');
        return await convertWithCanvas(file);
      } catch (canvasError) {
        console.error('Canvas 변환도 실패:', canvasError);
        return null;
      }

    } catch (error: any) {
      console.error('HEIC/HEIF 변환 최종 실패:', error);
      setMetadataStatus(`HEIC 변환 실패: ${error.message || '알 수 없는 오류'}`);
      return null;
    }
  };

  // Canvas를 사용한 대체 변환 함수
  const convertWithCanvas = async (file: File): Promise<File | null> => {
    try {
      console.log('Canvas 변환 시작');
      
      return new Promise((resolve, reject) => {
        const objectUrl = URL.createObjectURL(file);
        const img = new Image();
        img.crossOrigin = "anonymous"; // CORS 설정 추가
        
        const cleanup = () => {
          URL.revokeObjectURL(objectUrl);
        };
        
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d', {
              willReadFrequently: true,
              alpha: false // 알파 채널 비활성화
            });
            
            if (!ctx) {
              cleanup();
              reject(new Error('Canvas context 생성 실패'));
              return;
            }

            // 원본 크기 유지
            canvas.width = img.width;
            canvas.height = img.height;

            // 배경을 흰색으로 설정
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // 이미지 그리기
            ctx.drawImage(img, 0, 0);
            
            canvas.toBlob(
              (blob) => {
                cleanup();
                if (blob) {
                  const convertedFile = new File([blob], file.name.replace(/\.(heic|heif)$/i, '.jpg'), {
                    type: 'image/jpeg',
                    lastModified: Date.now()
                  });
                  resolve(convertedFile);
                } else {
                  reject(new Error('Blob 생성 실패'));
                }
              },
              'image/jpeg',
              0.92
            );
          } catch (error) {
            cleanup();
            reject(error);
          }
        };
        
        img.onerror = () => {
          cleanup();
          reject(new Error('이미지 로드 실패'));
        };
        
        img.src = objectUrl;
      });
    } catch (error: any) {
      console.error('Canvas 변환 실패:', error);
      return null;
    }
  };

  // 이미지 파일 유효성 검사 함수
  const validateImageFile = (file: File): Promise<boolean> => {
    return new Promise((resolve) => {
      try {
        console.log('이미지 파일 검증 시작:', {
          name: file.name,
          type: file.type,
          size: file.size
        });

        // 파일 크기 검증
        if (file.size === 0) {
          console.error('파일 크기가 0입니다.');
          resolve(false);
          return;
        }

        // MIME 타입 검증
        if (!file.type.startsWith('image/')) {
          console.error('유효하지 않은 이미지 MIME 타입:', file.type);
          resolve(false);
          return;
        }

        const objectUrl = URL.createObjectURL(file);
        const img = new Image();
        
        img.onload = () => {
          // 이미지 크기 검증
          if (img.width === 0 || img.height === 0) {
            console.error('유효하지 않은 이미지 크기:', img.width, 'x', img.height);
            URL.revokeObjectURL(objectUrl);
            resolve(false);
            return;
          }

          console.log('이미지 파일 검증 성공:', {
            width: img.width,
            height: img.height,
            aspectRatio: (img.width / img.height).toFixed(2)
          });
          URL.revokeObjectURL(objectUrl);
          resolve(true);
        };
        
        img.onerror = () => {
          console.error('이미지 파일 검증 실패');
          URL.revokeObjectURL(objectUrl);
          resolve(false);
        };
        
        img.src = objectUrl;
      } catch (error) {
        console.error('이미지 파일 검증 중 오류:', error);
        resolve(false);
      }
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Reset states
    if (preview.startsWith('blob:')) {
      URL.revokeObjectURL(preview);
    }
    setFileToUpload(null);
    setPreview("/photo3.jpg");
    setName("");
    setDate("");
    setLocation("");
    setLatitude("");
    setLongitude("");
    setMetadataStatus("");
    setUploadStatus("");
    setShowMetadataInput(false);

    setIsLoading(true);
    setMetadataStatus("파일 처리 중...");

    try {
      // 1. HEIC 파일 체크
      const isHeicImage = await isHeicFile(selectedFile);
      
      // 2. 메타데이터 추출
      const exifData = await extractExifData(selectedFile);
      console.log("추출된 메타데이터:", exifData);

      let hasMetadata = false;

      if (exifData) {
        if (exifData.latitude && exifData.longitude) {
          const { latitude: lat, longitude: lon } = exifData;
          setLatitude(String(lat));
          setLongitude(String(lon));
          try {
            const address = await getLocationFromCoordinates(lat, lon);
            setLocation(address);
            hasMetadata = true;
          } catch (error) {
            console.warn('주소 변환 실패, 좌표로 대체합니다.', error);
            setLocation(`${lat.toFixed(6)}, ${lon.toFixed(6)}`);
          }
        }
        
        const dateTime = exifData.DateTimeOriginal || exifData.DateTime || exifData.CreateDate;
        if (dateTime) {
          setDate(dateTime.toString());
          hasMetadata = true;
        }
        setMetadataStatus(hasMetadata ? "메타데이터 추출 완료" : "메타데이터 정보 없음");
      } else {
        setMetadataStatus("메타데이터 정보 없음");
      }

      // 3. HEIC 변환 (필요한 경우)
      let fileForProcessing = selectedFile;
      if (isHeicImage) {
        setMetadataStatus("HEIC 파일 변환 중...");
        const convertedFile = await convertHeifFile(selectedFile);
        if (convertedFile) {
          fileForProcessing = convertedFile;
          setMetadataStatus(hasMetadata ? "HEIC 변환 완료" : "메타데이터 정보 없음");
        } else {
          throw new Error("HEIC 파일 변환에 실패했습니다.");
        }
      }

      // 4. 파일 설정 및 미리보기
      setFileToUpload(fileForProcessing);
      const previewUrl = URL.createObjectURL(fileForProcessing);
      setPreview(previewUrl);

      // 5. 메타데이터가 없는 경우 입력 모달 표시
      if (!hasMetadata) {
        setShowMetadataInput(true);
      }

    } catch (error: any) {
      console.error("파일 처리 중 오류:", error);
      setMetadataStatus(`오류: ${error.message}`);
      setUploadStatus("처리 실패");
      setPreview("/photo3.jpg");
    } finally {
      setIsLoading(false);
      if(!metadataStatus) setMetadataStatus("");
    }
  };

  const handleUpload = async () => {
    if (!fileToUpload) {
      alert("업로드할 파일이 없습니다.");
      return;
    }

    setIsLoading(true);
    setUploadStatus("업로드 중...");
    
    try {
      const success = await uploadToAPI(
        fileToUpload,
        name || fileToUpload.name,
        date,
        location,
        latitude,
        longitude
      );

      if (success) {
        setUploadStatus("업로드 완료!");
        setTimeout(() => {
          //alert(`파일 업로드 완료!\n이름: ${name || fileToUpload.name}\n촬영일시: ${date || "정보 없음"}\n위치: ${location || "정보 없음"}`);
          handleClose();
        }, 1000);
      } else {
        throw new Error("API 업로드에 실패했습니다.");
      }
    } catch (error: any) {
      console.error('업로드 실패:', error);
      setUploadStatus(`업로드 실패: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // API를 통해 이미지와 메타데이터 업로드하는 함수
  const uploadToAPI = async (file: File, imageName: string, dateTime: string, location: string, lat: string, lng: string) => {
    try {
      setUploadStatus("업로드 중...");
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', imageName || file.name);
      formData.append('date', dateTime || '');
      formData.append('location', location || '');
      formData.append('latitude', lat || '');
      formData.append('longitude', lng || '');
      
      const response = await fetch(`${API_URL}/api/upload`, {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('API 업로드 완료:', result);
      
      setUploadStatus("업로드 완료!");
      return true;
      
    } catch (error) {
      console.error('API 업로드 실패:', error);
      setUploadStatus("업로드 실패");
      return false;
    }
  };

  // Reset all input states
  const handleClose = (): void => {
    if (preview.startsWith('blob:')) {
      URL.revokeObjectURL(preview);
    }
    setFileToUpload(null);
    setPreview("/photo3.jpg");
    setName("");
    setDate("");
    setLocation("");
    setIsLoading(false);
    setLatitude("");
    setLongitude("");
    setMetadataStatus("");
    setUploadStatus("");
    onClose();
  };

  if (!open) return null;
  
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 20,
          background: "#fff",
          borderTopLeftRadius: 32,
          borderTopRightRadius: 32,
          minHeight: 520,
          boxShadow: "0 -2px 16px rgba(0,0,0,0.08)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "32px 24px 24px 24px",
        }}
      >
        <button
          onClick={handleClose}
          style={{
            position: "absolute",
            top: 20,
            right: 20,
            background: "none",
            border: "none",
            padding: 0,
            cursor: "pointer",
            zIndex: 2,
          }}
          aria-label="닫기"
        >
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="14" cy="14" r="14" fill="#F2F2F2"/>
            <path d="M9.5 9.5L18.5 18.5" stroke="#222" strokeWidth="2" strokeLinecap="round"/>
            <path d="M18.5 9.5L9.5 18.5" stroke="#222" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>
        <div
          style={{
            width: 64,
            height: 6,
            background: "#e0e0e0",
            borderRadius: 3,
            alignSelf: "center",
            marginBottom: 24,
            cursor: "pointer",
          }}
          onClick={handleClose}
        />
        <label htmlFor="file-upload" style={{ cursor: "pointer", position: "relative" }}>
          <div style={{
            width: 260,
            height: 260,
            borderRadius: 16,
            marginBottom: 16,
            border: "2px solid #eee",
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#f8f8f8"
          }}>
            <img
              src={preview}
              alt="업로드 미리보기"
              style={{ 
                width: "100%",
                height: "100%",
                objectFit: "cover",
                opacity: isLoading ? 0.7 : 1
              }}
              onError={(e) => {
                console.error('이미지 로드 실패:', {
                  src: preview,
                  srcLength: preview.length,
                  srcType: preview.startsWith('data:') ? preview.split(',')[0] : 'URL',
                  error: e
                });
                e.currentTarget.src = "/photo3.jpg";
              }}
              onLoad={() => {
                console.log('이미지 로드 성공:', preview.substring(0, 50) + '...');
              }}
            />
          </div>
          {isLoading && (
            <div style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              background: "rgba(0,0,0,0.7)",
              color: "white",
              padding: "8px 16px",
              borderRadius: 8,
              fontSize: 14,
              textAlign: "center",
              minWidth: "200px"
            }}>
              <div>메타데이터 읽는 중...</div>
            </div>
          )}
          <input
            id="file-upload"
            type="file"
            accept="image/*,.heic,.HEIC"
            style={{ display: "none" }}
            onChange={handleFileChange}
          />
        </label>
        <input
          type="text"
          placeholder="이미지 이름"
          value={name}
          onChange={e => setName(e.target.value)}
          style={{ width: "100%", fontSize: 16, padding: 8, border: "none", borderBottom: "2px solid #ccc", marginBottom: 24, outline: "none" }}
        />
        <div style={{ width: "100%", marginBottom: 16 }}>
          <div style={{ fontSize: 15, color: "#222", marginBottom: 2, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span>촬영일시</span>
            <button
              onClick={() => setShowMetadataInput(true)}
              style={{
                background: "none",
                border: "none",
                padding: 4,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="#666"/>
              </svg>
            </button>
          </div>
          <div style={{ color: "#8d9440", fontSize: 15, marginBottom: 12 }}>{date || "-"}</div>
          <div style={{ fontSize: 15, color: "#222", marginBottom: 2 }}>위치정보</div>
          <div style={{ color: "#8d9440", fontSize: 15 }}>{location || "-"}</div>
          
          {/* 메타데이터 상태 표시 */}
          {metadataStatus && (
            <div style={{ 
              fontSize: 12, 
              color: "#666", 
              fontStyle: "italic",
              marginTop: 4
            }}>
              {metadataStatus}
            </div>
          )}
          
          {/* 업로드 상태 표시 */}
          {uploadStatus && (
            <div style={{ 
              fontSize: 12, 
              color: uploadStatus.includes("완료") ? "#4caf50" : uploadStatus.includes("실패") ? "#f44336" : "#1976d2",
              fontStyle: "italic",
              marginTop: 4,
              textAlign: "center"
            }}>
              {uploadStatus}
            </div>
          )}
        </div>
        <button
          style={{
            width: "100%",
            background: "#1976d2",
            color: "#fff",
            borderRadius: 12,
            padding: "16px 0",
            fontWeight: 600,
            fontSize: 18,
            border: "none",
            marginTop: 16,
            cursor: "pointer",
            opacity: fileToUpload ? 1 : 0.5,
          }}
          disabled={!fileToUpload || isLoading}
          onClick={handleUpload}
        >
          {isLoading ? "처리 중..." : uploadStatus === "업로드 중..." ? "업로드 중..." : "업로드"}
        </button>
      </div>
      {showMetadataInput && (
        <MetadataInput
          onSave={(data) => {
            setDate(data.date);
            setLocation(data.location);
            setLatitude(data.latitude);
            setLongitude(data.longitude);
            setShowMetadataInput(false);
            setMetadataStatus("메타데이터 수정 완료");
          }}
          onCancel={() => setShowMetadataInput(false)}
          initialDate={date}
        />
      )}
    </>
  );
} 
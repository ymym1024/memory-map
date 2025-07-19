import { useState, useEffect } from "react";
import MapArea from "./components/MapArea";
import BottomSheet from "./components/BottomSheet";
import UploadDrawer from "./components/UploadDrawer";
import type { ImageInfo } from "./model/imageInfo";

export default function App() {
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [images, setImages] = useState<ImageInfo[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [mapZoom, setMapZoom] = useState(12);

  // 이미지 목록 불러오기
  const fetchImages = async () => {
    try {
      const response = await fetch('/api/images');
      if (!response.ok) {
        throw new Error('이미지 목록 불러오기 실패');
      }
      const data = await response.json();
      // API 응답 구조 확인 및 처리
      const imageList = Array.isArray(data) ? data : data.images || [];
      console.log('Fetched images:', imageList); // 데이터 구조 확인용 로그
      setImages(imageList);
    } catch (error) {
      console.error('이미지 목록 불러오기 오류:', error);
      setImages([]); // 오류 시 빈 배열로 초기화
    }
  };

  // 초기 로딩 시 이미지 목록 불러오기
  useEffect(() => {
    fetchImages();
  }, []);

  // 이미지 클릭 시 지도 위치 이동
  const handleImageClick = (latitude: number, longitude: number) => {
    setSelectedLocation({ lat: latitude, lng: longitude });
    setMapZoom(15);
  };

  // 업로드 드로어 닫을 때 이미지 목록 새로고침
  const handleUploadClose = () => {
    setIsUploadOpen(false);
  };

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative" }}>
      <MapArea
        images={images}
        center={selectedLocation || { lat: 37.5665, lng: 126.9780 }}
        zoom={mapZoom}
      />
      <button
        onClick={() => setIsUploadOpen(true)}
        style={{
          position: "fixed",
          top: 20,
          right: 20,
          width: 48,
          height: 48,
          borderRadius: "50%",
          backgroundColor: "#fff",
          border: "none",
          boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 10,
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 15.2C13.7673 15.2 15.2 13.7673 15.2 12C15.2 10.2327 13.7673 8.8 12 8.8C10.2327 8.8 8.8 10.2327 8.8 12C8.8 13.7673 10.2327 15.2 12 15.2Z" fill="#FF69B4"/>
          <path d="M9 3L7.17 5H4C3.45 5 3 5.45 3 6V18C3 18.55 3.45 19 4 19H20C20.55 19 21 18.55 21 18V6C21 5.45 20.55 5 20 5H16.83L15 3H9ZM12 17C9.24 17 7 14.76 7 12C7 9.24 9.24 7 12 7C14.76 7 17 9.24 17 12C17 14.76 14.76 17 12 17Z" fill="#FF69B4"/>
        </svg>
      </button>
      <BottomSheet images={images} onImageClick={handleImageClick} />
      <UploadDrawer open={isUploadOpen} onClose={handleUploadClose} />
    </div>
  );
}

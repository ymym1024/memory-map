import { useState, useRef, useEffect } from "react";
import type { ImageInfo } from "../model/imageInfo";

interface BottomSheetProps {
  images: ImageInfo[];
  onImageClick: (latitude: number, longitude: number) => void;
}

export default function BottomSheet({ images, onImageClick }: BottomSheetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const dragStartY = useRef<number | null>(null);
  const dragOffsetRef = useRef(0);
  const [lastDragDirection, setLastDragDirection] = useState<'up' | 'down' | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [minHeight, setMinHeight] = useState(240);
  const maxHeight = window.innerHeight * 0.8;

  useEffect(() => {
    function updateMinHeight() {
      setMinHeight(window.innerHeight * 0.3); // 최소 높이는 화면의 30%
    }
    updateMinHeight();
    window.addEventListener('resize', updateMinHeight);
    return () => window.removeEventListener('resize', updateMinHeight);
  }, []);

  const handleDragStart = (e: React.TouchEvent | React.MouseEvent) => {
    if ('touches' in e) {
      dragStartY.current = e.touches[0].clientY;
    } else {
      dragStartY.current = e.clientY;
      const onMove = (ev: MouseEvent) => {
        if (dragStartY.current === null) return;
        const offset = ev.clientY - dragStartY.current;
        dragOffsetRef.current = offset;
        setDragOffset(offset);
        if (offset < 0) setLastDragDirection('up');
        if (offset > 0) setLastDragDirection('down');
      };
      const onUp = () => {
        if (dragOffsetRef.current < -50) {
          setIsOpen(true);
        } else if (dragOffsetRef.current > 50) {
          setIsOpen(false);
        }
        dragStartY.current = null;
        dragOffsetRef.current = 0;
        setDragOffset(0);
        setLastDragDirection(null);
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    }
  };

  const handleDragMove = (e: React.TouchEvent) => {
    if (dragStartY.current === null) return;
    const clientY = e.touches[0].clientY;
    const offset = clientY - dragStartY.current;
    dragOffsetRef.current = offset;
    setDragOffset(offset);
    if (offset < 0) setLastDragDirection('up');
    if (offset > 0) setLastDragDirection('down');
  };

  const handleDragEnd = () => {
    if (dragOffsetRef.current < -50) {
      setIsOpen(true);
    } else if (dragOffsetRef.current > 50) {
      setIsOpen(false);
    }
    dragStartY.current = null;
    dragOffsetRef.current = 0;
    setDragOffset(0);
    setLastDragDirection(null);
  };

  const sheetHeight = isOpen
    ? Math.max(minHeight, maxHeight - (lastDragDirection === 'down' ? dragOffset : 0))
    : Math.max(minHeight, minHeight - dragOffset);

  return (
    <div
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        background: "#fff",
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        height: sheetHeight,
        boxShadow: "0 -2px 16px rgba(0,0,0,0.08)",
        zIndex: 10,
        display: "flex",
        flexDirection: "column",
        transition: dragStartY.current ? undefined : "height 0.3s ease",
        touchAction: "none",
        userSelect: "none",
      }}
      onTouchStart={handleDragStart}
      onTouchMove={handleDragMove}
      onTouchEnd={handleDragEnd}
      onMouseDown={handleDragStart}
    >
      <div
        style={{
          width: 64,
          height: 6,
          background: "#e0e0e0",
          borderRadius: 3,
          alignSelf: "center",
          margin: "12px 0",
          cursor: "pointer",
        }}
      />
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "0 24px",
        }}
      >
        {images.map((image) => {
          if (!image.latitude || !image.longitude) return null;
          
          const lat = parseFloat(image.latitude);
          const lng = parseFloat(image.longitude);
          
          if (isNaN(lat) || isNaN(lng)) return null;
          
          const imageId = String(image.id);
          const isHovered = hoveredId === imageId;
          
          return (
            <div
              key={imageId}
              onClick={() => onImageClick(lat, lng)}
              onMouseEnter={() => setHoveredId(imageId)}
              onMouseLeave={() => setHoveredId(null)}
              style={{ 
                display: "flex",
                alignItems: "center",
                gap: 16,
                marginBottom: 24,
                cursor: "pointer",
                transition: "background-color 0.2s",
                padding: "8px 12px",
                borderRadius: 16,
                backgroundColor: isHovered ? "#f5f5f5" : "transparent",
              }}
            >
              <img
                src={image.image_url}
                alt={image.image_name}
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 16,
                  objectFit: "cover",
                  flexShrink: 0,
                }}
              />
              <div style={{
                flex: 1,
                minWidth: 0,
              }}>
                <div style={{ 
                  fontSize: 18,
                  fontWeight: 700,
                  color: "#222",
                  marginBottom: 4,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}>
                  {image.image_name}
                </div>
                <div style={{ 
                  fontSize: 16,
                  color: "#8d9440",
                  fontWeight: 500,
                  marginBottom: 2,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}>
                  {image.location || "위치 정보 없음"}
                </div>
                <div style={{ 
                  fontSize: 14,
                  color: "#888",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}>
                  {image.date_time || "날짜 정보 없음"}
                </div>
              </div>
            </div>
          );
        })}
        {images.length === 0 && (
          <div style={{
            textAlign: "center",
            color: "#888",
            fontSize: 16,
            padding: "32px 0",
          }}>
            이미지가 없습니다.
          </div>
        )}
      </div>
    </div>
  );
} 
"use client";
import { useEffect, useRef, useState } from "react";
import { GoogleMap, useJsApiLoader } from "@react-google-maps/api";
import { MarkerClusterer } from "@googlemaps/markerclusterer";
import type { ImageInfo } from "../model/imageInfo";

interface MapAreaProps {
  images: ImageInfo[];
  center: { lat: number; lng: number };
  zoom: number;
}

export default function MapArea({ images, center, zoom }: MapAreaProps) {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string
  });


  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const clustererRef = useRef<MarkerClusterer | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);

  // 마커 생성 및 클러스터링 설정
  useEffect(() => {
    if (!map) return;

    // 기존 마커와 클러스터러 제거
    if (clustererRef.current) {
      clustererRef.current.clearMarkers();
    }
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    // 위치별로 이미지 그룹화
    const locationGroups = images.reduce((groups, image) => {
      if (!image.latitude || !image.longitude) return groups;
      
      const lat = parseFloat(image.latitude);
      const lng = parseFloat(image.longitude);
      
      if (isNaN(lat) || isNaN(lng)) return groups;
      
      const key = `${lat},${lng}`;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(image);
      return groups;
    }, {} as Record<string, ImageInfo[]>);

    // 각 위치에 대한 마커 생성
    const markers = Object.entries(locationGroups).map(([key, locationImages]) => {
      const [lat, lng] = key.split(',').map(Number);
      const firstImage = locationImages[0];

      const marker = new google.maps.Marker({
        position: { lat, lng },
        title: firstImage.image_name,
        icon: {
          url: firstImage.image_url,
          scaledSize: new google.maps.Size(40, 40),
        },
      });

      // 마커 클릭 시 인포윈도우 표시
      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div style="width: 260px; padding: 16px;">
            <div style="width: 100%; position: relative; overflow: hidden;">
              <div id="imageSlider" style="display: flex; transition: transform 0.3s ease;">
                ${locationImages.map((img) => `
                  <div style="flex: 0 0 100%; min-width: 100%;">
                    <img 
                      src="${img.image_url}" 
                      alt="${img.image_name}"
                      style="
                        width: 100%;
                        max-height: 300px;
                        object-fit: contain;
                        border-radius: 8px;
                        margin-bottom: 12px;
                        background-color: #f5f5f5;
                      "
                      onload="
                        if(this.naturalHeight > 300) {
                          this.style.height = '300px';
                        } else {
                          this.style.height = 'auto';
                        }
                      "
                    >
                  </div>
                `).join('')}
              </div>
              ${locationImages.length > 1 ? `
                <div style="
                  position: absolute;
                  bottom: 20px;
                  left: 50%;
                  transform: translateX(-50%);
                  display: flex;
                  gap: 8px;
                ">
                  ${locationImages.map((_, index) => `
                    <button
                      onclick="document.getElementById('imageSlider').style.transform = 'translateX(-${index * 100}%)'; this.parentElement.querySelectorAll('button').forEach(btn => btn.style.backgroundColor = '#ffffff80'); this.style.backgroundColor = '#fff';"
                      style="
                        width: 8px;
                        height: 8px;
                        border-radius: 50%;
                        border: none;
                        background-color: ${index === 0 ? '#fff' : '#ffffff80'};
                        cursor: pointer;
                        padding: 0;
                      "
                    ></button>
                  `).join('')}
                </div>
              ` : ''}
            </div>
            <div style="
              font-weight: 600;
              font-size: 16px;
              margin-bottom: 8px;
              word-break: break-word;
            ">${firstImage.image_name}</div>
            <div style="
              font-size: 14px;
              color: #666;
              margin-bottom: 4px;
              word-break: break-word;
            ">${firstImage.location || '위치 정보 없음'}</div>
            <div style="
              font-size: 13px;
              color: #999;
              word-break: break-word;
            ">${firstImage.date_time || '날짜 정보 없음'}</div>
          </div>
        `,
        pixelOffset: new google.maps.Size(0, -20)
      });

      marker.addListener('click', () => {
        // 다른 인포윈도우 닫기
        markersRef.current.forEach(m => {
          const info = (m as any).infoWindow;
          if (info) info.close();
        });
        infoWindow.open(map, marker);
      });

      // 인포윈도우 참조 저장
      (marker as any).infoWindow = infoWindow;

      return marker;
    });

    markersRef.current = markers;

    // 클러스터러 생성
    if (markers.length > 0) {
      clustererRef.current = new MarkerClusterer({
        map,
        markers,
        renderer: {
          render: ({ count, position }) => {
            return new google.maps.Marker({
              position,
              icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 20,
                fillColor: "#FF69B4",
                fillOpacity: 0.9,
                strokeWeight: 2,
                strokeColor: "#fff",
              },
              label: {
                text: String(count),
                color: "#fff",
                fontSize: "13px",
                fontWeight: "bold",
              },
              zIndex: Number(google.maps.Marker.MAX_ZINDEX) + count,
            });
          },
        },
      });
    }
  }, [map, images]);

  const onLoad = (map: google.maps.Map) => {
    mapRef.current = map;
    setMap(map);
  };

  const onUnmount = () => {
    mapRef.current = null;
    setMap(null);
  };

  if (!isLoaded) return null;

  return (
    <GoogleMap
      mapContainerStyle={{
        width: '100%',
        height: '100%'
      }}
      center={center}
      zoom={zoom}
      onLoad={onLoad}
      onUnmount={onUnmount}
      options={{
        mapTypeControl: false,
        zoomControl: true,
        streetViewControl: false,
        fullscreenControl: false,
        styles: [
          {
            featureType: "poi",
            elementType: "labels",
            stylers: [{ visibility: "off" }],
          },
        ],
      }}
    />
  );
} 
import { useState } from 'react';
import type { KeyboardEvent } from 'react';

interface MetadataInputProps {
  onSave: (data: { date: string; location: string; latitude: string; longitude: string }) => void;
  onCancel: () => void;
  initialDate?: string;
}

export default function MetadataInput({ onSave, onCancel, initialDate }: MetadataInputProps) {
  const [date, setDate] = useState(initialDate || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{
    display_name: string;
    lat: string;
    lon: string;
  }>>([]);
  const [selectedLocation, setSelectedLocation] = useState<{
    name: string;
    lat: string;
    lon: string;
  } | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // 장소 검색 함수
  const searchLocation = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
        }
    // Vite에서는 import.meta.env.VITE_ 접두사로 접근해야 함
    const BASE_URL = import.meta.env.VITE_LOCATION_SITE;

    // 메인 코드
    const url = `${BASE_URL}&q=${encodeURIComponent(query)}&limit=5`;
    try {
      const response = await fetch(
        url,
        {
          headers: {
            'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
            'User-Agent': 'MemoryMap/1.0'
          }
        }
      );
      
      if (!response.ok) throw new Error('검색 실패');
      
      const data = await response.json();
      setSearchResults(data);
    } catch (error) {
      console.error('장소 검색 오류:', error);
    }
  };

  // 검색어 입력 핸들러
  const handleSearchInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    setSelectedLocation(null);
  };

  // 키 입력 핸들러
  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      searchLocation(searchQuery);
    }
  };

  // 장소 선택 핸들러
  const handleLocationSelect = (result: typeof searchResults[0]) => {
    setSelectedLocation({
      name: result.display_name,
      lat: result.lat,
      lon: result.lon
    });
    setSearchQuery(result.display_name);
    setSearchResults([]);
  };

  // 저장 핸들러
  const handleSave = () => {
    if (!date || !selectedLocation) {
      alert('날짜와 위치를 모두 입력해주세요.');
      return;
    }

    onSave({
      date,
      location: selectedLocation.name,
      latitude: selectedLocation.lat,
      longitude: selectedLocation.lon
    });
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: 24,
        padding: 24,
        width: '90%',
        maxWidth: 400,
        maxHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
      }}>
        <h2 style={{
          margin: 0,
          fontSize: 20,
          fontWeight: 600,
          color: '#222',
        }}>
          메타데이터 입력
        </h2>

        <div>
          <label style={{
            display: 'block',
            marginBottom: 8,
            fontSize: 14,
            color: '#666',
          }}>
            촬영일시
          </label>
          <input
            type="datetime-local"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: 8,
              border: '1px solid #ddd',
              fontSize: 16,
            }}
          />
        </div>

        <div style={{ position: 'relative' }}>
          <label style={{
            display: 'block',
            marginBottom: 8,
            fontSize: 14,
            color: '#666',
          }}>
            위치 검색
          </label>
          <div style={{ 
            display: 'flex',
            gap: 8,
          }}>
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchInput}
              onKeyPress={handleKeyPress}
              placeholder="위치를 검색하고 Enter를 누르세요"
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: 8,
                border: '1px solid #ddd',
                fontSize: 16,
              }}
            />
            <button
              onClick={() => searchLocation(searchQuery)}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                border: 'none',
                backgroundColor: '#1976d2',
                color: 'white',
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              검색
            </button>
          </div>
          
          {searchResults.length > 0 && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              backgroundColor: 'white',
              borderRadius: 8,
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              marginTop: 4,
              maxHeight: 200,
              overflowY: 'auto',
              zIndex: 1,
            }}>
              {searchResults.map((result, index) => (
                <div
                  key={index}
                  onClick={() => handleLocationSelect(result)}
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  style={{
                    padding: '8px 12px',
                    cursor: 'pointer',
                    borderBottom: index < searchResults.length - 1 ? '1px solid #eee' : 'none',
                    backgroundColor: hoveredIndex === index ? '#f5f5f5' : 'transparent',
                    transition: 'background-color 0.2s',
                  }}
                >
                  {result.display_name}
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{
          display: 'flex',
          gap: 12,
          marginTop: 12,
        }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: 8,
              border: '1px solid #ddd',
              backgroundColor: 'white',
              color: '#666',
              fontSize: 16,
              cursor: 'pointer',
            }}
          >
            취소
          </button>
          <button
            onClick={handleSave}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: 8,
              border: 'none',
              backgroundColor: '#1976d2',
              color: 'white',
              fontSize: 16,
              cursor: 'pointer',
              opacity: (!date || !selectedLocation) ? 0.5 : 1,
            }}
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
} 
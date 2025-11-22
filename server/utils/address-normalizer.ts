// 주소 정규화 유틸리티
export function normalizeAddress(address: string): string {
  if (!address) return '';
  
  // 연속된 공백을 하나로 통일하고 앞뒤 공백 제거
  let normalized = address.trim().replace(/\s+/g, ' ');
  
  // 시/도 표기 통일 (저장된 데이터가 일관성이 없어서 통일 필요)
  normalized = normalized
    .replace(/경기도/g, '경기')
    .replace(/서울특별시/g, '서울')
    .replace(/부산광역시/g, '부산')
    .replace(/대구광역시/g, '대구')
    .replace(/인천광역시/g, '인천')
    .replace(/광주광역시/g, '광주')
    .replace(/대전광역시/g, '대전')
    .replace(/울산광역시/g, '울산')
    .replace(/세종특별자치시/g, '세종')
    .replace(/제주특별자치도/g, '제주')
    .replace(/제주도/g, '제주')
    .replace(/전라북도/g, '전북')
    .replace(/전라남도/g, '전남')
    .replace(/경상북도/g, '경북')
    .replace(/경상남도/g, '경남')
    .replace(/충청북도/g, '충북')
    .replace(/충청남도/g, '충남')
    .replace(/강원특별자치도/g, '강원')
    .replace(/강원도/g, '강원');
  
  return normalized;
}


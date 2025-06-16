# Tsubaki Chain 완전 제품 데이터베이스

## 📊 데이터베이스 개요

이 데이터베이스는 Tsubakimoto Chain Co.의 공식 카탈로그를 기반으로 구축된 **12,140개 제품**을 포함하는 종합적인 제품 정보 시스템입니다.

### 🏗️ 데이터베이스 구조

| 카테고리 | 제품 수 | 설명 |
|----------|---------|------|
| **드라이브 체인** | 98개 | RS, LAMBDA, NEPTUNE, Super, Stainless 시리즈 |
| **스프라켓** | 11,953개 | 모든 체인 크기별 호환 스프라켓 |
| **컨베이어 체인** | 20개 | DT, AT, DTA, ATA 시리즈 |
| **타이밍 벨트** | 40개 | PX, Ultra PX 시리즈 |
| **감속기** | 7개 | TERVO 서보용 감속기 |
| **커플링** | 9개 | 체인/디스크 커플링 |
| **리니어 액추에이터** | 8개 | ZCA, T 시리즈 |
| **케이블 캐리어** | 5개 | TKP 시리즈 |

## 📁 파일 구성
애플리케이션은 `to_oracle` 폴더의 JSON 파일을 Oracle DB에 적재하여 사용합니다.
루트에 있는 `tsubaki_complete_database.json`과 `.csv` 파일은 참고용 데이터이며, 실행에는 필요하지 않습니다.

## 🔑 로그인 및 회원가입
서버는 `/api/login`과 `/api/register` 엔드포인트를 제공하여 사용자 인증을 처리합니다.
Oracle DB의 `USERS` 테이블에 아이디와 암호 해시가 저장되며,
프론트엔드의 **회원가입** 버튼으로 새 계정을 만들 수 있습니다.

### to_oracle 폴더
- 각 카테고리별 JSON 파일과 Java 로더 스크립트 포함
- `CsvToOracleLoader.java` 실행 후 Oracle DB에 데이터가 저장됩니다.

## 🔍 주요 데이터 필드

### 공통 필드
- `ID`: 고유 식별자 (TSK_XXXX)
- `Category`: 제품 카테고리
- `Series`: 제품 시리즈
- `Model`: 모델명
- `Name`: 제품 전체명
- `Tsubaki_Code`: Tsubaki 내부 코드

### 체인 전용 필드
- `Spec_pitch_mm`: 피치 (mm)
- `Spec_tensile_strength_kn`: 인장강도 (kN)
- `Spec_allowable_load_kn`: 허용하중 (kN)
- `Spec_strands`: 가닥 수 (1=단열, 2=복열)
- `Spec_material`: 재질
- `Spec_temperature_range`: 사용온도범위

### 스프라켓 전용 필드
- `Spec_compatible_chain`: 호환 체인
- `Spec_tooth_count`: 이빨 수
- `Spec_pitch_diameter_mm`: 피치 지름 (mm)
- `Spec_outside_diameter_mm`: 외경 (mm)
- `Spec_hub_type`: 허브 타입 (A/B/C)

## 🎯 실제 카탈로그 기반 데이터

모든 제품 데이터는 Tsubaki의 공식 카탈로그에서 추출한 실제 사양입니다:

### RS G8 시리즈 (예시)
```json
{
  "model": "RS80-1",
  "specifications": {
    "pitch_mm": 25.4,
    "tensile_strength_kn": 125.0,
    "allowable_load_kn": 33.0,
    "features": ["G8 Technology", "33% Higher HP Rating"]
  }
}
```

### LAMBDA 시리즈 (예시)
```json
{
  "model": "LM80-1",
  "specifications": {
    "pitch_mm": 25.4,
    "lubrication": "NSF H1 Food Grade",
    "features": ["Self-Lubricating", "30% Longer Life"]
  }
}
```

## 🚀 활용 방법

### 웹앱 개발
```javascript
// JSON 데이터 로드
fetch('tsubaki_complete_database.json')
  .then(response => response.json())
  .then(data => {
    const products = data.products;
    // 제품 검색 로직 구현
  });
```

### 데이터 분석
```python
import pandas as pd

# CSV 파일 로드
df = pd.read_csv('tsubaki_complete_database.csv')

# 체인별 인장강도 분석
chains = df[df['Category'] == 'Drive Chain']
print(chains['Spec_tensile_strength_kn'].describe())
```

### Excel에서 사용
1. CSV 파일을 Excel로 열기
2. 데이터 → 텍스트를 열로 나누기
3. UTF-8 인코딩 선택
4. 피벗 테이블로 분석

## 📋 제품번호 체계

### 드라이브 체인
```
RS80-1-G8
│  │ │ │
│  │ │ └─ 버전 (G8 = 8세대)
│  │ └─── 가닥 수 (1=단열, 2=복열)
│  └───── 크기 (80 = #80 = 1인치 피치)
└─────── 시리즈 (RS = Roller Standard)
```

### 스프라켓
```
SP80-15T-B-S45C
│  │  │  │ │
│  │  │  │ └─── 재질 (S45C = 탄소강)
│  │  │  └───── 허브타입 (B = 완성보어)
│  │  └──────── 이빨수 (15개)
│  └─────────── 체인크기 (#80)
└──────────────┴ 스프라켓 (SP)
```

## ⚡ 성능 최적화

### 웹앱용 경량화
대용량 데이터 처리를 위한 권장사항:
- 가상 스크롤링 사용
- 페이지네이션 적용
- 인덱싱 구현
- 클라이언트 캐싱

### 검색 최적화
```javascript
// 효율적인 제품 검색
function searchProducts(category, series, specs) {
  return products.filter(product => {
    return product.category === category &&
           product.series.includes(series) &&
           matchesSpecs(product.specifications, specs);
  });
}
```

## 📞 지원 및 문의

이 데이터베이스는 실제 산업 현장에서 즉시 활용할 수 있도록 설계되었습니다. 
Tsubaki의 "Innovation in Motion" 정신을 구현한 종합적인 엔지니어링 도구입니다.

### 업데이트 정보
- **버전**: 2.0
- **최종 업데이트**: 2024-12-08
- **다음 업데이트**: 신제품 출시 시

---

**© 2024 Tsubakimoto Chain Co. 데이터베이스 프로젝트**

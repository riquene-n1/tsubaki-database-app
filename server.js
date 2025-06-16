// server.js

const express = require('express');
const oracledb = require('oracledb');
const cors = require('cors'); // CORS 미들웨어
const bcrypt = require('bcryptjs');

// Node.js 애플리케이션 포트 설정
const PORT = process.env.PORT || 3000;

// Oracle DB 연결 설정
// 보안을 위해 실제 운영 환경에서는 비밀번호를 환경 변수, Vault 서비스 등을 통해 관리해야 합니다.
const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    connectString: process.env.DB_CONNECT_STRING
};
const app = express();
app.use(express.json());

// CORS 설정: 모든 출처에서의 요청을 허용합니다. (개발 환경용)
// 실제 운영 환경에서는 보안을 위해 특정 도메인만 허용하도록 변경해야 합니다.
// 예: app.use(cors({ origin: 'http://localhost:5500' }));
app.use(cors());

// Oracle Client 라이브러리 경로 초기화
// *** 중요: 이곳을 자신의 Oracle Instant Client가 설치된 경로로 정확히 수정해주세요. ***
// 예시:
// Windows: 'C:\instantclient-basic-windows.x64-23.8.0.25.04\instantclient_23_8'
// macOS: '/Users/yourusername/Downloads/instantclient_21_9'
// Linux: '/opt/oracle/instantclient_21_9'

const clientLibDir = process.env.ORACLE_CLIENT_LIBDIR;
if (clientLibDir) {
    try {
        oracledb.initOracleClient({ libDir: clientLibDir });
        console.log('Oracle Client initialized successfully.');
    } catch (err) {
        console.error('Error initializing Oracle Client:', err);
        console.error('Please ensure Oracle Instant Client is installed and libDir path is correct.');
        process.exit(1);
    }
} else {
    console.warn('ORACLE_CLIENT_LIBDIR 환경 변수가 설정되지 않았습니다. 기본 경로를 사용합니다.');
}
// 각 테이블에 대한 API 엔드포인트 정의
// 이 배열의 각 문자열은 Oracle DB의 실제 테이블 이름과 일치해야 합니다.
const tables = [
    "CABLE_CARRIER_JSON",
    "CONVEYOR_CHAIN_JSON",
    "COUPLING_JSON",
    "DRIVE_CHAIN_JSON",
    "LINEAR_ACTUATOR_JSON",
    "METADATA_JSON", // METADATA_JSON 테이블도 있다면 포함
    "REDUCER_JSON",
    "SPROCKET_JSON",
    "TIMING_BELT_JSON"
];

// 각 테이블에 대한 GET API 엔드포인트 생성
tables.forEach(tableName => {
    // API 엔드포인트는 소문자로, "_JSON" 접미사를 제거하여 프론트엔드와 일관되게 만듭니다.
    // 예: CABLE_CARRIER_JSON -> /api/cable_carrier
    const endpoint = `/api/${tableName.toLowerCase().replace(/_json$/, '')}`;
    console.log(`Setting up API endpoint: GET ${endpoint}`);

    app.get(endpoint, async (req, res) => {
        let connection; // Oracle DB 연결 객체
        try {
            connection = await oracledb.getConnection(dbConfig);
            console.log(`Connected to Oracle DB for ${tableName}.`);

            // *** 중요: 이곳의 SQL 쿼리를 자신의 Oracle DB 스키마에 맞게 수정하세요. ***
            // JSON 데이터가 'DATA_COLUMN'이라는 CLOB 또는 VARCHAR2 컬럼에 통째로 JSON 문자열로 저장되어 있다고 가정합니다.
            // 만약 컬럼명이 다르다면 'DATA_COLUMN'을 실제 컬럼명으로 변경하세요.
            // 예시: SELECT JSON_DATA_BLOB_COLUMN FROM YOUR_TABLE
            const result = await connection.execute(`SELECT DATA_COLUMN FROM ${tableName}`);
            
            // 쿼리 결과 파싱: oracledb는 기본적으로 fetchAsBuffer/fetchAsString으로 CLOB/BLOB을 가져오므로
            // JSON 문자열이 행의 첫 번째 요소로 (대부분 인덱스 0) 들어올 것입니다.
            const data = result.rows.map(row => {
                try {
                    // row[0]은 해당 행의 첫 번째 컬럼 값 (JSON 문자열)을 의미합니다.
                    return JSON.parse(row[0]);
                } catch (parseError) {
                    console.error(`Error parsing JSON from row for table ${tableName}:`, parseError);
                    console.error('Problematic row data:', row[0]);
                    return null; // 파싱 실패 시 null 반환 (클라이언트에서 필터링 가능)
                }
            }).filter(item => item !== null); // null 항목 제거 (파싱 실패한 데이터는 전송하지 않음)

            // 만약 Oracle 12cR2 이상의 JSON 데이터 타입 컬럼을 사용한다면 쿼리가 달라집니다:
            // const result = await connection.execute(`SELECT JSON_COLUMN_NAME FROM ${tableName}`);
            // const data = result.rows.map(row => row.JSON_COLUMN_NAME); // oracledb가 JSON 타입 컬럼을 자동으로 JS 객체로 변환해 줄 수 있음

            res.json(data); // 파싱된 JSON 데이터를 클라이언트에 전송
        } catch (err) {
            console.error(`Error fetching data from ${tableName}:`, err);
            // 클라이언트에게 500 Internal Server Error 응답
            res.status(500).send(`Error fetching data from ${tableName}: ${err.message}`);
        } finally {
            // DB 연결은 항상 닫아주어야 합니다.
            if (connection) {
                try {
                    await connection.close();
                    console.log(`Connection to Oracle DB for ${tableName} closed.`);
                } catch (err) {
                    console.error('Error closing Oracle connection:', err);
                }
            }
        }
    });
});

// 회원가입
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).send('Missing username or password');
    }
    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);
        const hashed = await bcrypt.hash(password, 10);
        await connection.execute(
            `INSERT INTO USERS (USERNAME, PASSWORD_HASH) VALUES (:u, :p)`,
            { u: username, p: hashed },
            { autoCommit: true }
        );
        res.status(201).send('User registered');
    } catch (err) {
        console.error('Error registering user:', err);
        res.status(500).send('Registration failed');
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error('Error closing Oracle connection:', err);
            }
        }
    }
});

// 로그인
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).send('Missing username or password');
    }
    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);
        const result = await connection.execute(
            `SELECT PASSWORD_HASH FROM USERS WHERE USERNAME = :u`,
            { u: username },
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        if (result.rows.length === 0) {
            return res.status(401).send('Invalid credentials');
        }
        const hashed = result.rows[0].PASSWORD_HASH;
        const match = await bcrypt.compare(password, hashed);
        if (!match) {
            return res.status(401).send('Invalid credentials');
        }
        res.json({ success: true });
    } catch (err) {
        console.error('Error logging in:', err);
        res.status(500).send('Login failed');
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error('Error closing Oracle connection:', err);
            }
        }
    }
});

// 서버 시작
app.listen(PORT, () => {
    console.log(`Node.js Backend Server running on http://localhost:${PORT}`);
    console.log(`Access API endpoints, e.g., http://localhost:${PORT}/api/drive_chain`);
});
package to_oracle;

import java.io.BufferedReader;
import java.io.FileReader;
import java.sql.*;

public class CsvToOracleLoader {
    public static void main(String[] args) {
        // 1. CSV 파일 이름 (현재 VSCode 프로젝트 폴더에 있어야 함)
        String fileName = "Sprocket.csv";

        // 2. Oracle 테이블명
        String tableName = "SPROCKET";

        // 3. 데이터베이스 접속 정보
        String dbUrl = "jdbc:oracle:thin:@localhost:1521/XEPDB1";
        String dbUser = "TSUBAKIAPP";
        String dbPassword = "tsubaki1234";

        // 4. INSERT 쿼리 (컬럼 수와 순서 반드시 테이블과 맞춰야 함)
        String insertSQL = "INSERT INTO " + tableName + " VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

        int batchSize = 500;
        int count = 0;

        try (
            // 5. Oracle DB 연결
            Connection conn = DriverManager.getConnection(dbUrl, dbUser, dbPassword);
            // 6. CSV 파일 읽기
            BufferedReader br = new BufferedReader(new FileReader(fileName));
            // 7. 미리 SQL 준비
            PreparedStatement pstmt = conn.prepareStatement(insertSQL)
        ) {
            // 8. JDBC 드라이버 등록
            Class.forName("oracle.jdbc.driver.OracleDriver");

            conn.setAutoCommit(false);  // 수동 커밋 모드

            String line;
            br.readLine();  // 첫 줄은 헤더이므로 건너뜀

            while ((line = br.readLine()) != null) {
                String[] values = line.split(",", -1);  // 빈 값도 포함

                for (int i = 0; i < values.length; i++) {
                    pstmt.setString(i + 1, values[i].trim());
                }

                pstmt.addBatch();

                if (++count % batchSize == 0) {
                    pstmt.executeBatch();
                    conn.commit();
                }
            }

            // 마지막 잔여 데이터 처리
            pstmt.executeBatch();
            conn.commit();

            System.out.println("✅ " + count + "건의 데이터 삽입 완료!");

        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}

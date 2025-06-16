package to_oracle;

import java.io.FileReader;
import java.sql.*;
import java.util.*;
import com.google.gson.*;

public class SprocketJsonToOracle {
    public static void main(String[] args) {
        String jsonFile = "data/Sprocket.json";
        String dbUrl = "jdbc:oracle:thin:@localhost:1521/XEPDB1";
        String dbUser = "TSUBAKIAPP";
        String dbPassword = "tsubaki1234";

        String insertSQL = "INSERT INTO SPROCKET_JSON VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

        try {
            // 드라이버 로드
            Class.forName("oracle.jdbc.driver.OracleDriver");

            // DB 연결
            Connection conn = DriverManager.getConnection(dbUrl, dbUser, dbPassword);
            PreparedStatement pstmt = conn.prepareStatement(insertSQL);
            conn.setAutoCommit(false);

            // JSON 파싱
            FileReader reader = new FileReader(jsonFile);
            JsonObject root = JsonParser.parseReader(reader).getAsJsonObject();

            JsonElement productsElement = root.get("products");
            if (!productsElement.isJsonArray()) {
                System.err.println("❌ 'products' 키는 JsonArray가 아닙니다.");
                return;
            }

            JsonArray products = productsElement.getAsJsonArray();
            int count = 0;

            for (JsonElement element : products) {
                if (!element.isJsonObject()) continue;
                JsonObject item = element.getAsJsonObject();

                JsonObject spec = item.getAsJsonObject("specifications");

                pstmt.setString(1, getSafeString(item, "id"));
                pstmt.setString(2, getSafeString(item, "category"));
                pstmt.setString(3, getSafeString(item, "series"));
                pstmt.setString(4, getSafeString(item, "model"));
                pstmt.setString(5, getSafeString(item, "name"));
                pstmt.setString(6, getSafeString(item, "tsubaki_code"));

                pstmt.setString(7, getSafeString(spec, "compatible_chain"));
                pstmt.setInt(8, getSafeInt(spec, "tooth_count"));
                pstmt.setDouble(9, getSafeDouble(spec, "pitch_mm"));
                pstmt.setDouble(10, getSafeDouble(spec, "pitch_diameter_mm"));
                pstmt.setDouble(11, getSafeDouble(spec, "outside_diameter_mm"));
                pstmt.setString(12, getSafeString(spec, "hub_type"));
                pstmt.setString(13, getSafeString(spec, "hub_name"));
                pstmt.setDouble(14, getSafeDouble(spec, "max_bore_mm"));
                pstmt.setString(15, getSafeString(spec, "material"));
                pstmt.setString(16, getSafeString(spec, "hardness"));
                pstmt.setString(17, getSafeString(spec, "temperature_range"));

                pstmt.setString(18, joinArraySafe(item.get("features")));
                pstmt.setString(19, joinArraySafe(item.get("applications")));
                pstmt.setString(20, joinArraySafe(item.get("compatible_chains")));
                pstmt.setString(21, joinArraySafe(item.get("bore_options")));

                pstmt.addBatch();
                count++;

                if (count % 500 == 0) {
                    pstmt.executeBatch();
                    conn.commit();
                }
            }

            pstmt.executeBatch();
            conn.commit();
            pstmt.close();
            conn.close();

            System.out.println("✅ 총 " + count + "건 삽입 완료!");

        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    // 안전한 문자열 추출
    private static String getSafeString(JsonObject obj, String key) {
        return obj.has(key) && !obj.get(key).isJsonNull() ? obj.get(key).getAsString() : "";
    }

    // 안전한 정수 추출
    private static int getSafeInt(JsonObject obj, String key) {
        return obj.has(key) && obj.get(key).isJsonPrimitive() ? obj.get(key).getAsInt() : 0;
    }

    // 안전한 실수 추출
    private static double getSafeDouble(JsonObject obj, String key) {
        return obj.has(key) && obj.get(key).isJsonPrimitive() ? obj.get(key).getAsDouble() : 0.0;
    }

    // JsonElement → 문자열 배열 safely
    private static String joinArraySafe(JsonElement elem) {
        if (elem != null && elem.isJsonArray()) {
            List<String> list = new ArrayList<>();
            for (JsonElement e : elem.getAsJsonArray()) {
                list.add(e.getAsString());
            }
            return String.join(", ", list);
        }
        return "";
    }
}

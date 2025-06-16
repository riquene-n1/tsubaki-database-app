package to_oracle;

import java.io.FileReader;
import java.sql.*;
import java.util.Map;
import com.google.gson.*;

public class MetadataJsonToOracle {
    public static void main(String[] args) {
        String jsonFile = "data/metadata.json";
        String dbUrl = "jdbc:oracle:thin:@localhost:1521/XEPDB1";
        String dbUser = "TSUBAKIAPP";
        String dbPassword = "tsubaki1234";

        String insertSQL = "INSERT INTO METADATA_JSON VALUES (?, ?, ?, ?, ?, ?, ?)";

        try {
            Class.forName("oracle.jdbc.driver.OracleDriver");
            Connection conn = DriverManager.getConnection(dbUrl, dbUser, dbPassword);
            PreparedStatement pstmt = conn.prepareStatement(insertSQL);
            conn.setAutoCommit(false);

            FileReader reader = new FileReader(jsonFile);
            JsonObject root = JsonParser.parseReader(reader).getAsJsonObject();
            JsonObject meta = root.getAsJsonObject("metadata");
            JsonObject categories = meta.getAsJsonObject("categories");

            pstmt.setString(1, getSafe(meta, "title"));
            pstmt.setString(2, getSafe(meta, "version"));
            pstmt.setInt(3, getSafeInt(meta, "total_products"));
            pstmt.setString(4, getSafe(meta, "last_updated"));
            pstmt.setString(5, getSafe(meta, "description"));
            pstmt.setString(6, getCategoryString(categories));
            pstmt.setString(7, getCategoryJson(categories));

            pstmt.executeUpdate();
            conn.commit();
            pstmt.close();
            conn.close();

            System.out.println("✅ Metadata 1건 삽입 완료");

        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private static String getSafe(JsonObject obj, String key) {
        return obj.has(key) && !obj.get(key).isJsonNull() ? obj.get(key).getAsString() : "";
    }

    private static int getSafeInt(JsonObject obj, String key) {
        return obj.has(key) && obj.get(key).isJsonPrimitive() ? obj.get(key).getAsInt() : 0;
    }

    private static String getCategoryString(JsonObject obj) {
        StringBuilder sb = new StringBuilder();
        for (Map.Entry<String, JsonElement> entry : obj.entrySet()) {
            sb.append(entry.getKey()).append(": ").append(entry.getValue().getAsInt()).append(", ");
        }
        return sb.substring(0, sb.length() - 2); // remove last comma
    }

    private static String getCategoryJson(JsonObject obj) {
        return obj.toString(); // 원본 JSON 문자열로 저장
    }
}

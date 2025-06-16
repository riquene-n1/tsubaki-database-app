package to_oracle;

import java.io.FileReader;
import java.sql.*;
import java.util.*;
import com.google.gson.*;

public class DriveChainJsonToOracle {
    public static void main(String[] args) {
        String jsonFile = "data/Drive_Chain.json";
        String dbUrl = "jdbc:oracle:thin:@localhost:1521/XEPDB1";
        String dbUser = "TSUBAKIAPP";
        String dbPassword = "tsubaki1234";

        String insertSQL = "INSERT INTO DRIVE_CHAIN_JSON VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

        try {
            Class.forName("oracle.jdbc.driver.OracleDriver");
            Connection conn = DriverManager.getConnection(dbUrl, dbUser, dbPassword);
            PreparedStatement pstmt = conn.prepareStatement(insertSQL);
            conn.setAutoCommit(false);

            FileReader reader = new FileReader(jsonFile);
            JsonObject root = JsonParser.parseReader(reader).getAsJsonObject();
            JsonArray products = root.getAsJsonArray("products");

            int count = 0;
            for (JsonElement elem : products) {
                JsonObject item = elem.getAsJsonObject();
                JsonObject spec = item.getAsJsonObject("specifications");

                pstmt.setString(1, getSafe(item, "id"));
                pstmt.setString(2, getSafe(item, "category"));
                pstmt.setString(3, getSafe(item, "series"));
                pstmt.setString(4, getSafe(item, "model"));
                pstmt.setString(5, getSafe(item, "name"));
                pstmt.setString(6, getSafe(item, "tsubaki_code"));
                pstmt.setString(7, getSafe(item, "ansi_standard"));
                pstmt.setString(8, getSafe(item, "connecting_link"));

                pstmt.setDouble(9, getSafeDouble(spec, "pitch_mm"));
                pstmt.setString(10, getSafe(spec, "pitch_inch"));
                pstmt.setInt(11, getSafeInt(spec, "strands"));
                pstmt.setDouble(12, getSafeDouble(spec, "tensile_strength_kn"));
                pstmt.setDouble(13, getSafeDouble(spec, "allowable_load_kn"));
                pstmt.setDouble(14, getSafeDouble(spec, "weight_kg_per_m"));
                pstmt.setString(15, getSafe(spec, "material"));
                pstmt.setString(16, getSafe(spec, "temperature_range"));
                pstmt.setString(17, getSafe(spec, "surface_treatment"));

                pstmt.setString(18, joinArray(item.get("features")));
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

            System.out.println("✅ " + count + "건 삽입 완료 (Drive Chain)");

        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private static String getSafe(JsonObject obj, String key) {
        return obj.has(key) && !obj.get(key).isJsonNull() ? obj.get(key).getAsString() : "";
    }

    private static double getSafeDouble(JsonObject obj, String key) {
        return obj.has(key) && obj.get(key).isJsonPrimitive() ? obj.get(key).getAsDouble() : 0.0;
    }

    private static int getSafeInt(JsonObject obj, String key) {
        return obj.has(key) && obj.get(key).isJsonPrimitive() ? obj.get(key).getAsInt() : 0;
    }

    private static String joinArray(JsonElement element) {
        if (element != null && element.isJsonArray()) {
            List<String> list = new ArrayList<>();
            for (JsonElement e : element.getAsJsonArray()) {
                list.add(e.getAsString());
            }
            return String.join(", ", list);
        }
        return "";
    }
}

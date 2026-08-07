import { Document, Font, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

Font.register({
  family: "Pretendard",
  fonts: [
    { src: "/fonts/Pretendard-Regular.ttf", fontWeight: 400 },
    { src: "/fonts/Pretendard-SemiBold.ttf", fontWeight: 600 },
  ],
});

export type JdPdfKpi = {
  name: string;
  measure?: string | null;
  cadence?: string | null;
  targetGuide?: string | null;
};

export type JdPdfData = {
  organizationName: string;
  teamName: string;
  roleTitle: string;
  mission: string;
  outputs: string[];
  responsibilities: string[];
  requiredQualifications: string[];
  preferredQualifications: string[];
  kpis: JdPdfKpi[];
  versionLabel: string;
  generatedAt: string;
};

const styles = StyleSheet.create({
  page: {
    fontFamily: "Pretendard",
    fontSize: 9.5,
    color: "#333333",
    paddingTop: 36,
    paddingBottom: 40,
    paddingHorizontal: 40,
  },
  eyebrow: {
    fontSize: 8,
    color: "#666666",
  },
  title: {
    fontSize: 20,
    fontWeight: 600,
    color: "#111111",
    marginTop: 5,
  },
  mission: {
    fontSize: 9,
    color: "#444444",
    marginTop: 8,
    lineHeight: 1.5,
  },
  headerRule: {
    borderBottomWidth: 1.5,
    borderBottomColor: "#111111",
    marginTop: 14,
  },
  section: {
    marginTop: 16,
  },
  sectionLabel: {
    fontSize: 9,
    fontWeight: 600,
    color: "#111111",
    letterSpacing: 1,
    marginBottom: 6,
  },
  bulletRow: {
    flexDirection: "row",
    marginBottom: 3,
  },
  bulletMark: {
    width: 10,
    color: "#111111",
  },
  bulletText: {
    flex: 1,
    lineHeight: 1.5,
    color: "#333333",
  },
  numberRow: {
    flexDirection: "row",
    marginBottom: 5,
  },
  numberMark: {
    width: 16,
    color: "#111111",
    fontWeight: 600,
  },
  numberText: {
    flex: 1,
    lineHeight: 1.5,
    color: "#333333",
  },
  twoColumn: {
    flexDirection: "row",
    gap: 20,
  },
  column: {
    flex: 1,
  },
  kpiRow: {
    marginBottom: 8,
  },
  kpiName: {
    fontSize: 9.5,
    fontWeight: 600,
    color: "#111111",
    marginBottom: 2,
  },
  kpiMeta: {
    fontSize: 8,
    color: "#555555",
    lineHeight: 1.5,
  },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 40,
    right: 40,
    paddingTop: 6,
    borderTopWidth: 0.5,
    borderTopColor: "#cccccc",
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7.5,
    color: "#888888",
  },
});

function BulletList({ items }: { items: string[] }) {
  return (
    <View>
      {items.map((item, index) => (
        <View key={index} style={styles.bulletRow}>
          <Text style={styles.bulletMark}>{"·"}</Text>
          <Text style={styles.bulletText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

export function JdDocument({ data }: { data: JdPdfData }) {
  const kpiMeta = (kpi: JdPdfKpi) =>
    [kpi.measure && `측정: ${kpi.measure}`, kpi.cadence && `주기: ${kpi.cadence}`, kpi.targetGuide && `목표: ${kpi.targetGuide}`]
      .filter(Boolean)
      .join("  ·  ");

  return (
    <Document title={`${data.organizationName} ${data.roleTitle} 직무기술서`}>
      <Page size="A4" style={styles.page}>
        <View>
          <Text style={styles.eyebrow}>{`${data.organizationName} · ${data.teamName}`}</Text>
          <Text style={styles.title}>{data.roleTitle}</Text>
          {data.mission ? <Text style={styles.mission}>{data.mission}</Text> : null}
          <View style={styles.headerRule} />
        </View>

        {data.outputs.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>핵심 산출물</Text>
            <BulletList items={data.outputs} />
          </View>
        )}

        {data.responsibilities.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>주요 책임</Text>
            {data.responsibilities.map((item, index) => (
              <View key={index} style={styles.numberRow}>
                <Text style={styles.numberMark}>{`${index + 1}.`}</Text>
                <Text style={styles.numberText}>{item}</Text>
              </View>
            ))}
          </View>
        )}

        {(data.requiredQualifications.length > 0 || data.preferredQualifications.length > 0) && (
          <View style={[styles.section, styles.twoColumn]}>
            <View style={styles.column}>
              <Text style={styles.sectionLabel}>필수 자격요건</Text>
              <BulletList items={data.requiredQualifications} />
            </View>
            <View style={styles.column}>
              <Text style={styles.sectionLabel}>우대 자격요건</Text>
              <BulletList items={data.preferredQualifications} />
            </View>
          </View>
        )}

        {data.kpis.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>핵심 성과지표(KPI)</Text>
            {data.kpis.map((kpi, index) => (
              <View key={index} style={styles.kpiRow}>
                <Text style={styles.kpiName}>{kpi.name}</Text>
                {kpiMeta(kpi) ? <Text style={styles.kpiMeta}>{kpiMeta(kpi)}</Text> : null}
              </View>
            ))}
          </View>
        )}

        <View style={styles.footer} fixed>
          <Text>{`NCS JD Operator · ${data.versionLabel} · ${data.generatedAt}`}</Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

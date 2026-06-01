import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import {
  objectTypes,
  regionTypes,
  frameTypes,
  claddingTypes,
  roofingTypes,
  foundationTypes,
  optionItems,
  formatRub,
  type WizardState,
  type Estimate,
} from "@/lib/pricing";

Font.register({
  family: "PTSans",
  fonts: [
    { src: "/fonts/PTSans-Regular.ttf" },
    { src: "/fonts/PTSans-Bold.ttf", fontWeight: "bold" },
  ],
});

const ORANGE = "#ED6629";
const GRAPHITE = "#1D1C1C";
const LIGHT = "#F6F7F6";
const LINE = "#D9D9D6";

const styles = StyleSheet.create({
  page: {
    fontFamily: "PTSans",
    fontSize: 10,
    color: GRAPHITE,
    paddingTop: 40,
    paddingHorizontal: 44,
    paddingBottom: 64,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  logo: { width: 132, height: 88 },
  headerRight: { alignItems: "flex-end", paddingTop: 6 },
  docType: {
    fontFamily: "PTSans",
    fontWeight: "bold",
    fontSize: 8.5,
    color: ORANGE,
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  date: { fontSize: 9, color: "#8A8A88", marginTop: 5 },
  rule: { height: 3, width: 48, backgroundColor: ORANGE, marginTop: 16 },
  title: { fontSize: 23, fontWeight: "bold", marginTop: 14 },
  forWhom: { fontSize: 10, color: "#8A8A88", marginTop: 6 },
  sectionTitle: {
    fontFamily: "PTSans",
    fontWeight: "bold",
    fontSize: 8,
    color: ORANGE,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginTop: 26,
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6.5,
    borderBottomWidth: 1,
    borderBottomColor: LINE,
  },
  rowLabel: { color: "#777775", fontSize: 9.5 },
  rowValue: {
    fontFamily: "PTSans",
    fontWeight: "bold",
    fontSize: 9.5,
    maxWidth: 320,
    textAlign: "right",
  },
  totalBox: {
    backgroundColor: GRAPHITE,
    borderRadius: 6,
    padding: 18,
    marginTop: 16,
  },
  totalLabel: {
    fontFamily: "PTSans",
    fontWeight: "bold",
    fontSize: 8,
    color: ORANGE,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  totalValue: {
    fontFamily: "PTSans",
    fontWeight: "bold",
    fontSize: 21,
    color: LIGHT,
    marginTop: 7,
  },
  disclaimer: {
    backgroundColor: LIGHT,
    borderRadius: 6,
    padding: 14,
    marginTop: 22,
    fontSize: 8.5,
    color: "#6E6E6C",
    lineHeight: 1.55,
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 44,
    right: 44,
    borderTopWidth: 1,
    borderTopColor: LINE,
    paddingTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
    color: "#9A9A98",
  },
});

const labelOf = (
  list: { id: string; label: string }[],
  id: string,
): string => list.find((x) => x.id === id)?.label ?? "—";

export default function KpDocument({
  state,
  estimate,
  contact,
}: {
  state: WizardState;
  estimate: Estimate;
  contact: { name: string; phone: string };
}) {
  const date = new Date().toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const params: [string, string][] = [
    ["Тип объекта", labelOf(objectTypes, state.objectType)],
    ["Регион строительства", labelOf(regionTypes, state.region)],
    ["Тип каркаса", labelOf(frameTypes, state.frame)],
    [
      "Размеры (Д × Ш × В)",
      `${state.length} × ${state.width} × ${state.height} м`,
    ],
    ["Площадь застройки", `${estimate.area.toLocaleString("ru-RU")} м²`],
  ];
  if (state.frame !== "modular") {
    params.push(["Стеновое ограждение", labelOf(claddingTypes, state.cladding)]);
    params.push(["Кровля", labelOf(roofingTypes, state.roofing)]);
  }
  params.push(["Фундамент", labelOf(foundationTypes, state.foundation)]);

  const opts = optionItems
    .filter((o) => (state.options[o.id] || 0) > 0)
    .map((o) => `${o.label} — ${state.options[o.id]} шт`);
  if (opts.length) params.push(["Доборные элементы", opts.join(", ")]);

  return (
    <Document
      title="Коммерческое предложение — АЗИМЕР"
      author="ООО «АЗИМЕР»"
    >
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image src="/logo-pdf.png" style={styles.logo} />
          <View style={styles.headerRight}>
            <Text style={styles.docType}>Предварительная оценка</Text>
            <Text style={styles.date}>{date}</Text>
          </View>
        </View>

        <View style={styles.rule} />
        <Text style={styles.title}>Коммерческое предложение</Text>
        {contact.name ? (
          <Text style={styles.forWhom}>Подготовлено для: {contact.name}</Text>
        ) : null}

        {/* Параметры */}
        <Text style={styles.sectionTitle}>Параметры объекта</Text>
        {params.map(([label, value]) => (
          <View style={styles.row} key={label}>
            <Text style={styles.rowLabel}>{label}</Text>
            <Text style={styles.rowValue}>{value}</Text>
          </View>
        ))}

        {/* Расчёт */}
        <Text style={styles.sectionTitle}>Расчёт стоимости</Text>
        {estimate.lines.map((l) => (
          <View style={styles.row} key={l.label}>
            <Text style={styles.rowLabel}>{l.label}</Text>
            <Text style={styles.rowValue}>{formatRub(l.value)}</Text>
          </View>
        ))}

        <View style={styles.totalBox}>
          <Text style={styles.totalLabel}>Предварительная стоимость</Text>
          <Text style={styles.totalValue}>
            {formatRub(estimate.low)} — {formatRub(estimate.high)}
          </Text>
        </View>

        {estimate.complexity !== "TYPICAL" ? (
          <View style={styles.disclaimer}>
            <Text>
              Объект требует проверки инженером-конструктором: региональные
              нагрузки, крановое оборудование, сейсмика, мерзлота или иные
              факторы могут изменить сечения и фундамент. Указанная стоимость
              является ориентиром до расчёта КМ/КЖ.
            </Text>
          </View>
        ) : null}

        {/* Дисклеймер */}
        <View style={styles.disclaimer}>
          <Text>
            Документ содержит предварительную оценку стоимости по рыночным
            ставкам и не является офертой. Точная стоимость зависит от снеговых
            и ветровых нагрузок, типа грунта, рельефа, удалённости объекта и
            фиксируется в коммерческом предложении после уточнения деталей.
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text>ООО «АЗИМЕР» · Каркасные здания под ключ</Text>
          <Text>Красноярск</Text>
        </View>
      </Page>
    </Document>
  );
}

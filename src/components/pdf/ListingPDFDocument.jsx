import { Document, Page, Text, View, StyleSheet, Image, Font, Svg, Path, Circle } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: 'Helvetica',
    backgroundColor: '#FFFFFF',
    color: '#0F172A',
  },
  // 1. Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#4F46E5',
    paddingBottom: 10,
  },
  logoText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  logoAccent: {
    color: '#4F46E5',
    fontWeight: 'bold',
  },
  headerMeta: {
    alignItems: 'flex-end',
  },
  date: {
    fontSize: 8,
    color: '#64748B',
    marginBottom: 2,
  },
  productNameRef: {
    fontSize: 10,
    color: '#334155',
    fontWeight: 'bold',
  },

  // 2. Top Section (Image + Title)
  topSection: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 20,
  },
  topLeft: {
    width: '58%',
    marginRight: '2%',
    height: 150,
  },
  topRight: {
    width: '40%',
    flexDirection: 'column',
    justifyContent: 'flex-start',
  },
  mainImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    borderRadius: 6,
    border: '1px solid #E2E8F0',
  },
  label: {
    fontSize: 8,
    color: '#4F46E5',
    textTransform: 'uppercase',
    fontWeight: 'bold',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  titleText: {
    fontSize: 11,
    fontWeight: 'bold',
    lineHeight: 1.2,
    color: '#0F172A',
    marginBottom: 8,
  },

  // Copy Paste Section
  copyPasteBox: {
    backgroundColor: '#F1F5F9',
    padding: 6,
    borderRadius: 4,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    minHeight: 40,
  },
  copyPasteText: {
    fontSize: 7,
    color: '#475569',
    lineHeight: 1.3,
    fontFamily: 'Helvetica',
  },

  // 3. Description Section
  descriptionSection: {
    marginBottom: 25,
    padding: 15,
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  descriptionText: {
    fontSize: 9,
    lineHeight: 1.5,
    color: '#334155',
    textAlign: 'justify',
  },

  // 4. Keyword Table
  tableContainer: {
    marginTop: 0,
    width: '100%',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#CBD5E1',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    alignItems: 'center',
  },
  // Columns
  colTag: { width: '30%' },
  colVol: { width: '15%', textAlign: 'center' },
  colTrend: { width: '15%', textAlign: 'center', alignItems: 'center', justifyContent: 'center' },
  colComp: { width: '15%', textAlign: 'center' },
  colScore: { width: '10%', textAlign: 'center' },
  colStatus: { width: '15%', textAlign: 'center' },
  colStatusBody: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },

  // Text Styles in Table
  thText: { fontSize: 8, fontWeight: 'bold', color: '#64748B', textTransform: 'uppercase' },
  cellTag: { fontSize: 9, color: '#334155', fontWeight: 'bold' },
  tagBadge: { backgroundColor: '#F1F5F9', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 4, alignSelf: 'flex-start' },
  cellVol: { fontSize: 9, color: '#64748B' },
  cellScore: { fontSize: 9, fontWeight: 'bold', color: '#4F46E5' },

  // Competition Badges
  badgeBase: { paddingVertical: 2, paddingHorizontal: 6, borderRadius: 4, alignSelf: 'center', fontSize: 7, fontWeight: 'bold' },
  compLow: { backgroundColor: '#DCFCE7', color: '#166534' },
  compMed: { backgroundColor: '#FEF9C3', color: '#854D0E' },
  compHigh: { backgroundColor: '#FEE2E2', color: '#991B1B' },

  trendPos: { color: '#16A34A', fontSize: 6, fontWeight: 'bold', textAlign: 'center', marginTop: 2 },
  trendNeg: { color: '#DC2626', fontSize: 6, fontWeight: 'bold', textAlign: 'center', marginTop: 2 },
  trendNeutral: { color: '#64748B', fontSize: 6, textAlign: 'center', marginTop: 2 },

  // 5. Strategic Insights Section
  insightsSection: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  insightRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  insightKeyword: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#334155',
    marginBottom: 2,
  },
  insightText: {
    fontSize: 8,
    color: '#64748B',
    lineHeight: 1.4,
  },

  footer: {
    position: 'absolute',
    bottom: 20,
    left: 30,
    right: 30,
    textAlign: 'center',
    fontSize: 8,
    color: '#CBD5E1',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 10,
  }
});

// --- SVG Icon Components (Lucide-style paths) ---

const FlameIcon = ({ size = 10 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"
      fill="#F97316"
      fillOpacity={0.2}
      stroke="#F97316"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const LeafIcon = ({ size = 10 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="M11 20A7 7 0 0 1 9.8 6.9C15.5 4.9 17 3.5 19 2c1 2 2 4.5 2 8 0 5.5-3.8 10-10 10Z"
      fill="#10B981"
      fillOpacity={0.2}
      stroke="#10B981"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"
      stroke="#10B981"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const StarIcon = ({ size = 10 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
      fill="#F59E0B"
      fillOpacity={0.3}
      stroke="#F59E0B"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const TargetIcon = ({ size = 10, color = '#4F46E5' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Circle cx={12} cy={12} r={10} fill="none" stroke={color} strokeWidth={2} />
    <Circle cx={12} cy={12} r={6} fill="none" stroke={color} strokeWidth={2} />
    <Circle cx={12} cy={12} r={2} fill={color} />
  </Svg>
);

const LightbulbIcon = ({ color = '#22C55E', size = 10 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path d="M9 18h6" stroke={color} strokeWidth={2} strokeLinecap="round" />
    <Path d="M10 22h4" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

// --- Sparkline SVG Component ---
const SparklineSVG = ({ data, width = 55, height = 18 }) => {
  if (!data || data.length < 2) {
    return (
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <Path
          d={`M 0 ${height / 2} L ${width} ${height / 2}`}
          stroke="#CBD5E1"
          strokeWidth={1.5}
          strokeDasharray="2,2"
        />
      </Svg>
    );
  }

  const padding = 2;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data.map((val, i) => {
    const x = padding + (i / (data.length - 1)) * chartWidth;
    const y = padding + chartHeight - ((val - min) / range) * chartHeight;
    return { x: x.toFixed(1), y: y.toFixed(1) };
  });

  const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  // Determine color based on trend direction
  const isPositive = data[data.length - 1] >= data[0];
  const strokeColor = isPositive ? '#16A34A' : '#EF4444';

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Path
        d={pathData}
        fill="none"
        stroke={strokeColor}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};

const ListingPDFDocument = ({ listing }) => {
  const formattedDate = new Date().toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  const formatNumber = (num) => num ? num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") : '-';
  const keywordsList = listing.tags ? listing.tags.map(t => t.keyword).join(', ') : '';

  const getCompBadge = (val) => {
    let level = 'high';
    let valNum = parseFloat(val);
    let displayVal = !isNaN(valNum) ? valNum.toFixed(2) : val;

    if (!isNaN(valNum)) {
      if (valNum <= 0.4) level = 'low';
      else if (valNum <= 0.7) level = 'med';
    }

    if (level === 'low') return <Text style={[styles.badgeBase, styles.compLow]}>{displayVal}</Text>;
    if (level === 'med') return <Text style={[styles.badgeBase, styles.compMed]}>{displayVal}</Text>;
    return <Text style={[styles.badgeBase, styles.compHigh]}>{displayVal}</Text>;
  };

  const renderStatusIcons = (k) => {
    const hasAny = k.is_trending || k.is_evergreen || k.is_promising;
    return (
      <>
        {k.is_trending && <FlameIcon size={12} />}
        {k.is_evergreen && <LeafIcon size={12} />}
        {k.is_promising && <StarIcon size={12} />}
        {!hasAny && <Text style={{ fontSize: 8, color: '#CBD5E1' }}>-</Text>}
      </>
    );
  };

  // Filter tags with insights for the Strategic Insights section
  const insightTags = (listing.tags || []).filter(t => t.insight).slice(0, 5);

  // Score strength config
  const getStrengthConfig = (score) => {
    if (score >= 80) return { color: '#16A34A', bgColor: '#DCFCE7', label: 'Strong', summary: 'High visibility potential. This listing is optimized for conversion.' };
    if (score >= 50) return { color: '#F59E0B', bgColor: '#FEF9C3', label: 'Good', summary: 'Good foundation. Minor tweaks in secondary keywords could boost reach.' };
    return { color: '#E11D48', bgColor: '#FEE2E2', label: 'Low', summary: 'Low visibility risk. Consider revising keywords to reduce competition.' };
  };
  const strengthScore = listing.global_strength;
  const strengthConfig = strengthScore != null ? getStrengthConfig(strengthScore) : null;
  // Use API-provided labels when available, fallback to tier defaults
  const pdfStatusLabel = listing.status_label || (strengthConfig ? strengthConfig.label : '');
  const pdfStrategicVerdict = listing.strategic_verdict || (strengthConfig ? strengthConfig.summary : '');

  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>

        {/* Header */}
        <View style={styles.header}>
            <View>
                <Text style={styles.logoText}>StudioDourliac <Text style={styles.logoAccent}>•</Text></Text>
                <Text style={{ fontSize: 9, color: '#94A3B8', marginTop: 2 }}>AI Listing Strategy</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                {strengthConfig && (
                    <View style={{ alignItems: 'center', minWidth: 50 }}>
                        <Svg width={44} height={44} viewBox="0 0 44 44">
                            <Circle cx={22} cy={22} r={20} fill={strengthConfig.bgColor} />
                            <Circle cx={22} cy={22} r={20} fill="none" stroke={strengthConfig.color} strokeWidth={2.5} />
                        </Svg>
                        <Text style={{ position: 'absolute', top: 10, left: 0, right: 0, textAlign: 'center', fontSize: 13, fontWeight: 'bold', color: strengthConfig.color }}>{strengthScore}</Text>
                        <Text style={{ fontSize: 6, color: strengthConfig.color, marginTop: 4, fontWeight: 'bold' }}>{pdfStatusLabel}</Text>
                    </View>
                )}
                <View style={styles.headerMeta}>
                    <Text style={styles.date}>{formattedDate}</Text>
                    <Text style={styles.productNameRef}>{listing.productName || 'Untitled Project'}</Text>
                </View>
            </View>
        </View>

        {/* Strategic Summary */}
        {strengthConfig && (
            <View style={{ backgroundColor: strengthConfig.bgColor, padding: 10, borderRadius: 4, marginBottom: 15, borderLeftWidth: 3, borderLeftColor: strengthConfig.color }}>
                <Text style={{ fontSize: 8, color: '#334155', lineHeight: 1.4 }}>
                    <Text style={{ fontWeight: 'bold', color: strengthConfig.color }}>Score {strengthScore}/100 — {pdfStatusLabel} — </Text>
                    {pdfStrategicVerdict}
                </Text>
            </View>
        )}

        {/* 2. Top Section (Image & Title) */}
        <View style={styles.topSection}>
            <View style={styles.topLeft}>
                {listing.imageUrl ? (
                    <Image src={listing.imageUrl} style={styles.mainImage} />
                ) : (
                    <View style={[styles.mainImage, { backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' }]}>
                         <Text style={{ color: '#94A3B8', fontSize: 10 }}>No Image Available</Text>
                    </View>
                )}
            </View>
            <View style={styles.topRight}>
                <Text style={styles.label}>OPTIMIZED TITLE</Text>
                <Text style={styles.titleText}>{listing.title || 'No Title Generated'}</Text>

                <Text style={[styles.label, { marginTop: 6, marginBottom: 4 }]}>COPY KEYWORDS</Text>
                <View style={styles.copyPasteBox}>
                     <Text style={styles.copyPasteText}>
                        {keywordsList || 'No keywords selected.'}
                     </Text>
                </View>
            </View>
        </View>

        {/* 3. Description Section */}
        <View style={styles.descriptionSection}>
            <Text style={[styles.label, { marginBottom: 8 }]}>OPTIMIZED DESCRIPTION</Text>
            <Text style={styles.descriptionText}>{listing.description || 'No Description Available'}</Text>
        </View>

        {/* 4. SEO Performance Table */}
        <Text style={[styles.label, { marginBottom: 8, marginTop: 20 }]}>SEO KEYWORD PERFORMANCE</Text>
        
        {/* Legend (before table) */}
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 8, gap: 15, paddingRight: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <FlameIcon size={8} />
                <Text style={{ fontSize: 7, color: '#64748B' }}>Trending</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <LeafIcon size={8} />
                <Text style={{ fontSize: 7, color: '#64748B' }}>Evergreen</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <StarIcon size={8} />
                <Text style={{ fontSize: 7, color: '#64748B' }}>Opportunity</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <TargetIcon size={8} />
                <Text style={{ fontSize: 7, color: '#64748B' }}>Sniper</Text>
            </View>
        </View>

        <View style={styles.tableContainer}>
            {/* Header */}
            <View style={styles.tableHeader}>
                <Text style={[styles.thText, styles.colTag]}>Keyword Tag</Text>
                <Text style={[styles.thText, styles.colVol]}>Avg Vol</Text>
                <Text style={[styles.thText, styles.colTrend]}>Trend</Text>
                <Text style={[styles.thText, styles.colComp]}>Comp</Text>
                <Text style={[styles.thText, styles.colScore]}>Score</Text>
                <Text style={[styles.thText, styles.colStatus]}>Status</Text>
            </View>

            {/* Rows */}
            {listing.tags && listing.tags.map((tag, i) => (
                <View key={i} style={styles.tableRow} wrap={false}>
                    <View style={styles.colTag}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <View style={styles.tagBadge}>
                                <Text style={styles.cellTag}>{tag.keyword}</Text>
                            </View>
                            {tag.is_sniper_seo && <TargetIcon size={9} />}
                        </View>
                    </View>

                    <Text style={[styles.cellVol, styles.colVol]}>
                        {formatNumber(tag.volume)}
                    </Text>

                    <View style={styles.colTrend}>
                        <SparklineSVG data={tag.volume_history} width={55} height={18} />
                        <Text style={tag.trend > 0 ? styles.trendPos : (tag.trend < 0 ? styles.trendNeg : styles.trendNeutral)}>
                            {tag.trend ? `${tag.trend > 0 ? '+' : ''}${tag.trend}%` : '0%'}
                        </Text>
                    </View>

                    <View style={styles.colComp}>
                        {getCompBadge(tag.competition)}
                    </View>

                    <Text style={[styles.cellScore, styles.colScore]}>{tag.score}</Text>

                    <View style={[styles.colStatus, styles.colStatusBody]}>
                        {renderStatusIcons(tag)}
                    </View>
                </View>
            ))}
             {(!listing.tags || listing.tags.length === 0) && (
                <View style={[styles.tableRow, { justifyContent: 'center', padding: 20 }]}>
                    <Text style={{ fontSize: 10, color: '#94A3B8', fontStyle: 'italic' }}>No SEO data available for this listing.</Text>
                </View>
            )}

            {/* Legend */}
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10, gap: 15, paddingRight: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <FlameIcon size={8} />
                    <Text style={{ fontSize: 7, color: '#64748B' }}>Trending</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <LeafIcon size={8} />
                    <Text style={{ fontSize: 7, color: '#64748B' }}>Evergreen</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <StarIcon size={8} />
                    <Text style={{ fontSize: 7, color: '#64748B' }}>Opportunity</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <TargetIcon size={8} />
                    <Text style={{ fontSize: 7, color: '#64748B' }}>Sniper</Text>
                </View>
            </View>
        </View>

        {/* 5. Strategic Insights Section */}
        {insightTags.length > 0 && (
            <View style={styles.insightsSection} wrap={false}>
                <Text style={[styles.label, { marginBottom: 10 }]}>STRATEGIC INSIGHTS</Text>
                {insightTags.map((tag, i) => (
                    <View key={i} style={[styles.insightRow, i === insightTags.length - 1 && { borderBottomWidth: 0, marginBottom: 0, paddingBottom: 0 }]}>
                        <View style={{ marginTop: 1 }}>
                            <LightbulbIcon
                                size={12}
                                color={tag.is_top === true ? '#22C55E' : tag.is_top === false ? '#F59E0B' : '#9CA3AF'}
                            />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.insightKeyword}>{tag.keyword}</Text>
                            <Text style={styles.insightText}>{tag.insight}</Text>
                        </View>
                    </View>
                ))}
            </View>
        )}

        <View style={styles.footer} fixed>
            <Text>Generated by PennySEO • StudioDourliac - Confidential Strategy Document</Text>
        </View>

      </Page>
    </Document>
  );
};

export default ListingPDFDocument;

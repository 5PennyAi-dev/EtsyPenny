import { Document, Page, Text, View, StyleSheet, Image, Font, Svg, Path } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    padding: 30, // Reduced padding for more space
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
    borderBottomColor: '#4F46E5', // Indigo-600
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
    marginBottom: 25,
    marginBottom: 20,
    // removed fixed height
  },
  topLeft: {
    width: '58%', // 58% width
    marginRight: '2%',
    height: 150, // Fixed height for image container
  },
  topRight: {
    width: '40%', // 40% width
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
    color: '#4F46E5', // Indigo-600
    textTransform: 'uppercase',
    fontWeight: 'bold',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  titleText: {
    fontSize: 11, // Reduced font size
    fontWeight: 'bold',
    lineHeight: 1.2,
    color: '#0F172A',
    marginBottom: 8,
  },
  metadataBox: {
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  metaLabel: { fontSize: 8, color: '#64748B' },
  metaValue: { fontSize: 8, fontWeight: 'bold', color: '#334155' },

  // 3. Middle Section (Description)
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
    backgroundColor: '#F1F5F9', // Slate-100
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
    borderBottomColor: '#F1F5F9', // Very light divider
    alignItems: 'center',
  },
  // Columns
  colTag: { width: '30%' },
  colVol: { width: '15%', textAlign: 'center' },
  colTrend: { width: '15%', textAlign: 'center' },
  colComp: { width: '15%', textAlign: 'center' },
  colScore: { width: '10%', textAlign: 'center' },
  colStatus: { width: '15%', textAlign: 'center' }, 
  colStatusBody: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }, // Center icons in body

  // Text Styles in Table
  // Text Styles in Table
  thText: { fontSize: 8, fontWeight: 'bold', color: '#64748B', textTransform: 'uppercase' }, // Table Header Text
  cellTag: { fontSize: 9, color: '#334155', fontWeight: 'bold' },
  tagBadge: { backgroundColor: '#F1F5F9', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 4, alignSelf: 'flex-start' }, // Badge style
  cellVol: { fontSize: 9, color: '#64748B' },
  cellScore: { fontSize: 9, fontWeight: 'bold', color: '#4F46E5' },
  
  // Copy Paste Section
  copyPasteBox: {
    backgroundColor: '#F1F5F9', // Slate-100
    padding: 6,
    borderRadius: 4,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    minHeight: 40, // Ensure minimum height
  },
  copyPasteText: {
    fontSize: 7, // Smaller font for list
    color: '#475569',
    lineHeight: 1.3,
    fontFamily: 'Helvetica', // Changed from Courier for better fit? Or keep Courier but wrap?
    // Courier is monospaced, takes more space. Helvetica is tighter.
  },
  
  // Status Badges
  badgeBase: { paddingVertical: 2, paddingHorizontal: 6, borderRadius: 4, alignSelf: 'center', fontSize: 7, fontWeight: 'bold' },
  compLow: { backgroundColor: '#DCFCE7', color: '#166534' }, // Green-100 / Green-800
  compMed: { backgroundColor: '#FEF9C3', color: '#854D0E' }, // Yellow-100 / Yellow-800
  compHigh: { backgroundColor: '#FEE2E2', color: '#991B1B' }, // Red-100 / Red-800

  trendPos: { color: '#16A34A', fontSize: 8, fontWeight: 'bold' },
  trendNeg: { color: '#DC2626', fontSize: 8, fontWeight: 'bold' },

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

const ListingPDFDocument = ({ listing }) => {
  const formattedDate = new Date().toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  const formatNumber = (num) => num ? num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") : '-';
  const keywordsList = listing.tags ? listing.tags.map(t => t.keyword).join(', ') : '';
  
  const getCompBadge = (val) => {
    // Determine level
    let level = 'high';
    let valNum = parseFloat(val);
    if (!isNaN(valNum)) {
        if (valNum < 0.35) level = 'low';
        else if (valNum < 0.70) level = 'med';
    }

    if (level === 'low') return <Text style={[styles.badgeBase, styles.compLow]}>LOW</Text>;
    if (level === 'med') return <Text style={[styles.badgeBase, styles.compMed]}>MED</Text>;
    return <Text style={[styles.badgeBase, styles.compHigh]}>HIGH</Text>;
  };

  const renderStatusIcons = (k) => {
      return (
        <>
            {k.is_trending && (
                <Svg width="10" height="10" viewBox="0 0 24 24">
                    <Path fill="#EF4444" d="M12 2L2 22h20L12 2z" />
                </Svg>
            )}
            {k.is_evergreen && (
                <Svg width="10" height="10" viewBox="0 0 24 24">
                    <Path fill="#16A34A" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
                </Svg>
            )}
            {k.is_promising && (
                <Svg width="10" height="10" viewBox="0 0 24 24">
                    <Path fill="#8B5CF6" d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                </Svg>
            )}
        </>
      );
  };

  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        
        {/* Header (Fixed on all pages if wrapped? No, fixed prop handles that but we keep simple) */}
        <View style={styles.header}>
            <View>
                <Text style={styles.logoText}>StudioDourliac <Text style={styles.logoAccent}>•</Text></Text>
                <Text style={{ fontSize: 9, color: '#94A3B8', marginTop: 2 }}>AI Listing Strategy</Text>
            </View>
            <View style={styles.headerMeta}>
                <Text style={styles.date}>{formattedDate}</Text>
                <Text style={styles.productNameRef}>{listing.productName || 'Untitled Project'}</Text>
            </View>
        </View>

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
        <Text style={[styles.label, { marginBottom: 15, marginTop: 20 }]}>SEO KEYWORD PERFORMANCE</Text>
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
                        <View style={styles.tagBadge}>
                            <Text style={styles.cellTag}>{tag.keyword}</Text>
                        </View>
                    </View>
                    
                    <Text style={[styles.cellVol, styles.colVol]}>
                        {formatNumber(tag.volume)}
                    </Text>
                    
                    <Text style={[styles.colTrend, tag.trend > 0 ? styles.trendPos : (tag.trend < 0 ? styles.trendNeg : styles.cellVol)]}>
                        {tag.trend ? `${tag.trend > 0 ? '+' : ''}${tag.trend}%` : '-'}
                    </Text>

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
                    <Svg width="8" height="8" viewBox="0 0 24 24"><Path fill="#EF4444" d="M12 2L2 22h20L12 2z" /></Svg>
                    <Text style={{ fontSize: 7, color: '#64748B' }}>Trending</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Svg width="8" height="8" viewBox="0 0 24 24"><Path fill="#16A34A" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" /></Svg>
                    <Text style={{ fontSize: 7, color: '#64748B' }}>Evergreen</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Svg width="8" height="8" viewBox="0 0 24 24"><Path fill="#8B5CF6" d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" /></Svg>
                    <Text style={{ fontSize: 7, color: '#64748B' }}>Promising</Text>
                </View>
            </View>
        </View>

        <View style={styles.footer} fixed>
            <Text>Generated by 5PennyAi • StudioDourliac - Confidential Strategy Document</Text>
        </View>

      </Page>
    </Document>
  );
};

export default ListingPDFDocument;

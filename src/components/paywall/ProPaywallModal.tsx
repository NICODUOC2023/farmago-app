import { LinearGradient } from 'expo-linear-gradient';
import { Check, Crown, Sparkles, X } from 'lucide-react-native';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/constants/colors';
import { usePaywall } from '@/store/paywall';

export function ProPaywallModal() {
  const insets = useSafeAreaInsets();
  const isVisible = usePaywall((state) => state.isVisible);
  const feature = usePaywall((state) => state.feature);
  const activatePro = usePaywall((state) => state.activatePro);
  const dismissPaywall = usePaywall((state) => state.dismissPaywall);

  const isTreatment = feature === 'treatment';

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      presentationStyle="overFullScreen"
      statusBarTranslucent
      onRequestClose={dismissPaywall}>
      <View style={styles.modalRoot}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cerrar ventana PharmaGo PRO"
          onPress={dismissPaywall}
          style={styles.backdrop}
        />

        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 18) }]}>
          <View style={styles.handle} />

          <LinearGradient
            colors={['#282064', colors.primary, '#8175F2']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cerrar paywall"
              onPress={dismissPaywall}
              hitSlop={10}
              style={styles.closeButton}>
              <X size={19} color="#FFFFFF" strokeWidth={2.2} />
            </Pressable>

            <View style={styles.proBadge}>
              <Sparkles size={13} color="#FFF2B2" strokeWidth={2.5} />
              <Text style={styles.proBadgeText}>PHARMAGO PRO</Text>
            </View>

            <View style={styles.crownCircle}>
              <Crown size={31} color="#5B4FE8" strokeWidth={2.2} />
            </View>

            <Text style={styles.title}>
              {isTreatment ? 'Tu tratamiento, mejor acompañado' : 'Tus recetas, más fáciles'}
            </Text>
            <Text style={styles.description}>
              {isTreatment
                ? 'Agregar tratamientos y organizar tus tomas es exclusivo para usuarios PharmaGo PRO.'
                : 'El escáner OCR y el acceso a tus tratamientos son exclusivos para usuarios PharmaGo PRO.'}
            </Text>
          </LinearGradient>

          <ScrollView
            bounces={false}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.content}>
            <BenefitRow title="Escanea recetas con OCR" detail="Pasa de la receta al tratamiento en segundos." />
            <BenefitRow title="Lleva el control de tus tomas" detail="Consulta tu progreso y marca cada dosis." />

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Conseguir PharmaGo PRO"
              onPress={activatePro}
              style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}>
              <LinearGradient
                colors={['#5144D6', '#7869EF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.ctaGradient}>
                <Sparkles size={18} color="#FFFFFF" strokeWidth={2.3} />
                <Text style={styles.ctaText}>Conseguir PharmaGo PRO</Text>
              </LinearGradient>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function BenefitRow({ title, detail }: { title: string; detail: string }) {
  return (
    <View style={styles.benefitRow}>
      <View style={styles.checkCircle}>
        <Check size={14} color={colors.primary} strokeWidth={3} />
      </View>
      <View style={styles.benefitCopy}>
        <Text style={styles.benefitTitle}>{title}</Text>
        <Text style={styles.benefitDetail}>{detail}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(22, 17, 54, 0.58)',
  },
  sheet: {
    maxHeight: '94%',
    overflow: 'hidden',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    backgroundColor: colors.surface,
  },
  handle: {
    alignSelf: 'center',
    width: 42,
    height: 5,
    marginTop: 9,
    marginBottom: 9,
    borderRadius: 99,
    backgroundColor: '#DAD7E8',
  },
  hero: {
    alignItems: 'center',
    paddingHorizontal: 26,
    paddingTop: 18,
    paddingBottom: 25,
  },
  closeButton: {
    position: 'absolute',
    top: 15,
    right: 19,
    zIndex: 2,
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  proBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 99,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
  },
  proBadgeText: {
    color: '#FFF2B2',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 10,
    letterSpacing: 1.1,
  },
  crownCircle: {
    width: 62,
    height: 62,
    marginTop: 16,
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 31,
    backgroundColor: '#FFF2B2',
  },
  title: {
    maxWidth: 320,
    color: '#FFFFFF',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 24,
    lineHeight: 31,
    textAlign: 'center',
  },
  description: {
    maxWidth: 330,
    marginTop: 8,
    color: 'rgba(255, 255, 255, 0.86)',
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 10,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  checkCircle: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    backgroundColor: colors.primarySoft,
  },
  benefitCopy: {
    flex: 1,
    marginLeft: 11,
  },
  benefitTitle: {
    color: colors.textPrimary,
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 13,
  },
  benefitDetail: {
    marginTop: 2,
    color: colors.textSecondary,
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 11,
    lineHeight: 16,
  },
  cta: {
    width: '100%',
    minHeight: 58,
    overflow: 'hidden',
    borderRadius: 18,
    backgroundColor: colors.primary,
  },
  ctaGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    minHeight: 58,
    paddingHorizontal: 16,
  },
  ctaPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
  ctaText: {
    color: '#FFFFFF',
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 14,
  },
});

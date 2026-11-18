import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';

import { colors } from '@/constants/colors';
import { grantConsent } from "@/services/consents";

type Props = {
  onDone: () => void;
};

export function ConsentGate({ onDone }: Props) {
  const insets = useSafeAreaInsets();
  const [terms, setTerms] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openDocument, setOpenDocument] = useState<'terms' | 'privacy' | null>(null);

  const canContinue = terms && privacy;

  const submit = async () => {
    if (!canContinue) return;
    setBusy(true);
    setError(null);
    try {
      await grantConsent('terms_of_service');
      await grantConsent('privacy_policy');
      if (marketing) await grantConsent('marketing');
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo registrar el consentimiento.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }}>
        <View style={{ width: '100%', maxWidth: 420, alignSelf: 'center', backgroundColor: colors.surface, borderRadius: 20, padding: 24 }}>
          <Text style={{ fontSize: 22, fontWeight: '700', color: colors.textPrimary, textAlign: 'center' }}>
            Privacidad y datos
          </Text>
          <Text style={{ marginTop: 8, fontSize: 14, color: colors.textSecondary, textAlign: 'center' }}>
            Revisa los resúmenes de términos y privacidad antes de continuar. Los textos legales completos están pendientes de revisión.
          </Text>

          <View style={{ marginTop: 20, gap: 12 }}>
            <ConsentOption
              checked={terms}
              label="Acepto los Términos de servicio"
              onToggle={() => setTerms((value) => !value)}
              onRead={() => setOpenDocument('terms')}
              readLabel="Leer resumen de términos"
            />

            <ConsentOption
              checked={privacy}
              label="Acepto la Política de privacidad"
              onToggle={() => setPrivacy((value) => !value)}
              onRead={() => setOpenDocument('privacy')}
              readLabel="Leer resumen de privacidad"
            />

            <ConsentOption
              checked={marketing}
              label="Quiero recibir comunicaciones de farmaGO (opcional)"
              onToggle={() => setMarketing((value) => !value)}
              optional
            />
          </View>

          {error ? (
            <Text style={{ marginTop: 12, fontSize: 12, color: '#D6455D' }} accessibilityRole="alert">
              {error}
            </Text>
          ) : null}

          <Pressable
            onPress={submit}
            disabled={!canContinue || busy}
            accessibilityRole="button"
            style={{ marginTop: 20, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, opacity: !canContinue || busy ? 0.6 : 1 }}>
            {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={{ fontSize: 15, fontWeight: '600', color: '#FFFFFF' }}>Continuar</Text>}
          </Pressable>
        </View>
      </ScrollView>

      <Modal
        visible={openDocument !== null}
        transparent
        animationType="slide"
        presentationStyle="overFullScreen"
        statusBarTranslucent
        onRequestClose={() => setOpenDocument(null)}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.backdrop} onPress={() => setOpenDocument(null)} accessibilityLabel="Cerrar documento" />
          <View style={[styles.documentSheet, { paddingBottom: Math.max(insets.bottom, 18) }]}>
            <View style={styles.documentHeader}>
              <Text style={styles.documentTitle}>
                {openDocument === 'privacy' ? 'Política de privacidad' : 'Términos de servicio'}
              </Text>
              <Pressable
                onPress={() => setOpenDocument(null)}
                accessibilityRole="button"
                accessibilityLabel="Cerrar documento"
                hitSlop={8}
                style={styles.closeButton}>
                <X size={18} color={colors.textPrimary} />
              </Pressable>
            </View>
            <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={styles.documentBody}>
              {openDocument === 'privacy' ? <PrivacySummary /> : <TermsSummary />}
            </ScrollView>
            <Pressable
              onPress={() => setOpenDocument(null)}
              accessibilityRole="button"
              style={styles.closeDocumentButton}>
              <Text style={styles.closeDocumentText}>Volver al consentimiento</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function ConsentOption({
  checked,
  label,
  onToggle,
  onRead,
  readLabel,
  optional = false,
}: {
  checked: boolean;
  label: string;
  onToggle: () => void;
  onRead?: () => void;
  readLabel?: string;
  optional?: boolean;
}) {
  return (
    <View style={styles.optionRow}>
      <Pressable
        onPress={onToggle}
        accessibilityRole="checkbox"
        accessibilityLabel={label}
        accessibilityState={{ checked }}
        hitSlop={6}
        style={[
          styles.checkbox,
          { borderColor: optional ? colors.textSecondary : colors.primary },
          checked && { backgroundColor: colors.primary, borderColor: colors.primary },
        ]}>
        {checked ? <Text style={styles.checkmark}>✓</Text> : null}
      </Pressable>
      <View style={styles.optionCopy}>
        <Pressable onPress={onToggle} accessibilityRole="button">
          <Text style={{ fontSize: 13, color: optional ? colors.textSecondary : colors.textPrimary }}>{label}</Text>
        </Pressable>
        {onRead && readLabel ? (
          <Pressable onPress={onRead} accessibilityRole="link" hitSlop={6} style={styles.readLink}>
            <Text style={styles.readLinkText}>{readLabel}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function PrivacySummary() {
  return (
    <>
      <Text style={styles.provisionalNotice}>
        Resumen provisional del MVP. No reemplaza el texto legal completo, cuya revisión jurídica está pendiente.
      </Text>
      <DocumentSection title="Datos y uso">
        Podemos tratar tu correo, búsquedas recientes, ubicación temporal para la consulta, medicamentos y datos estructurados de recetas, además de tratamientos y tomas. Se usan para buscar farmacias, procesar recetas y gestionar tratamientos.
      </DocumentSection>
      <DocumentSection title="Almacenamiento">
        La ubicación se usa durante la búsqueda y no se guarda permanentemente. Las imágenes de recetas y el OCR crudo no se almacenan. Las búsquedas recientes se guardan localmente; los tratamientos pueden asociarse a tu cuenta.
      </DocumentSection>
      <DocumentSection title="Proveedores">
        Supabase presta servicios de cuenta y datos; Google Gemini procesa temporalmente las imágenes para OCR. Algunos proveedores pueden procesar datos fuera de Chile.
      </DocumentSection>
    </>
  );
}

function TermsSummary() {
  return (
    <>
      <Text style={styles.provisionalNotice}>
        Resumen provisional del MVP. El texto legal completo debe revisarse antes de producción.
      </Text>
      <DocumentSection title="Alcance del servicio">
        farmaGO ayuda a localizar farmacias y organizar tratamientos. Esta versión no vende, reserva ni despacha medicamentos.
      </DocumentSection>
      <DocumentSection title="Información de salud">
        El OCR identifica datos visibles en una receta; no ofrece diagnóstico ni recomendación médica. Confirma las indicaciones con un profesional de salud.
      </DocumentSection>
      <DocumentSection title="Disponibilidad">
        La información de stock puede cambiar y algunos datos de demostración no representan disponibilidad física. Confirma el stock y el precio directamente con la farmacia.
      </DocumentSection>
    </>
  );
}

function DocumentSection({ title, children }: { title: string; children: string }) {
  return (
    <View style={styles.documentSection}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionBody}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  optionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  optionCopy: {
    flex: 1,
  },
  readLink: {
    alignSelf: 'flex-start',
    marginTop: 4,
    paddingVertical: 2,
  },
  readLinkText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
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
    backgroundColor: 'rgba(20, 17, 48, 0.5)',
  },
  documentSheet: {
    maxHeight: '88%',
    paddingTop: 20,
    paddingHorizontal: 22,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    backgroundColor: colors.surface,
  },
  documentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  documentTitle: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 19,
    fontWeight: '700',
  },
  closeButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: colors.primarySoft,
  },
  documentBody: {
    paddingBottom: 12,
  },
  provisionalNotice: {
    marginBottom: 16,
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#FFF7E5',
    color: '#775714',
    fontSize: 12,
    lineHeight: 18,
  },
  documentSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  sectionBody: {
    marginTop: 5,
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
  },
  closeDocumentButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: colors.primary,
  },
  closeDocumentText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gradient as LinearGradient } from '../components/Gradient';
import { colors, radius, spacing } from '../theme';

interface Props {
  onAccept: () => void;
}

export default function EulaScreen({ onAccept }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#040e1e', '#071828']} style={StyleSheet.absoluteFill} />

      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <Text style={styles.title}>Términos de uso</Text>
        <Text style={styles.subtitle}>Antes de continuar, lee y acepta nuestros términos</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Section title="1. Contenido inapropiado">
          SUP Status tiene tolerancia cero con contenido ofensivo, abusivo, ilegal, de odio o que acose a otros usuarios. El contenido que viole estas normas será eliminado y el usuario responsable podrá ser bloqueado de la plataforma.
        </Section>

        <Section title="2. Moderación de contenido">
          Todo el contenido publicado (historias, comentarios) está sujeto a revisión. Los administradores pueden eliminar contenido que no cumpla con estas normas en un plazo de 24 horas desde que se reporta.
        </Section>

        <Section title="3. Reportar y bloquear">
          Puedes reportar contenido inapropiado o bloquear usuarios que consideres abusivos. Los reportes son revisados por el equipo de moderación. Al bloquear un usuario, su contenido dejará de aparecer en tu feed de forma inmediata.
        </Section>

        <Section title="4. Privacidad y datos">
          Recopilamos únicamente los datos necesarios para el funcionamiento de la app (email, nombre, sesiones GPS, historias). No compartimos tu información con terceros para publicidad. Puedes eliminar tu cuenta y todos tus datos en cualquier momento desde tu perfil.
        </Section>

        <Section title="5. GPS y ubicación">
          El acceso a tu ubicación se usa exclusivamente para el registro de tus sesiones de paddling. Los tracks GPS se almacenan en tu perfil y son visibles solo para ti.
        </Section>

        <Section title="6. Responsabilidad del usuario">
          Al usar SUP Status eres responsable del contenido que publicas. No uses la app para actividades ilegales, spam o para acosar a otros usuarios.
        </Section>

        <Section title="7. Contacto">
          Si tienes dudas, preguntas o necesitas reportar un problema, contáctanos en: hectorguzmancortes@gmail.com
        </Section>

        <View style={{ height: 20 }} />
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <Text style={styles.footerNote}>
          Al tocar "Aceptar y continuar" confirmas que has leído y aceptas estos términos.
        </Text>
        <TouchableOpacity style={styles.acceptBtn} onPress={onAccept} activeOpacity={0.85}>
          <LinearGradient colors={['#0ea5e9', '#0284c7']} style={[StyleSheet.absoluteFill, { borderRadius: radius.lg }]} />
          <Text style={styles.acceptBtnText}>Aceptar y continuar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function Section({ title, children }: { title: string; children: string }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionBody}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  title: { fontSize: 28, fontWeight: '800', color: colors.textPrimary, marginBottom: 8 },
  subtitle: { fontSize: 14, color: colors.textMuted, lineHeight: 20 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  section: {
    backgroundColor: colors.surface1, borderRadius: radius.md,
    padding: spacing.md, marginBottom: spacing.sm,
    borderWidth: 1, borderColor: colors.border,
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.primary, marginBottom: 8 },
  sectionBody: { fontSize: 14, color: colors.textSecondary, lineHeight: 22 },
  footer: {
    paddingHorizontal: spacing.lg, paddingTop: spacing.md,
    borderTopWidth: 1, borderTopColor: colors.border,
    backgroundColor: colors.bg,
  },
  footerNote: { fontSize: 12, color: colors.textMuted, textAlign: 'center', marginBottom: spacing.sm, lineHeight: 18 },
  acceptBtn: { padding: 16, borderRadius: radius.lg, alignItems: 'center', overflow: 'hidden' },
  acceptBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});

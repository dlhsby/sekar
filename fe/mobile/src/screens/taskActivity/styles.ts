/**
 * Shared styles for TaskCreateScreen and components
 */

import { StyleSheet } from 'react-native';
import { nbColors, nbSpacing, nbBorders, nbRadius, nbShadows, withAlpha } from '../../constants/nbTokens';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: nbSpacing.md,
    paddingBottom: nbSpacing.md,
  },
  fab: {
    paddingHorizontal: nbSpacing.md,
    paddingVertical: nbSpacing.md,
  },
  fabButtonRow: {
    flexDirection: 'row',
    gap: nbSpacing.sm,
  },
  fabButtonHalf: {
    flex: 1,
  },
  card: {
    marginBottom: nbSpacing.md,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: nbSpacing.xs,
  },
  sectionTitleStyle: {},
  sectionSubtitle: {},
  fieldSpacer: {
    height: nbSpacing.sm,
  },
  fieldLabel: {
    fontWeight: '600',
    color: nbColors.black,
    marginBottom: nbSpacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  descriptionInput: {
    minHeight: 140,
  },
  optionButton: {
    padding: nbSpacing.md,
    borderRadius: nbRadius.base,
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.black,
    marginBottom: nbSpacing.sm,
    backgroundColor: nbColors.white,
  },
  optionButtonActive: {
    borderColor: nbColors.primary,
    backgroundColor: withAlpha(nbColors.primary, 0.1),
    ...nbShadows.sm,
  },
  optionText: {
    color: nbColors.black,
    textAlign: 'left',
  },
  optionTextActive: {
    color: nbColors.primary,
    fontWeight: '600',
  },
  clearButton: {
    marginTop: nbSpacing.sm,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: nbSpacing.md,
  },
  loadingText: {
    marginLeft: nbSpacing.sm,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: nbSpacing.lg,
  },
  emptyText: {},
  errorText: {
    color: nbColors.danger,
    fontWeight: '600',
    marginBottom: nbSpacing.sm,
  },
  requiredAsterisk: {
    color: nbColors.danger,
    fontWeight: '700',
  },
  errorSummary: {
    backgroundColor: withAlpha(nbColors.danger, 0.06),
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.danger,
    borderRadius: nbRadius.sm,
    padding: nbSpacing.sm,
    marginBottom: nbSpacing.md,
  },
  errorSummaryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: nbSpacing.xs,
  },
  errorSummaryTitle: {
    color: nbColors.danger,
  },
  errorSummaryItem: {
    color: nbColors.danger,
    marginTop: 2,
  },
});

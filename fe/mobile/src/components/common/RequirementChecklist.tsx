/**
 * RequirementChecklist — live rule list (e.g. password requirements on AS-5).
 * Each rule shows a sage check when met, an empty circle when not.
 * Mirrors the "SYARAT SANDI" box in design/project/hifi-mobile.html · AS-5.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { nbColors, nbBorders, nbRadius, nbSpacing } from '../../constants/nbTokens';
import { NBText } from '../nb';

export interface Requirement {
  label: string;
  met: boolean;
}

export interface RequirementChecklistProps {
  title?: string;
  rules: Requirement[];
  testID?: string;
}

export function RequirementChecklist({ title, rules, testID }: RequirementChecklistProps): React.JSX.Element {
  return (
    <View style={styles.root} testID={testID}>
      {title ? (
        <NBText variant="mono-sm" color="gray600" uppercase style={styles.title}>
          {title}
        </NBText>
      ) : null}
      {rules.map((rule) => (
        <View key={rule.label} style={styles.row}>
          <View style={[styles.bullet, rule.met ? styles.bulletMet : styles.bulletIdle]}>
            {rule.met ? <Text style={styles.check}>✓</Text> : null}
          </View>
          <NBText variant="body-sm" color={rule.met ? 'statusActive' : 'gray500'}>
            {rule.label}
          </NBText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: nbColors.bgSurface,
    borderWidth: nbBorders.widthThin,
    borderColor: nbColors.gray300,
    borderRadius: nbRadius.base,
    padding: nbSpacing.md,
    gap: nbSpacing.xs,
  },
  title: { letterSpacing: 0.6, marginBottom: nbSpacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: nbSpacing.sm },
  bullet: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: nbBorders.widthThin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bulletMet: { backgroundColor: nbColors.success, borderColor: nbColors.black },
  bulletIdle: { backgroundColor: nbColors.bgSurface, borderColor: nbColors.gray400 },
  check: { fontSize: 10, fontWeight: '800', color: nbColors.black, lineHeight: 12 },
});

export default RequirementChecklist;

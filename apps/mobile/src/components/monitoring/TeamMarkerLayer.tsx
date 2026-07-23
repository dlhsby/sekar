/**
 * TeamMarkerLayer
 * Renders one team-colored bubble per collapsed team (ADR-048) — the team name +
 * member count, in the team's marker color. Tapping selects the team; the screen
 * then reveals its members (as individual pins) and hides the other workers,
 * keeping the boundary/node markers on the map. Mirrors the web team bubble.
 *
 * tracksViewChanges freezes after first paint so the native bitmap is stable.
 */

import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Marker } from 'react-native-maps';
import { nbColors, nbBorders, nbRadius, nbShadows, withAlpha } from '../../constants/nbTokens';
import { NBText } from '../nb/NBText';
import type { TeamGroup } from '../../utils/teamGrouping';

interface TeamMarkerLayerProps {
  teams: TeamGroup[];
  onTeamPress: (team: TeamGroup) => void;
}

function TeamBubble({
  team,
  onPress,
}: {
  team: TeamGroup;
  onPress: (team: TeamGroup) => void;
}): React.JSX.Element | null {
  const [tracks, setTracks] = useState(true);
  useEffect(() => {
    const id = setTimeout(() => setTracks(false), 400);
    return () => clearTimeout(id);
  }, []);

  if (!Number.isFinite(team.latitude) || !Number.isFinite(team.longitude)) {
    return null;
  }
  const baseColor = team.team_color ?? nbColors.gray400;
  // The category's own `marker_opacity` (Master → Kategori Tim), so a category
  // set to 65% draws a translucent bubble here exactly as it does on web and in
  // the admin grid's swatch. Null → opaque, the same rule everywhere.
  //
  // Alpha goes on the COLOURS, not on the bubble View: a container `opacity`
  // would fade the team name and member count too, and a half-legible label is
  // not what an operator asked for when they tinted a category.
  const color =
    team.team_color && team.team_opacity != null
      ? withAlpha(baseColor, team.team_opacity)
      : baseColor;

  return (
    <Marker
      coordinate={{ latitude: team.latitude, longitude: team.longitude }}
      onPress={() => onPress(team)}
      tracksViewChanges={tracks}
      anchor={{ x: 0.5, y: 0.5 }}
      testID={`team-marker-${team.team_id}`}
    >
      <View style={[styles.bubble, { borderColor: color }]}>
        <View style={[styles.dot, { backgroundColor: color }]} />
        <NBText variant="caption" style={styles.name} numberOfLines={1}>
          {team.team_name}
        </NBText>
        <NBText variant="body-sm" style={styles.count}>
          {team.member_count}
        </NBText>
      </View>
    </Marker>
  );
}

export function TeamMarkerLayer({
  teams,
  onTeamPress,
}: TeamMarkerLayerProps): React.JSX.Element {
  return (
    <>
      {teams.map(team => (
        <TeamBubble key={`team-${team.team_id}`} team={team} onPress={onTeamPress} />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: 170,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: nbRadius.lg,
    borderWidth: nbBorders.widthThick,
    backgroundColor: nbColors.white,
    ...nbShadows.sm,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: nbRadius.full,
    borderWidth: 1,
    borderColor: nbColors.black,
    marginRight: 6,
  },
  name: {
    color: nbColors.black,
    fontWeight: '700',
    flexShrink: 1,
  },
  count: {
    color: nbColors.black,
    fontWeight: '800',
    marginLeft: 6,
  },
});

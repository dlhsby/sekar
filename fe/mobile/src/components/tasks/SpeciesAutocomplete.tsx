/**
 * Species Autocomplete Component
 * Debounced search for plant species with multi-select support
 * Phase 3 3-7
 */

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useAppDispatch, useAppSelector } from '../../store/store';
import { searchSpecies, selectSearchResults } from '../../store/slices/plantsSlice';
import type { PlantSpecies } from '../../types/models.types';
import { NBCardTextInput } from '../nb/NBCardTextInput';
import { NBText } from '../nb/NBText';
import { nbColors, nbSpacing, nbBorders, nbShadows } from '../../constants/nbTokens';

export interface SpeciesAutocompleteProps {
  /** Selected species for multi-select mode */
  selectedSpecies?: PlantSpecies[];
  /** Callback when selection changes (multi-select) */
  onSelectionChange?: (species: PlantSpecies[]) => void;
  /** Callback when single species selected (single-select) */
  onSelect?: (species: PlantSpecies) => void;
  /** Support multi-select (default: true) */
  multiSelect?: boolean;
  /** Placeholder text */
  placeholder?: string;
  /** Container style */
  style?: StyleProp<ViewStyle>;
}

const DEBOUNCE_DELAY_MS = 300;
const MAX_RESULTS = 10;

export function SpeciesAutocomplete({
  selectedSpecies = [],
  onSelectionChange,
  onSelect,
  multiSelect = true,
  placeholder = 'Cari spesies tanaman...',
  style,
}: SpeciesAutocompleteProps): React.JSX.Element {
  const dispatch = useAppDispatch();
  const searchResults = useAppSelector(selectSearchResults);

  const [searchInput, setSearchInput] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Debounced search: trigger every 300ms
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (searchInput.length < 1) {
      return;
    }

    debounceTimer.current = setTimeout(() => {
      dispatch(searchSpecies({ q: searchInput, limit: MAX_RESULTS }));
    }, DEBOUNCE_DELAY_MS);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [searchInput, dispatch]);

  // Handle species selection
  const handleSelectSpecies = useCallback(
    (species: PlantSpecies) => {
      if (multiSelect && onSelectionChange) {
        const isAlreadySelected = selectedSpecies.some(s => s.id === species.id);
        const updated = isAlreadySelected
          ? selectedSpecies.filter(s => s.id !== species.id)
          : [...selectedSpecies, species];
        onSelectionChange(updated);
      } else if (!multiSelect && onSelect) {
        onSelect(species);
        setSearchInput('');
        setIsOpen(false);
      }
    },
    [selectedSpecies, multiSelect, onSelectionChange, onSelect],
  );

  // Handle species removal (multi-select)
  const handleRemoveSpecies = useCallback(
    (speciesId: string) => {
      if (onSelectionChange) {
        const updated = selectedSpecies.filter(s => s.id !== speciesId);
        onSelectionChange(updated);
      }
    },
    [selectedSpecies, onSelectionChange],
  );

  // Render dropdown results
  const renderDropdown = useMemo(() => {
    if (!isOpen || searchInput.length < 1) {
      return null;
    }

    if (searchResults.length === 0) {
      return (
        <View
          style={[
            styles.dropdown,
            {
              backgroundColor: nbColors.background,
              borderColor: nbColors.borderMuted,
            },
          ]}
        >
          <NBText variant="body-sm" color="textMuted" align="center">
            Tidak ada hasil
          </NBText>
        </View>
      );
    }

    return (
      <View
        style={[
          styles.dropdown,
          {
            backgroundColor: nbColors.background,
            borderColor: nbColors.border,
          },
        ]}
      >
        <FlatList
          data={searchResults}
          keyExtractor={item => item.id}
          scrollEnabled={false}
          renderItem={({ item }) => {
            const isSelected = multiSelect
              ? selectedSpecies.some(s => s.id === item.id)
              : false;
            return (
              <TouchableOpacity
                onPress={() => handleSelectSpecies(item)}
                accessibilityLabel={`Pilih ${item.nameId}${item.nameLatin ? ` (${item.nameLatin})` : ''}`}
                accessibilityRole="button"
                activeOpacity={0.7}
                style={[
                  styles.resultItem,
                  isSelected && {
                    backgroundColor: nbColors.backgroundHover,
                  },
                ]}
              >
                <View style={styles.resultContent}>
                  <NBText
                    variant="body-sm"
                    color={isSelected ? 'accent' : 'text'}
                    style={styles.resultName}
                  >
                    {item.nameId}
                  </NBText>
                  {item.nameLatin && (
                    <NBText variant="caption" color="textMuted">
                      {item.nameLatin}
                    </NBText>
                  )}
                </View>
              </TouchableOpacity>
            );
          }}
        />
      </View>
    );
  }, [isOpen, searchInput, searchResults, selectedSpecies, multiSelect, handleSelectSpecies]);

  // Render selected species chips (multi-select)
  const selectedChips = useMemo(() => {
    if (!multiSelect || selectedSpecies.length === 0) {
      return null;
    }

    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipsContainer}
        contentContainerStyle={styles.chipsContent}
      >
        {selectedSpecies.map(species => (
          <View
            key={species.id}
            style={[
              styles.chip,
              {
                backgroundColor: nbColors.backgroundAlt,
                borderColor: nbColors.border,
              },
            ]}
          >
            <NBText variant="body-sm" color="text">
              {species.nameId}
            </NBText>
            <TouchableOpacity
              onPress={() => handleRemoveSpecies(species.id)}
              accessibilityLabel={`Hapus ${species.nameId}`}
              accessibilityRole="button"
              style={styles.chipRemove}
            >
              <NBText variant="body-sm" color="accent">
                ×
              </NBText>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    );
  }, [multiSelect, selectedSpecies, handleRemoveSpecies]);

  return (
    <View style={[styles.container, style]}>
      {selectedChips}
      <NBCardTextInput
        placeholder={placeholder}
        value={searchInput}
        onChangeText={setSearchInput}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setTimeout(() => setIsOpen(false), 200)}
        editable={true}
        accessibilityLabel="Pencarian spesies tanaman"
      />
      {renderDropdown}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  chipsContainer: {
    marginBottom: nbSpacing.sm,
  },
  chipsContent: {
    paddingHorizontal: nbSpacing.base,
    gap: nbSpacing.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: nbSpacing.sm,
    paddingVertical: nbSpacing.xs,
    borderWidth: 1,
    borderRadius: nbBorders.sm,
    gap: nbSpacing.xs,
  },
  chipRemove: {
    padding: 4,
  },
  dropdown: {
    marginTop: nbSpacing.xs,
    borderWidth: 1,
    borderRadius: nbBorders.sm,
    maxHeight: 240,
    overflow: 'hidden',
    ...nbShadows.sm,
  },
  resultItem: {
    paddingHorizontal: nbSpacing.base,
    paddingVertical: nbSpacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: nbColors.borderMuted,
  },
  resultContent: {
    gap: nbSpacing.xs,
  },
  resultName: {
    fontWeight: '500',
  },
});

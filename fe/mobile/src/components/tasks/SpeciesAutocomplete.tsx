import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  Text,
  StyleSheet,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { searchSpecies } from '../../store/slices/plantsSlice';
import { PlantSpecies } from '../../types/models.types';
import { nbColors, nbSpacing, nbShadows, nbType, nbRadius } from '../../constants/generated/tokens';

interface SpeciesAutocompleteProps {
  multi?: boolean;
  value: PlantSpecies[];
  onChange: (species: PlantSpecies[]) => void;
  placeholder?: string;
  style?: any;
  testID?: string;
  areaId?: string;
}

/**
 * Custom hook for debounced search input
 */
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

/**
 * SpeciesAutocomplete component for selecting plant species
 * Supports both single and multi-select modes with debounced search
 */
export const SpeciesAutocomplete: React.FC<SpeciesAutocompleteProps> = ({
  multi = false,
  value,
  onChange,
  placeholder,
  style,
  testID,
  areaId: _areaId,
}) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const [searchInput, setSearchInput] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const defaultPlaceholder = placeholder || t('tasks:species.placeholder');

  const debouncedSearch = useDebounce(searchInput, 300);
  const searchResults = useAppSelector((state) => state.plants.searchResults);
  const isLoading = useAppSelector((state) => state.plants.isLoadingSearch);

  // Trigger search when debounced value changes
  useEffect(() => {
    if (debouncedSearch.trim().length > 0) {
      dispatch(searchSpecies({ q: debouncedSearch, limit: 20 }));
      setShowDropdown(true);
    } else {
      setShowDropdown(false);
    }
  }, [debouncedSearch, dispatch]);

  const handleSpeciesSelect = useCallback(
    (species: PlantSpecies) => {
      if (multi) {
        const alreadySelected = value.some((s) => s.id === species.id);
        if (alreadySelected) {
          onChange(value.filter((s) => s.id !== species.id));
        } else {
          onChange([...value, species]);
        }
        setSearchInput('');
      } else {
        onChange([species]);
        setSearchInput('');
        setShowDropdown(false);
        Keyboard.dismiss();
      }
    },
    [value, onChange, multi]
  );

  const handleRemoveChip = useCallback(
    (speciesId: string) => {
      onChange(value.filter((s) => s.id !== speciesId));
    },
    [value, onChange]
  );

  const handleClearSearch = useCallback(() => {
    setSearchInput('');
    setShowDropdown(false);
    inputRef.current?.focus();
  }, []);

  const filteredResults = useMemo(() => {
    if (!searchResults) return [];
    // Filter out already selected species in multi mode
    if (multi) {
      const selectedIds = new Set(value.map((s) => s.id));
      return searchResults.filter((s) => !selectedIds.has(s.id));
    }
    return searchResults;
  }, [searchResults, value, multi]);

  return (
    <View style={[styles.container, style]} testID={testID}>
      {/* Selected species chips (multi-mode only) */}
      {multi && value.length > 0 && (
        <View
          style={styles.chipsContainer}
          accessible={true}
          accessibilityRole="list"
          accessibilityLabel={t('tasks:species.selectedLabel')}
        >
          {value.map((species) => (
            <View
              key={species.id}
              style={styles.chip}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={t('tasks:species.chipLabel', { name: species.nameId })}
            >
              <Text
                style={styles.chipText}
                numberOfLines={1}
              >
                {species.nameId}
              </Text>
              <TouchableOpacity
                onPress={() => handleRemoveChip(species.id)}
                style={styles.chipRemoveButton}
                accessibilityLabel={t('common:actions.delete')}
                accessibilityRole="button"
                testID={`chip-remove-${species.id}`}
              >
                <Text style={styles.chipRemoveIcon}>×</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Search input */}
      <View style={styles.inputContainer}>
        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholder={defaultPlaceholder}
          placeholderTextColor={nbColors.gray50}
          value={searchInput}
          onChangeText={setSearchInput}
          onFocus={() => searchInput.trim().length > 0 && setShowDropdown(true)}
          editable={!isLoading}
          accessibilityLabel={t('tasks:species.searchLabel')}
          accessibilityHint={t('tasks:species.searchHint')}
          accessibilityRole="search"
          testID={`${testID}-input`}
        />
        {searchInput.length > 0 && (
          <TouchableOpacity
            onPress={handleClearSearch}
            style={styles.clearButton}
            accessibilityLabel={t('tasks:species.clearLabel')}
            accessibilityRole="button"
            testID={`${testID}-clear`}
          >
            <Text style={styles.clearIcon}>×</Text>
          </TouchableOpacity>
        )}
        {isLoading && (
          <ActivityIndicator
            size="small"
            color={nbColors.primary}
            style={styles.loader}
            testID={`${testID}-loader`}
          />
        )}
      </View>

      {/* Results dropdown */}
      {showDropdown && !isLoading && filteredResults.length === 0 && searchInput.trim() && (
        <View style={styles.emptyMessage}>
          <Text style={styles.emptyMessageText}>
            {t('tasks:species.noResults', { query: searchInput })}
          </Text>
        </View>
      )}

      {showDropdown && filteredResults.length > 0 && (
        <View style={styles.dropdown}>
          <FlatList
            data={filteredResults}
            keyExtractor={(item) => item.id}
            scrollEnabled={filteredResults.length > 5}
            nestedScrollEnabled={false}
            renderItem={({ item }) => {
              const isSelected = value.some((s) => s.id === item.id);
              return (
                <TouchableOpacity
                  onPress={() => handleSpeciesSelect(item)}
                  style={[styles.resultItem, isSelected && styles.resultItemSelected]}
                  accessibilityLabel={t('tasks:species.selectLabel', { name: item.nameId })}
                  accessibilityHint={item.nameLatin ? t('tasks:species.latinHint', { latin: item.nameLatin }) : undefined}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  testID={`result-${item.id}`}
                >
                  {multi && (
                    <View
                      style={[
                        styles.checkbox,
                        isSelected && styles.checkboxSelected,
                      ]}
                    >
                      {isSelected && <Text style={styles.checkmark}>✓</Text>}
                    </View>
                  )}
                  <View style={styles.resultContent}>
                    <Text style={styles.resultPrimary}>{item.nameId}</Text>
                    {item.nameLatin && (
                      <Text style={styles.resultSecondary}>{item.nameLatin}</Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            }}
            scrollIndicatorInsets={{ right: 1 }}
            testID={`${testID}-results`}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: nbSpacing.xs,
    marginBottom: nbSpacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: nbColors.primary,
    paddingHorizontal: nbSpacing.sm,
    paddingVertical: nbSpacing.xs,
    borderRadius: nbRadius.sm,
    borderWidth: 1,
    borderColor: nbColors.primary,
  },
  chipText: {
    color: nbColors.white,
    fontSize: 13,
    fontFamily: nbType.body.fontFamily,
    fontWeight: '500',
    marginRight: nbSpacing.xs,
    maxWidth: 120,
  },
  chipRemoveButton: {
    padding: nbSpacing.xs,
    minWidth: 24,
    minHeight: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipRemoveIcon: {
    color: nbColors.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  inputContainer: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: nbColors.gray300,
    borderRadius: nbRadius.sm,
    backgroundColor: nbColors.white,
    paddingHorizontal: nbSpacing.sm,
    minHeight: 44,
  },
  input: {
    flex: 1,
    height: 44,
    fontSize: 14,
    fontFamily: nbType.body.fontFamily,
    color: nbColors.black,
  },
  clearButton: {
    padding: nbSpacing.xs,
    minWidth: 32,
    minHeight: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearIcon: {
    color: nbColors.gray50,
    fontSize: 20,
    fontWeight: 'bold',
  },
  loader: {
    marginLeft: nbSpacing.xs,
  },
  dropdown: {
    marginTop: nbSpacing.xs,
    borderWidth: 1,
    borderColor: nbColors.gray300,
    borderRadius: nbRadius.sm,
    backgroundColor: nbColors.white,
    maxHeight: 250,
    ...nbShadows.sm,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: nbSpacing.sm,
    paddingVertical: nbSpacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: nbColors.gray300,
  },
  resultItemSelected: {
    backgroundColor: nbColors.gray100,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1,
    borderColor: nbColors.gray50,
    borderRadius: 2,
    marginRight: nbSpacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: nbColors.primary,
    borderColor: nbColors.primary,
  },
  checkmark: {
    color: nbColors.white,
    fontSize: 14,
    fontWeight: 'bold',
  },
  resultContent: {
    flex: 1,
  },
  resultPrimary: {
    fontSize: 14,
    fontFamily: nbType.body.fontFamily,
    fontWeight: '500',
    color: nbColors.black,
  },
  resultSecondary: {
    fontSize: 12,
    fontFamily: nbType.body.fontFamily,
    fontStyle: 'italic',
    color: nbColors.gray50,
    marginTop: 2,
  },
  emptyMessage: {
    paddingHorizontal: nbSpacing.sm,
    paddingVertical: nbSpacing.md,
    alignItems: 'center',
  },
  emptyMessageText: {
    fontSize: 13,
    fontFamily: nbType.body.fontFamily,
    color: nbColors.gray50,
    textAlign: 'center',
  },
});

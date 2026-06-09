/**
 * NBDatePicker Component
 * Pure-JS Neo Brutalism date/time picker — no native dependencies.
 * Opens a modal with scrollable year/month/day or hour/minute columns.
 */

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  Dimensions,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  nbColors,
  nbSpacing,
  nbType,
  nbBorders,
} from '../../constants/nbTokens';

export interface NBDatePickerProps {
  value: Date | null;
  onChange: (date: Date) => void;
  label?: string;
  placeholder?: string;
  mode?: 'date' | 'time';
  minimumDate?: Date;
  maximumDate?: Date;
  disabled?: boolean;
  /**
   * Controlled-modal mode. When true, the inline trigger button is NOT rendered
   * and the parent owns visibility via `visible` + `onRequestClose`.
   * Use this when you want a custom trigger (e.g. a date label inside another
   * UI) but still want to reuse this picker's modal.
   */
  triggerless?: boolean;
  /** Required when triggerless. Controls whether the picker modal is shown. */
  visible?: boolean;
  /** Called when the user dismisses (Batal, OK, hardware back, scrim tap). */
  onRequestClose?: () => void;
}

const ITEM_HEIGHT = 44;
const VISIBLE_ITEMS = 5;
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

function formatDateDisplay(date: Date): string {
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatTimeDisplay(date: Date): string {
  return date.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des',
];

// --- ScrollColumn component ---

interface ScrollColumnProps {
  items: { value: number; label: string }[];
  selectedValue: number;
  onSelect: (value: number) => void;
  width: number;
}

function ScrollColumn({ items, selectedValue, onSelect, width }: ScrollColumnProps) {
  const flatListRef = useRef<FlatList>(null);
  const initialScrollDone = useRef(false);

  const selectedIndex = useMemo(
    () => Math.max(0, items.findIndex(i => i.value === selectedValue)),
    [items, selectedValue],
  );

  useEffect(() => {
    if (!initialScrollDone.current && items.length > 0) {
      initialScrollDone.current = true;
      setTimeout(() => {
        flatListRef.current?.scrollToOffset({
          offset: selectedIndex * ITEM_HEIGHT,
          animated: false,
        });
      }, 50);
    }
  }, [selectedIndex, items.length]);

  const handleMomentumEnd = useCallback(
    (e: { nativeEvent: { contentOffset: { y: number } } }) => {
      const index = Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT);
      const clamped = Math.max(0, Math.min(index, items.length - 1));
      if (items[clamped]) {
        onSelect(items[clamped].value);
      }
    },
    [items, onSelect],
  );

  const renderItem = useCallback(
    ({ item }: { item: { value: number; label: string } }) => {
      const isSelected = item.value === selectedValue;
      return (
        <TouchableOpacity
          style={[styles.wheelItem, { width, height: ITEM_HEIGHT }]}
          onPress={() => {
            onSelect(item.value);
            const idx = items.findIndex(i => i.value === item.value);
            flatListRef.current?.scrollToOffset({
              offset: idx * ITEM_HEIGHT,
              animated: true,
            });
          }}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.wheelText,
              isSelected && styles.wheelTextSelected,
            ]}
          >
            {item.label}
          </Text>
        </TouchableOpacity>
      );
    },
    [selectedValue, items, onSelect, width],
  );

  const paddingItems = Math.floor(VISIBLE_ITEMS / 2);

  return (
    <View style={[styles.columnContainer, { width, height: PICKER_HEIGHT }]}>
      <View style={styles.selectionIndicator} />
      <FlatList
        ref={flatListRef}
        data={items}
        renderItem={renderItem}
        keyExtractor={item => String(item.value)}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        onMomentumScrollEnd={handleMomentumEnd}
        contentContainerStyle={{
          paddingVertical: paddingItems * ITEM_HEIGHT,
        }}
        getItemLayout={(_, index) => ({
          length: ITEM_HEIGHT,
          offset: ITEM_HEIGHT * index,
          index,
        })}
      />
    </View>
  );
}

// --- Main NBDatePicker ---

export function NBDatePicker({
  value,
  onChange,
  label,
  placeholder,
  mode = 'date',
  minimumDate,
  maximumDate,
  disabled = false,
  triggerless = false,
  visible: controlledVisible,
  onRequestClose,
}: NBDatePickerProps): React.JSX.Element {
  const [internalVisible, setInternalVisible] = useState(false);
  const modalVisible = triggerless ? !!controlledVisible : internalVisible;
  const setModalVisible = useCallback(
    (next: boolean) => {
      if (triggerless) {
        if (!next) { onRequestClose?.(); }
      } else {
        setInternalVisible(next);
      }
    },
    [triggerless, onRequestClose],
  );

  const now = new Date();
  const current = value ?? now;

  const [tempYear, setTempYear] = useState(current.getFullYear());
  const [tempMonth, setTempMonth] = useState(current.getMonth());
  const [tempDay, setTempDay] = useState(current.getDate());
  const [tempHour, setTempHour] = useState(current.getHours());
  const [tempMinute, setTempMinute] = useState(current.getMinutes());

  const defaultPlaceholder = mode === 'date' ? 'Pilih tanggal' : 'Pilih waktu';
  const iconName = mode === 'date' ? 'calendar-outline' : 'clock-outline';

  const displayValue = value
    ? mode === 'date'
      ? formatDateDisplay(value)
      : formatTimeDisplay(value)
    : placeholder ?? defaultPlaceholder;

  const handleOpen = useCallback(() => {
    if (disabled) return;
    const d = value ?? new Date();
    setTempYear(d.getFullYear());
    setTempMonth(d.getMonth());
    setTempDay(d.getDate());
    setTempHour(d.getHours());
    setTempMinute(d.getMinutes());
    setModalVisible(true);
  }, [disabled, value, setModalVisible]);

  // In triggerless mode the parent flips `visible` directly — sync temp state
  // from the latest `value` whenever the modal opens, mirroring handleOpen.
  useEffect(() => {
    if (triggerless && controlledVisible) {
      const d = value ?? new Date();
      setTempYear(d.getFullYear());
      setTempMonth(d.getMonth());
      setTempDay(d.getDate());
      setTempHour(d.getHours());
      setTempMinute(d.getMinutes());
    }
  }, [triggerless, controlledVisible, value]);

  const handleToday = useCallback(() => {
    if (mode !== 'date') { return; }
    const today = new Date();
    const constrained =
      (minimumDate && today < minimumDate) ? minimumDate :
      (maximumDate && today > maximumDate) ? maximumDate :
      today;
    onChange(constrained);
    setModalVisible(false);
  }, [mode, minimumDate, maximumDate, onChange, setModalVisible]);

  const handleConfirm = useCallback(() => {
    if (mode === 'date') {
      const maxDay = getDaysInMonth(tempYear, tempMonth);
      const day = Math.min(tempDay, maxDay);
      const result = new Date(tempYear, tempMonth, day);
      if (minimumDate && result < minimumDate) {
        onChange(minimumDate);
      } else if (maximumDate && result > maximumDate) {
        onChange(maximumDate);
      } else {
        onChange(result);
      }
    } else {
      const result = new Date();
      result.setHours(tempHour, tempMinute, 0, 0);
      onChange(result);
    }
    setModalVisible(false);
  }, [mode, tempYear, tempMonth, tempDay, tempHour, tempMinute, minimumDate, maximumDate, onChange, setModalVisible]);

  const handleCancel = useCallback(() => {
    setModalVisible(false);
  }, [setModalVisible]);

  // Generate picker data
  const minYear = minimumDate?.getFullYear() ?? now.getFullYear() - 5;
  const maxYear = maximumDate?.getFullYear() ?? now.getFullYear() + 5;

  const yearItems = useMemo(() => {
    const items = [];
    for (let y = minYear; y <= maxYear; y++) {
      items.push({ value: y, label: String(y) });
    }
    return items;
  }, [minYear, maxYear]);

  const monthItems = useMemo(
    () => MONTHS.map((m, i) => ({ value: i, label: m })),
    [],
  );

  const dayItems = useMemo(() => {
    const days = getDaysInMonth(tempYear, tempMonth);
    return Array.from({ length: days }, (_, i) => ({
      value: i + 1,
      label: String(i + 1),
    }));
  }, [tempYear, tempMonth]);

  const hourItems = useMemo(
    () => Array.from({ length: 24 }, (_, i) => ({
      value: i,
      label: String(i).padStart(2, '0'),
    })),
    [],
  );

  const minuteItems = useMemo(
    () => Array.from({ length: 60 }, (_, i) => ({
      value: i,
      label: String(i).padStart(2, '0'),
    })),
    [],
  );

  const screenWidth = Dimensions.get('window').width;
  const modalWidth = Math.min(screenWidth - 48, 340);
  const dateColWidth = Math.floor((modalWidth - 32) / 3);
  const timeColWidth = Math.floor((modalWidth - 32) / 2);

  return (
    <View>
      {!triggerless && (
      <TouchableOpacity
        style={[styles.trigger, disabled && styles.triggerDisabled]}
        onPress={handleOpen}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={label ?? defaultPlaceholder}
      >
        <MaterialCommunityIcons
          name={iconName}
          size={18}
          color={disabled ? nbColors.gray400 : nbColors.primary}
          style={styles.icon}
        />
        <View style={styles.textContainer}>
          {label && <Text style={styles.label}>{label}</Text>}
          <Text
            style={[
              styles.value,
              !value && styles.placeholder,
              disabled && styles.valueDisabled,
            ]}
            numberOfLines={1}
          >
            {displayValue}
          </Text>
        </View>
      </TouchableOpacity>
      )}

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={handleCancel}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={handleCancel}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={[styles.modalContent, { width: modalWidth }]}
            onPress={() => {}}
          >
            <Text style={styles.modalTitle}>
              {mode === 'date' ? 'Pilih Tanggal' : 'Pilih Waktu'}
            </Text>

            <View style={styles.columnsRow}>
              {mode === 'date' ? (
                <>
                  <ScrollColumn
                    items={dayItems}
                    selectedValue={tempDay}
                    onSelect={setTempDay}
                    width={dateColWidth}
                  />
                  <ScrollColumn
                    items={monthItems}
                    selectedValue={tempMonth}
                    onSelect={setTempMonth}
                    width={dateColWidth}
                  />
                  <ScrollColumn
                    items={yearItems}
                    selectedValue={tempYear}
                    onSelect={setTempYear}
                    width={dateColWidth}
                  />
                </>
              ) : (
                <>
                  <ScrollColumn
                    items={hourItems}
                    selectedValue={tempHour}
                    onSelect={setTempHour}
                    width={timeColWidth}
                  />
                  <Text style={styles.timeSeparator}>:</Text>
                  <ScrollColumn
                    items={minuteItems}
                    selectedValue={tempMinute}
                    onSelect={setTempMinute}
                    width={timeColWidth}
                  />
                </>
              )}
            </View>

            <View style={styles.buttonRow}>
              {mode === 'date' ? (
                <TouchableOpacity style={styles.todayButton} onPress={handleToday}>
                  <Text style={styles.todayButtonText}>Hari ini</Text>
                </TouchableOpacity>
              ) : <View />}
              <View style={styles.buttonRowRight}>
                <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
                  <Text style={styles.cancelButtonText}>Batal</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
                  <Text style={styles.confirmButtonText}>OK</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: nbSpacing.sm,
    paddingHorizontal: nbSpacing.sm,
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.black,
    backgroundColor: nbColors.white,
    minHeight: 54,
    gap: nbSpacing.xs,
  },
  triggerDisabled: {
    backgroundColor: nbColors.gray100,
    opacity: 0.7,
  },
  icon: {
    flexShrink: 0,
  },
  textContainer: {
    flex: 1,
  },
  label: {
    fontSize: nbType.caption.fontSize,
    fontWeight: nbType.bodyLg.fontWeight,
    color: nbColors.gray500,
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  value: {
    fontSize: nbType.bodySm.fontSize,
    fontWeight: nbType.h2.fontWeight,
    color: nbColors.black,
  },
  placeholder: {
    color: nbColors.gray400,
    fontWeight: nbType.body.fontWeight,
  },
  valueDisabled: {
    color: nbColors.gray500,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: nbColors.white,
    borderWidth: nbBorders.widthThick,
    borderColor: nbColors.black,
    padding: nbSpacing.md,
  },
  modalTitle: {
    fontSize: nbType.bodyLg.fontSize,
    fontWeight: nbType.h1.fontWeight,
    color: nbColors.black,
    textAlign: 'center',
    marginBottom: nbSpacing.md,
  },
  columnsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  columnContainer: {
    overflow: 'hidden',
  },
  selectionIndicator: {
    position: 'absolute',
    top: ITEM_HEIGHT * Math.floor(VISIBLE_ITEMS / 2),
    left: 4,
    right: 4,
    height: ITEM_HEIGHT,
    backgroundColor: nbColors.primary + '20',
    borderWidth: 2,
    borderColor: nbColors.primary,
    zIndex: -1,
  },
  wheelItem: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  wheelText: {
    fontSize: nbType.body.fontSize,
    color: nbColors.gray400,
  },
  wheelTextSelected: {
    color: nbColors.black,
    fontWeight: nbType.h1.fontWeight,
    fontSize: nbType.bodyLg.fontSize,
  },
  timeSeparator: {
    fontSize: 24,
    fontWeight: nbType.h1.fontWeight,
    color: nbColors.black,
    marginHorizontal: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: nbSpacing.md,
  },
  buttonRowRight: {
    flexDirection: 'row',
    gap: nbSpacing.sm,
  },
  todayButton: {
    paddingVertical: nbSpacing.sm,
    paddingHorizontal: nbSpacing.sm,
  },
  todayButtonText: {
    fontSize: nbType.body.fontSize,
    fontWeight: nbType.h2.fontWeight,
    color: nbColors.primary,
  },
  cancelButton: {
    paddingVertical: nbSpacing.sm,
    paddingHorizontal: nbSpacing.md,
  },
  cancelButtonText: {
    fontSize: nbType.body.fontSize,
    fontWeight: nbType.h2.fontWeight,
    color: nbColors.gray500,
  },
  confirmButton: {
    paddingVertical: nbSpacing.sm,
    paddingHorizontal: nbSpacing.lg,
    backgroundColor: nbColors.primary,
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.black,
  },
  confirmButtonText: {
    fontSize: nbType.body.fontSize,
    fontWeight: nbType.h1.fontWeight,
    color: nbColors.black,
  },
});

/**
 * Generic region picker — used for both state and HUC-06 selection.
 * Accepts a list of items (states or HUC-6 basins) and renders a scrollable
 * list with an "All" option at the top.
 */
import React from 'react';
import { StyleSheet, View, Text, Pressable, ScrollView } from 'react-native';
import { COLORS, SPACING, RADIUS } from '../constants/theme';

export interface RegionItem {
  code: string;
  name: string;
  color: string;
  count: number;
}

interface Props {
  items: RegionItem[];
  selected: string | 'all';
  allLabel: string;       // e.g. "All New England" or "All States"
  allCount: number;
  onSelect: (code: string | 'all') => void;
}

export default function BasinPicker({
  items,
  selected,
  allLabel,
  allCount,
  onSelect,
}: Props) {
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Pressable
        style={[styles.item, selected === 'all' && styles.itemSelected]}
        onPress={() => onSelect('all')}
      >
        <View style={[styles.colorDot, { backgroundColor: COLORS.primary }]} />
        <View style={styles.itemContent}>
          <Text style={[styles.name, selected === 'all' && styles.nameSelected]}>
            {allLabel}
          </Text>
          <Text style={styles.count}>{allCount} watersheds</Text>
        </View>
        {selected === 'all' && <View style={styles.checkmark} />}
      </Pressable>

      {items.map((item) => {
        if (item.count === 0) return null;
        const isSelected = selected === item.code;
        return (
          <Pressable
            key={item.code}
            style={[styles.item, isSelected && styles.itemSelected]}
            onPress={() => onSelect(item.code)}
          >
            <View style={[styles.colorDot, { backgroundColor: item.color }]} />
            <View style={styles.itemContent}>
              <Text style={[styles.name, isSelected && styles.nameSelected]}>
                {item.name}
              </Text>
              <Text style={styles.count}>{item.count} watersheds</Text>
            </View>
            {isSelected && <View style={styles.checkmark} />}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    maxHeight: 300,
  },
  content: {
    gap: SPACING.xs,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm + 2,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
  },
  itemSelected: {
    backgroundColor: COLORS.primary + '22',
    borderWidth: 1,
    borderColor: COLORS.primary + '66',
  },
  colorDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginRight: SPACING.sm,
  },
  itemContent: {
    flex: 1,
  },
  name: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '500',
  },
  nameSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  count: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 1,
  },
  checkmark: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
});

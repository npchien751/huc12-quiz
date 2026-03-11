import React from 'react';
import { StyleSheet, View, Text, Pressable, ScrollView } from 'react-native';
import { BASINS } from '../constants/basins';
import { COLORS, SPACING, RADIUS } from '../constants/theme';
import { getAllWatersheds, getWatershedsByBasin } from '../lib/geo-utils';

interface Props {
  selected: string | 'all';
  onSelect: (basin: string | 'all') => void;
}

export default function BasinPicker({ selected, onSelect }: Props) {
  const totalCount = getAllWatersheds().length;

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
            All Connecticut
          </Text>
          <Text style={styles.count}>{totalCount} watersheds</Text>
        </View>
        {selected === 'all' && <View style={styles.checkmark} />}
      </Pressable>

      {BASINS.map((basin) => {
        const count = getWatershedsByBasin(basin.code).length;
        if (count === 0) return null;
        const isSelected = selected === basin.code;

        return (
          <Pressable
            key={basin.code}
            style={[styles.item, isSelected && styles.itemSelected]}
            onPress={() => onSelect(basin.code)}
          >
            <View style={[styles.colorDot, { backgroundColor: basin.color }]} />
            <View style={styles.itemContent}>
              <Text style={[styles.name, isSelected && styles.nameSelected]}>
                {basin.name}
              </Text>
              <Text style={styles.count}>{count} watersheds</Text>
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

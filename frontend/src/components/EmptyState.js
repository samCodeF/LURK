/**
 * Empty State Component - Placeholder for Empty Lists
 * Shows icon, title, message, and optional action button
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import {
  Title,
  Paragraph,
  Button,
  Surface,
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunity';
import { useTheme } from 'react-native-paper';

const EmptyState = ({
  icon = 'information-outline',
  title = 'No Data Found',
  message = 'There is nothing to display here.',
  actionLabel = 'Add Item',
  onAction,
  iconColor,
  style = {},
}) => {
  const { colors } = useTheme();

  return (
    <Surface style={[styles.container, { backgroundColor: colors.background }, style]}>
      <Icon
        name={icon}
        size={64}
        color={iconColor || colors.placeholder || '#CCCCCC'}
        style={styles.icon}
      />

      <Title style={[styles.title, { color: colors.text }]}>
        {title}
      </Title>

      <Paragraph style={[styles.message, { color: colors.placeholder || '#666' }]}>
        {message}
      </Paragraph>

      {onAction && (
        <TouchableOpacity onPress={onAction} style={styles.actionButton}>
          <Icon name="plus" size={20} color="#FFFFFF" style={styles.actionIcon} />
          <Button
            mode="contained"
            onPress={onAction}
            style={[styles.actionTextButton, { backgroundColor: colors.primary }]}
          >
            {actionLabel}
          </Button>
        </TouchableOpacity>
      )}
    </Surface>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    borderRadius: 12,
    margin: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  icon: {
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
    maxWidth: 300,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionIcon: {
    marginRight: 8,
  },
  actionTextButton: {
    borderRadius: 8,
  },
});

export default EmptyState;
/**
 * Cards Screen - Credit Card Management
 * Credit card listing and management for Lurk App
 */

import React from 'react';
import {View, Text, StyleSheet, FlatList} from 'react-native';
import {Card, Button, FAB} from 'react-native-paper';

import IconComponent from '../components/IconComponent';
import {CreditCardIcons, BankIcons} from '../constants/icons';
import {colors} from '../constants/theme';

const CardsScreen = () => {
  const mockCards = [
    {
      id: 1,
      bank: 'HDFC',
      last4: '1234',
      limit: '200,000',
      used: '45,000',
      dueDate: '15 Dec 2023',
      minDue: '1,500',
      autoPay: true,
    },
    {
      id: 2,
      bank: 'ICICI',
      last4: '5678',
      limit: '150,000',
      used: '78,000',
      dueDate: '20 Dec 2023',
      minDue: '2,340',
      autoPay: true,
    },
  ];

  const renderCard = ({item}) => (
    <Card style={styles.cardCard}>
      <Card.Content>
        <View style={styles.cardHeader}>
          <View style={styles.cardInfo}>
            <Text style={styles.bankName}>{item.bank}</Text>
            <Text style={styles.cardNumber}>•••• {item.last4}</Text>
          </View>
          <IconComponent
            {...CreditCardIcons.autoPay}
            color={item.autoPay ? colors.success : colors.textSecondary}
          />
        </View>

        <View style={styles.cardDetails}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Used/Limit</Text>
            <Text style={styles.detailValue}>
              ₹{item.used} / ₹{item.limit}
            </Text>
          </View>

          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Due Date</Text>
            <Text style={styles.detailValue}>{item.dueDate}</Text>
          </View>

          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Min Due</Text>
            <Text style={[styles.detailValue, styles.minDue]}>
              ₹{item.minDue}
            </Text>
          </View>
        </View>

        <View style={styles.cardActions}>
          <Button
            mode="outlined"
            onPress={() => console.log('Edit card', item.id)}
            style={styles.actionButton}
            icon={() => <IconComponent {...CreditCardIcons.edit} />}>
            Edit
          </Button>
          <Button
            mode="contained"
            onPress={() => console.log('Pay Now', item.id)}
            style={styles.actionButton}
            icon={() => <IconComponent {...CreditCardIcons.payment} />}>
            Pay Now
          </Button>
        </View>
      </Card.Content>
    </Card>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Credit Cards</Text>
        <IconComponent
          {...HeaderIcons.add}
          onPress={() => console.log('Add new card')}
        />
      </View>

      <FlatList
        data={mockCards}
        renderItem={renderCard}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />

      <FAB
        icon={() => <IconComponent {...CreditCardIcons.add} />}
        style={styles.fab}
        onPress={() => console.log('Add new card')}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  list: {
    padding: 16,
  },
  cardCard: {
    marginBottom: 16,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardInfo: {
    flex: 1,
  },
  bankName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  cardNumber: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  cardDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  detailItem: {
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
  },
  minDue: {
    color: colors.error,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: colors.primary,
  },
});

export default CardsScreen;
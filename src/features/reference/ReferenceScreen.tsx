import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {AppTheme} from '../../theme/appTheme';

const ReferenceScreen: React.FC = () => {
  return (
    <View style={AppTheme.container}>
      <View style={styles.content}>
        <Text style={AppTheme.heading}>Reference</Text>
        <Text style={AppTheme.textSecondary}>Reference Screen - Coming Soon</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ReferenceScreen;


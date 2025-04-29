import React from 'react';
import { Modal, View, StyleSheet } from 'react-native';
import ParserView from './Parser';
import { List } from '../../classes/List';

interface ParserModalProps {
  visible: boolean;
  onClose: () => void;
  list: List;
}

const ParserModal: React.FC<ParserModalProps> = ({ visible, onClose, list }) => {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <ParserView
        visible={visible}
        onDismiss={onClose}
        list={list}
      />
    </Modal>
  );
};

export default ParserModal; 
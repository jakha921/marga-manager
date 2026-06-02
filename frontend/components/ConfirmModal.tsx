import React from 'react';
import Modal from './Modal';
import Button from './Button';
import { useLanguage } from '../context/LanguageContext';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'warning';
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({ isOpen, title, message, onConfirm, onCancel, variant = 'danger' }) => {
  const { t } = useLanguage();
  return (
    <Modal isOpen={isOpen} onClose={onCancel} title={title}>
      <p className="text-[var(--text-secondary)] text-sm mb-6">{message}</p>
      <div className="flex gap-3 justify-end">
        <Button variant="secondary" onClick={onCancel}>{t('common.cancel')}</Button>
        <Button variant={variant} onClick={onConfirm}>{t('common.delete')}</Button>
      </div>
    </Modal>
  );
};

export default ConfirmModal;

import { useEffect, useState } from 'react';
import { StyleSheet, TextInput } from 'react-native';
import { themed, useColors, useSheet } from '../theme/theme';
import { font, radius } from '../theme/tokens';
import { BottomSheet } from './BottomSheet';
import { Button } from './Button';

type Props = {
  visible: boolean;
  title: string;
  subtitle?: string;
  value: string;
  placeholder?: string;
  keyboardType?: 'default' | 'email-address';
  onSave: (value: string) => void;
  onClose: () => void;
};

/** Edição de um campo de texto — nome, objetivo, conta. */
export function TextSheet({
  visible,
  title,
  subtitle,
  value,
  placeholder,
  keyboardType = 'default',
  onSave,
  onClose,
}: Props) {
  const colors = useColors();
  const styles = useSheet(sheets);
  const [draft, setDraft] = useState(value);

  // Reabrir o sheet sempre começa do valor atual, não do rascunho anterior.
  useEffect(() => {
    if (visible) setDraft(value);
  }, [visible, value]);

  const save = () => {
    const clean = draft.trim();
    if (clean) onSave(clean);
    onClose();
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title={title} subtitle={subtitle}>
      <TextInput
        value={draft}
        onChangeText={setDraft}
        placeholder={placeholder}
        placeholderTextColor={colors.textDisabled}
        accessibilityLabel={title}
        autoCapitalize={keyboardType === 'email-address' ? 'none' : 'sentences'}
        keyboardType={keyboardType}
        onSubmitEditing={save}
        returnKeyType="done"
        style={styles.input}
      />
      <Button label="Salvar" onPress={save} height={56} />
    </BottomSheet>
  );
}

const sheets = themed((colors) =>
  StyleSheet.create({
    input: {
      height: 58,
      borderRadius: radius.button,
      backgroundColor: colors.surface,
      borderWidth: 1.5,
      borderColor: colors.green,
      paddingHorizontal: 18,
      fontFamily: font.semibold,
      fontSize: 18,
      color: colors.textPrimary,
    },
  })
);

import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { BackupError } from '../data/backup';

/**
 * O backup saindo e entrando pelo sistema de arquivos.
 *
 * Fica separado do banco de propósito: aqui é só arquivo, compartilhamento e
 * seletor. O que conta como backup válido não é assunto deste módulo.
 */
export const backupSupported = Platform.OS === 'ios' || Platform.OS === 'android';

/** Grava o texto num arquivo temporário e abre o compartilhamento do sistema. */
export async function shareBackup(contents: string, fileName: string): Promise<void> {
  if (!backupSupported) {
    throw new BackupError('A cópia de segurança funciona no aplicativo do celular.');
  }
  if (!(await Sharing.isAvailableAsync())) {
    throw new BackupError('Este aparelho não oferece onde salvar o arquivo.');
  }

  const file = new File(Paths.cache, fileName);
  if (file.exists) file.delete();
  file.create();
  file.write(contents);

  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/json',
    dialogTitle: 'Salvar a cópia do NoteGym',
    UTI: 'public.json',
  });
}

/** Abre o seletor e devolve o conteúdo do arquivo, ou null se desistiram. */
export async function pickBackup(): Promise<string | null> {
  if (!backupSupported) {
    throw new BackupError('A restauração funciona no aplicativo do celular.');
  }

  const picked = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'text/plain', '*/*'],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (picked.canceled || !picked.assets?.length) return null;

  try {
    return await new File(picked.assets[0].uri).text();
  } catch {
    throw new BackupError('Não deu para abrir esse arquivo.');
  }
}

# Distribuir o NoteGym

App standalone (APK Android), funciona offline, sem depender do PC.

## Estado atual

- Projeto EAS: `@leomoraessantdev/NoteGym` (ID `d75129fe-a425-40de-8804-f1e2b9724284`).
- Credenciais Android (keystore): geradas e guardadas na Expo.
- EAS Update ligado — canal `preview`. Correções de JS chegam sem reinstalar.
- Identificador do app: `com.leomoraes.notegym`.

## Instalar (você e sua namorada)

1. Quando o build termina, sai um link `https://expo.dev/artifacts/...` com o `.apk`.
2. Abre o link **no celular Android** → baixa o `.apk`.
3. Android pede pra permitir "instalar app de fonte desconhecida" → permite.
4. Instala. Abre pelo ícone NoteGym.
5. Manda o **mesmo link** pra sua namorada. Ela faz igual.

Cada aparelho tem o próprio histórico — dados ficam no celular, um não vê o do outro.

## Gerar um build novo

Só é necessário quando muda código nativo, dependência nativa, ícone, splash,
permissão ou a `version` do `app.json`.

```
EXPO_TOKEN=<token> npx eas-cli@latest build --platform android --profile preview --non-interactive --no-wait
```

## Empurrar correção sem rebuild (mudança só de JS/estilo)

```
EXPO_TOKEN=<token> npx eas-cli@latest update --branch preview --message "o que mudou" --non-interactive
```

Os celulares pegam ao fechar e reabrir o app.

## Backup dos dados

Perfil → **Salvar uma cópia** (arquivo `.json`). **Restaurar de um arquivo** traz de volta.
Serve pra trocar de celular ou reinstalar sem perder histórico.

## iOS (se precisar)

`app.json` já tem `bundleIdentifier`. Instalar em iPhone exige conta Apple
Developer paga (US$ 99/ano). Sem isso, só Android.

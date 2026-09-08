# Distribuir o NoteGym

Como tirar o app do Expo Go e botar um APK instalável no seu celular e no da
sua namorada — funcionando offline, na academia, sem depender do PC ligado.

## O que já está pronto no repositório

- `eas.json` — perfis de build (`preview` gera um APK único; `production` gera
  o `.aab` da Play Store).
- `app.json` — identificador do app (`com.leomoraes.notegym`), ícone, splash e
  `runtimeVersion` para as atualizações OTA.
- `expo-updates` instalado — depois do APK na mão, dá para empurrar correções de
  JS sem gerar build novo nem reinstalar.

## Uma vez só (precisa de conta Expo, grátis)

No terminal do Claude Code, rode com `!` na frente (login é interativo):

```
! npx eas-cli@latest login
```

Se não tem conta: `! npx eas-cli@latest register` (ou cria em https://expo.dev).

Depois, ainda uma vez, para ligar o projeto à sua conta e criar o ID +
o endereço das atualizações:

```
! npx eas-cli@latest init
! npx eas-cli@latest update:configure
```

Isso preenche `extra.eas.projectId` e `updates.url` no `app.json`. Faça commit
desse arquivo depois.

## Gerar o APK para instalar e mandar

```
! npx eas-cli@latest build --platform android --profile preview
```

- Roda na nuvem da Expo (fila grátis serve de sobra para uso pessoal).
- No fim aparece um link `https://expo.dev/artifacts/...` com o `.apk`.
- Abre esse link no celular → baixa → instala (Android vai pedir para permitir
  "instalar de fontes desconhecidas", é normal).
- Manda o mesmo link para a sua namorada. Cada um tem o próprio histórico: os
  dados ficam no aparelho, um não vê o do outro.

## Corrigir algo depois (sem rebuild)

Enquanto a mudança for só de JS/estilo (não mexeu em dependência nativa nem em
`app.json`):

```
! npx eas-cli@latest update --branch preview --message "o que mudou"
```

Os dois celulares pegam a atualização ao abrir o app (fecha e abre de novo).

Se mexeu em código nativo, dependência nativa, ícone ou permissão: sobe a
`version` no `app.json` e gera um APK novo com o comando de build.

## Backup dos dados

Perfil → **Salvar uma cópia** gera um arquivo `.json` com todo o histórico.
**Restaurar de um arquivo** traz de volta. Use para não perder nada ao trocar
de celular ou reinstalar.

## iOS (se a namorada tiver iPhone)

O `app.json` já tem o `bundleIdentifier`. Precisa de conta Apple Developer
(US$ 99/ano) para instalar em iPhone — sem isso, só Android. Se for o caso:

```
! npx eas-cli@latest build --platform ios --profile preview
```

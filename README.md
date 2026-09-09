# NoteGym

Registro de treino de academia — carga e repetições série a série, comparando
com a última vez. Sem conta, sem nuvem: os dados ficam no aparelho.

<p align="center">
  <img src="docs/screenshots/light-inicio.png" width="19%" alt="Início" />
  <img src="docs/screenshots/light-treinos.png" width="19%" alt="Treinos" />
  <img src="docs/screenshots/light-calendario.png" width="19%" alt="Calendário" />
  <img src="docs/screenshots/light-progresso.png" width="19%" alt="Progresso" />
  <img src="docs/screenshots/light-perfil.png" width="19%" alt="Perfil" />
</p>

<p align="center"><sub>Início · Treinos · Calendário · Progresso · Perfil — telas de primeira abertura, tema claro</sub></p>

## O que faz

- **Início** — o treino do dia e o botão para começar.
- **Treinos** — monta os treinos (A/B/C…), exercícios, séries e faixa de repetições.
- **Execução** — marca série a série; cada check grava na hora. Cronômetro de
  descanso com aviso mesmo com a tela travada. Sugestão de progressão quando
  fecha o topo da faixa de repetições.
- **Calendário** — dias fixos da semana ou treino na sequência.
- **Progresso** — volume por semana, maior carga, constância.
- **Perfil** — objetivo, unidade (kg/lb), descanso padrão, tema claro/escuro,
  cópia de segurança em arquivo.

## Stack

- Expo SDK 57, React Native 0.86, expo-router
- `expo-sqlite` no aparelho (sql.js no preview web) — mesmo SQL e mesmas migrações
- TypeScript strict, Jest (`npm test`)

## Rodar localmente

```
npm install
npm start        # abre o Metro; escaneia o QR no Expo Go
npm run web      # preview no navegador
npm test
```

> Expo mudou muito na v57. Antes de mexer no código, ver os docs versionados:
> https://docs.expo.dev/versions/v57.0.0/

## Instalar no celular / mandar para alguém

APK Android pronto e passo a passo em **[DISTRIBUICAO.md](DISTRIBUICAO.md)**.
iPhone precisa de conta Apple Developer (TestFlight).

## Estrutura

```
app/            rotas (expo-router): abas + tela de execução
src/
  components/   UI (steppers, sheets, cartões, gráficos, ícones)
  screens/      uma por aba
  state/        AppStore (contexto) + runner do treino
  db/           schema, migrações, seed, queries, backup
  theme/        tokens de cor, tema claro/escuro
  lib/          datas, unidades, formatação, notificações
  data/         regras de calendário e de backup (puras, testadas)
```

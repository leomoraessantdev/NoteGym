import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  BackHandler,
  PanResponder,
  Platform,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { WorkoutExecutionScreen } from '../screens/WorkoutExecutionScreen';
import { MINI_BAR_HEIGHT, useActiveWorkout } from '../state/ActiveWorkout';
import { useApp } from '../state/AppStore';
import { useRestTimer } from '../state/useRestTimer';
import { useWorkoutRunner } from '../state/useWorkoutRunner';
import { themed, useSheet } from '../theme/theme';
import { radius } from '../theme/tokens';
import { MiniWorkoutBar } from './MiniWorkoutBar';
import { useTabBarHeight } from './TabBar';

/** Fração do curso que o arrasto precisa vencer para minimizar. */
const COMMIT_FRACTION = 0.25;
/** Velocidade que decide sozinha, mesmo num arrasto curto (px por ms). */
const COMMIT_VELOCITY = 0.5;

/**
 * O treino em andamento, montado acima da navegação.
 *
 * Enquanto a sessão existe esta camada não desmonta, e é por isso que dá para
 * minimizar: como rota, sair da tela levava junto o runner, o cronômetro e o
 * tempo decorrido. Ela também é a raiz de composição da sessão — chama os dois
 * hooks e entrega o resultado para a tela cheia e para a barra reduzida.
 */
export function ActiveWorkoutLayer() {
  const { workoutId } = useActiveWorkout();
  if (!workoutId) return null;
  // `key`: trocar de treino começa uma sessão nova, não continua a anterior.
  return <Slab key={workoutId} workoutId={workoutId} />;
}

function Slab({ workoutId }: { workoutId: string }) {
  const styles = useSheet(sheets);
  const { settings, workouts, refresh } = useApp();
  const { minimized, minimize, expand, close } = useActiveWorkout();
  const { height } = useWindowDimensions();
  const tabBarHeight = useTabBarHeight();

  const runner = useWorkoutRunner(workoutId, settings.restSeconds, settings.unit);
  const rest = useRestTimer(settings.restSeconds, settings.notifications === 'Ativas');

  /**
   * O runner decide *quando* o descanso começa — marcar uma série, ou fechar o
   * aviso de recorde. Quem conta é o cronômetro. Este efeito liga os dois e já
   * baixa a bandeira, senão ela ficaria levantada e o próximo pedido passaria
   * despercebido.
   */
  const { resting, endRest } = runner;
  const startRest = rest.start;
  useEffect(() => {
    if (!resting) return;
    endRest();
    startRest();
  }, [resting, endRest, startRest]);

  /** Onde a lâmina para quando está reduzida: só a barra fica à mostra. */
  const restingY = Math.max(0, height - MINI_BAR_HEIGHT - tabBarHeight);

  const translateY = useRef(new Animated.Value(0)).current;
  /** De onde o arrasto atual partiu, para somar o deslocamento. */
  const anchor = useRef(0);

  const slide = useCallback(
    (toMinimized: boolean) => {
      anchor.current = toMinimized ? restingY : 0;
      Animated.spring(translateY, {
        toValue: anchor.current,
        useNativeDriver: true,
        bounciness: 0,
        speed: 14,
      }).start();
    },
    [restingY, translateY]
  );

  /** Fim do gesto: anima e conta ao provider para onde foi. */
  const settle = useCallback(
    (toMinimized: boolean) => {
      slide(toMinimized);
      if (toMinimized) minimize();
      else expand();
    },
    [slide, minimize, expand]
  );

  // Segue o estado venha de onde vier: tocar na barra, o botão voltar, ou o
  // aparelho girar e mudar a altura do curso.
  useEffect(() => {
    slide(minimized);
  }, [minimized, slide]);

  const pan = useMemo(
    () =>
      PanResponder.create({
        // Só assume depois de um movimento vertical claro: um toque parado
        // continua sendo toque, e a barra reduzida ainda abre no tap.
        onMoveShouldSetPanResponder: (_event, gesture) =>
          Math.abs(gesture.dy) > 6 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
        onPanResponderMove: (_event, gesture) => {
          const next = anchor.current + gesture.dy;
          translateY.setValue(Math.min(restingY, Math.max(0, next)));
        },
        onPanResponderRelease: (_event, gesture) => {
          const travelled = anchor.current + gesture.dy;
          if (gesture.vy < -COMMIT_VELOCITY) return settle(false);
          if (gesture.vy > COMMIT_VELOCITY) return settle(true);
          settle(travelled > restingY * COMMIT_FRACTION);
        },
        onPanResponderTerminate: () => settle(anchor.current > 0),
      }),
    [restingY, translateY, settle]
  );

  // Voltar com o treino aberto reduz, não sai: perder um treino em andamento
  // por um toque no botão errado é caro demais.
  useEffect(() => {
    if (Platform.OS !== 'android' || minimized) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      minimize();
      return true;
    });
    return () => subscription.remove();
  }, [minimized, minimize]);

  /** Sair ou finalizar mudam o que o resto do app mostra. Recarrega nos dois. */
  const leave = useCallback(() => {
    rest.stop();
    close();
    void refresh();
  }, [rest, close, refresh]);

  // O nome do treino, não "Exercício 2 de 5": reduzida, a barra precisa dizer
  // antes de tudo qual sessão está de pé.
  const title = workouts.find((w) => w.id === workoutId)?.title ?? 'Treino em andamento';

  const detail = rest.active
    ? rest.overtime > 0
      ? 'descanso passou do alvo'
      : 'descansando'
    : (runner.exercise?.name ?? 'Treino vazio');

  return (
    <Animated.View
      style={[styles.slab, { transform: [{ translateY }] }]}
      // Reduzida, a lâmina não pode roubar o toque das abas que ficam à mostra
      // embaixo dela.
      pointerEvents="box-none"
    >
      <View style={styles.screen}>
        <WorkoutExecutionScreen
          runner={runner}
          rest={rest}
          unit={settings.unit}
          minimized={minimized}
          onExit={leave}
          onFinish={leave}
          dragHandle={
            <View {...pan.panHandlers} style={styles.handleArea}>
              <View style={styles.handle} />
            </View>
          }
        />
      </View>

      {/* Presa ao topo da lâmina: ao descer, ela chega exatamente onde a barra
          deve ficar. É o movimento do mini-player de um tocador. */}
      <Animated.View
        style={[
          styles.miniLayer,
          {
            opacity: translateY.interpolate({
              inputRange: [0, Math.max(1, restingY * 0.6), Math.max(2, restingY)],
              outputRange: [0, 0, 1],
            }),
          },
        ]}
        pointerEvents={minimized ? 'auto' : 'none'}
      >
        <View {...pan.panHandlers}>
          <MiniWorkoutBar
            title={title}
            detail={detail}
            seconds={rest.active ? rest.seconds : runner.elapsedSeconds}
            resting={rest.active}
            late={rest.overtime > 0}
            onPress={expand}
          />
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const sheets = themed((colors) =>
  StyleSheet.create({
    slab: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
    screen: {
      flex: 1,
      backgroundColor: colors.bg,
      borderTopLeftRadius: radius.sheet,
      borderTopRightRadius: radius.sheet,
      overflow: 'hidden',
    },
    miniLayer: { position: 'absolute', top: 0, left: 0, right: 0 },
    handleArea: { paddingTop: 8, paddingBottom: 4, alignItems: 'center' },
    handle: { width: 44, height: 5, borderRadius: 3, backgroundColor: colors.neutral400 },
  })
);

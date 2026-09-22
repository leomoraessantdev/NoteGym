import {
  addSeconds,
  elapsedAt,
  overtimeAt,
  pause,
  reachedTarget,
  resume,
  shouldChime,
  startRest,
  targetAt,
} from './restMath';

/** Instante fixo para as contas não dependerem do relógio da máquina. */
const T0 = 1_700_000_000_000;
const after = (seconds: number) => T0 + seconds * 1000;

describe('contagem', () => {
  it('começa em zero', () => {
    expect(elapsedAt(startRest(T0, 90), T0)).toBe(0);
  });

  it('conta a partir do relógio, não de um acumulador', () => {
    const rest = startRest(T0, 90);
    expect(elapsedAt(rest, after(30))).toBe(30);
    expect(elapsedAt(rest, after(89))).toBe(89);
  });

  it('não volta atrás se o relógio do aparelho recuar', () => {
    expect(elapsedAt(startRest(T0, 90), T0 - 5000)).toBe(0);
  });
});

describe('alvo', () => {
  it('não chega antes da hora', () => {
    const rest = startRest(T0, 90);
    expect(reachedTarget(rest, after(89))).toBe(false);
    expect(overtimeAt(rest, after(89))).toBe(0);
  });

  it('chega no segundo exato', () => {
    const rest = startRest(T0, 90);
    expect(reachedTarget(rest, after(90))).toBe(true);
    expect(overtimeAt(rest, after(90))).toBe(0);
  });

  it('conta o excedente depois do alvo', () => {
    const rest = startRest(T0, 90);
    expect(elapsedAt(rest, after(102))).toBe(102);
    expect(overtimeAt(rest, after(102))).toBe(12);
  });

  it('diz a que horas o alvo vence', () => {
    expect(targetAt(startRest(T0, 90))).toBe(after(90));
  });
});

describe('pausa', () => {
  it('congela a contagem', () => {
    const paused = pause(startRest(T0, 90), after(20));
    expect(elapsedAt(paused, after(60))).toBe(20);
  });

  it('pausar duas vezes não muda nada', () => {
    const once = pause(startRest(T0, 90), after(20));
    expect(pause(once, after(60))).toEqual(once);
  });

  it('retomar continua de onde parou, não do zero', () => {
    const running = resume(pause(startRest(T0, 90), after(20)), after(60));
    expect(elapsedAt(running, after(60))).toBe(20);
    expect(elapsedAt(running, after(70))).toBe(30);
  });

  it('pausado não tem hora de vencimento a anunciar', () => {
    expect(targetAt(pause(startRest(T0, 90), after(20)))).toBeNull();
  });

  it('retomar empurra o vencimento pelo tempo parado', () => {
    const running = resume(pause(startRest(T0, 90), after(20)), after(60));
    expect(targetAt(running)).toBe(after(130));
  });
});

describe('mais trinta segundos', () => {
  it('adia o alvo quando ainda falta', () => {
    const longer = addSeconds(startRest(T0, 90), 30);
    expect(reachedTarget(longer, after(100))).toBe(false);
    expect(targetAt(longer)).toBe(after(120));
  });

  it('tira do excedente quando o alvo já passou', () => {
    const rest = startRest(T0, 90);
    expect(overtimeAt(rest, after(100))).toBe(10);
    const longer = addSeconds(rest, 30);
    expect(reachedTarget(longer, after(100))).toBe(false);
    expect(overtimeAt(longer, after(100))).toBe(0);
  });
});

describe('quando vibrar na tela', () => {
  it('vibra no segundo em que cruza o alvo', () => {
    expect(shouldChime(89, 90, 90)).toBe(true);
  });

  it('não vibra antes', () => {
    expect(shouldChime(88, 89, 90)).toBe(false);
  });

  it('não vibra duas vezes pelo mesmo cruzamento', () => {
    expect(shouldChime(90, 91, 90)).toBe(false);
  });

  // Com a tela travada o setInterval não roda: o app volta já com o alvo
  // vencido há muito. A notificação agendada já avisou — vibrar aqui seria um
  // segundo aviso, atrasado e sem motivo.
  it('não vibra ao voltar do segundo plano com o alvo vencido', () => {
    expect(shouldChime(40, 300, 90)).toBe(false);
  });
});

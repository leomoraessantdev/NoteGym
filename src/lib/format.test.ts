import { mmss, plural, setLabel, volumeLabel, weight, weightDelta, weightValue } from './format';

describe('formatacao', () => {
  it('escreve a carga na unidade escolhida, a partir dos quilos guardados', () => {
    expect(weight(37.5, 'kg')).toBe('37,5 kg');
    expect(weightValue(37.5, 'kg')).toBe('37,5');
    expect(weight(4.5359237, 'lb')).toBe('10 lb');
  });

  it('rotula a serie com carga e repeticoes', () => {
    expect(setLabel(35, 10, 'kg')).toBe('35 kg \u00d7 10');
    expect(setLabel(4.5359237, 8, 'lb')).toBe('10 lb \u00d7 8');
  });

  it('mostra a diferenca com sinal, tambem convertida', () => {
    expect(weightDelta(2.5, 'kg')).toBe('+2,5 kg');
    expect(weightDelta(-2.5, 'kg')).toBe('\u22122,5 kg');
    expect(weightDelta(4.5359237, 'lb')).toBe('+10 lb');
  });

  it('escreve volume grande no formato pt-BR', () => {
    expect(volumeLabel(12480, 'kg')).toBe('12.480 kg');
  });

  it('mmss e plural', () => {
    expect(mmss(90)).toBe('1:30');
    expect(mmss(-5)).toBe('0:00');
    expect(plural(1, 'exercicio', 'exercicios')).toBe('1 exercicio');
    expect(plural(5, 'exercicio', 'exercicios')).toBe('5 exercicios');
  });
});

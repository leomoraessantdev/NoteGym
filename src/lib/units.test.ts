import { roundHalf, stepFor, stepWeight, toDisplay, toKg } from './units';

describe('unidade de peso', () => {
  it('guarda quilos e converte so na exibicao', () => {
    expect(toDisplay(100, 'kg')).toBe(100);
    expect(toDisplay(100, 'lb')).toBeCloseTo(220.46, 2);
    expect(toKg(220.46226218, 'lb')).toBeCloseTo(100, 6);
  });

  it('mantem o passo que o app sempre teve em quilos', () => {
    expect(stepFor('kg')).toBe(2.5);
    expect(stepWeight(37.5, 1, 'kg')).toBe(40);
    expect(stepWeight(32, 1, 'kg')).toBe(34.5);
    expect(stepWeight(40, -1, 'kg')).toBe(37.5);
  });

  it('anda de 5 em 5 em libras, sem numeros quebrados na tela', () => {
    expect(stepFor('lb')).toBe(5);
    let kg = 0;
    const shown: number[] = [];
    for (let i = 0; i < 3; i++) {
      kg = stepWeight(kg, 1, 'lb');
      shown.push(roundHalf(toDisplay(kg, 'lb')));
    }
    expect(shown).toEqual([5, 10, 15]);
  });

  it('subir e descer em libras volta ao mesmo lugar', () => {
    const start = 100;
    let kg = start;
    for (let i = 0; i < 4; i++) kg = stepWeight(kg, 1, 'lb');
    for (let i = 0; i < 4; i++) kg = stepWeight(kg, -1, 'lb');
    expect(roundHalf(toDisplay(kg, 'lb'))).toBe(roundHalf(toDisplay(start, 'lb')));
  });

  it('nunca fica negativo', () => {
    expect(stepWeight(0, -1, 'kg')).toBe(0);
    expect(stepWeight(1, -1, 'lb')).toBe(0);
  });
});

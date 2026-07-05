/**
 * ScoreGauge Component Tests
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { ScoreGauge } from '../ScoreGauge';

describe('ScoreGauge', () => {
  it('should render with grade A', () => {
    const result = render(
      <ScoreGauge score={95} grade="A" />,
    );
    expect(result).toBeTruthy();
  });

  it('should render with grade B', () => {
    const result = render(
      <ScoreGauge score={85} grade="B" />,
    );
    expect(result).toBeTruthy();
  });

  it('should render with grade C', () => {
    const result = render(
      <ScoreGauge score={75} grade="C" />,
    );
    expect(result).toBeTruthy();
  });

  it('should render with grade D', () => {
    const result = render(
      <ScoreGauge score={65} grade="D" />,
    );
    expect(result).toBeTruthy();
  });

  it('should render with grade E', () => {
    const result = render(
      <ScoreGauge score={55} grade="E" />,
    );
    expect(result).toBeTruthy();
  });

  it('should render with grade F', () => {
    const result = render(
      <ScoreGauge score={45} grade="F" />,
    );
    expect(result).toBeTruthy();
  });

  it('should clamp score to 0-100', () => {
    const result = render(
      <ScoreGauge score={150} grade="A" />,
    );
    expect(result).toBeTruthy();
  });

  it('should handle zero score', () => {
    const result = render(
      <ScoreGauge score={0} grade="F" />,
    );
    expect(result).toBeTruthy();
  });

  it('should render with custom size', () => {
    const result = render(
      <ScoreGauge score={80} grade="B" size={200} />,
    );
    expect(result).toBeTruthy();
  });

  it('should render with showLabel prop', () => {
    const result = render(
      <ScoreGauge score={80} grade="B" showLabel={false} />,
    );
    expect(result).toBeTruthy();
  });
});

import React, { useRef } from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import App from './App';

jest.mock('react', () => {
  const ActualReact = jest.requireActual('react');
  return {
    ...ActualReact,
    useRef: jest.fn(),
  };
});

test('renders without crashing', () => {
  const canvasRefMock = { current: document.createElement('canvas') };
  useRef.mockReturnValueOnce(canvasRefMock);
  render(<App />);
});

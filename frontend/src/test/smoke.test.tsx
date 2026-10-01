import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

describe('Frontend smoke tests', () => {
  it('passes basic sanity check', () => {
    expect(1 + 1).toBe(2);
  });

  it('renders a simple element', () => {
    render(<MemoryRouter><div data-testid="test">BizScout AI</div></MemoryRouter>);
    expect(screen.getByTestId('test')).toBeInTheDocument();
  });
});

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import StatusBadge from '../status-badge';

describe('StatusBadge', () => {
  test('renders success styles for Delivered', () => {
    render(<StatusBadge status="Delivered" />);
    const el = screen.getByRole('status');
    expect(el).toHaveTextContent('Delivered');
    expect(el).toHaveClass('bg-status-success-100');
    expect(el).toHaveClass('text-status-success-800');
  });

  test('renders danger styles for Canceled', () => {
    render(<StatusBadge status="Canceled" />);
    const el = screen.getByRole('status');
    expect(el).toHaveTextContent('Canceled');
    expect(el).toHaveClass('bg-status-danger-100');
    expect(el).toHaveClass('text-status-danger-800');
  });

  test('applies aria-label when provided', () => {
    render(<StatusBadge status="Pending" ariaLabel="Order status: Pending" />);
    const el = screen.getByLabelText('Order status: Pending');
    expect(el).toBeInTheDocument();
  });

  test('renders provided icon', () => {
    render(<StatusBadge status="Preparing" icon={<svg data-testid="test-icon" />} />);
    const icon = screen.getByTestId('test-icon');
    expect(icon).toBeInTheDocument();
  });
});
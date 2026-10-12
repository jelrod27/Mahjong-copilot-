import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PageHeader } from '../page-header';

describe('PageHeader', () => {
  it('renders its eyebrow', () => {
    render(<PageHeader eyebrow="REFERENCE" title="Quick Reference" />);
    expect(screen.getByText('REFERENCE')).toBeInTheDocument();
  });

  it('renders its title as the page heading', () => {
    render(<PageHeader eyebrow="REFERENCE" title="Quick Reference" />);
    expect(screen.getByRole('heading', { level: 1, name: 'Quick Reference' })).toBeInTheDocument();
  });

  it('renders its description when given one', () => {
    render(
      <PageHeader eyebrow="REFERENCE" title="Quick Reference" description="Everything at a glance." />,
    );
    expect(screen.getByText('Everything at a glance.')).toBeInTheDocument();
  });

  it('omits the description when none is given', () => {
    render(<PageHeader eyebrow="REFERENCE" title="Quick Reference" />);
    expect(screen.queryByText('Everything at a glance.')).not.toBeInTheDocument();
  });

  it('renders its children', () => {
    render(
      <PageHeader eyebrow="REFERENCE" title="Quick Reference">
        <p>Overall progress</p>
      </PageHeader>,
    );
    expect(screen.getByText('Overall progress')).toBeInTheDocument();
  });
});

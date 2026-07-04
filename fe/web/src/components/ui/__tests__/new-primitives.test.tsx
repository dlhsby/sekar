/** Unit Tests: new library primitives (Spinner, Separator, Progress, Switch, Accordion, Breadcrumb, Avatar). */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../accordion';
import { Avatar, AvatarGroup } from '../avatar';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '../breadcrumb';
import { Progress } from '../progress';
import { Separator } from '../separator';
import { Spinner } from '../spinner';
import { Switch } from '../switch';

describe('Spinner', () => {
  it('exposes an accessible status with a label', () => {
    render(<Spinner label="Memuat data" />);
    expect(screen.getByRole('status')).toHaveTextContent('Memuat data');
  });
});

describe('Separator', () => {
  it('renders a decorative separator by default', () => {
    const { container } = render(<Separator />);
    expect(container.firstChild).toHaveClass('bg-nb-black');
  });
  it('supports vertical orientation', () => {
    render(<Separator orientation="vertical" decorative={false} />);
    expect(screen.getByRole('separator')).toHaveAttribute('aria-orientation', 'vertical');
  });
});

describe('Progress', () => {
  it('clamps the value into 0–100 and reflects it via aria', () => {
    render(<Progress value={150} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
  });
});

describe('Switch', () => {
  it('toggles checked state on click', async () => {
    const onCheckedChange = jest.fn();
    const user = userEvent.setup();
    render(<Switch onCheckedChange={onCheckedChange} aria-label="Aktif" />);
    await user.click(screen.getByRole('switch', { name: 'Aktif' }));
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });
});

describe('Accordion', () => {
  it('expands an item when its trigger is clicked', async () => {
    const user = userEvent.setup();
    render(
      <Accordion type="single" collapsible>
        <AccordionItem value="a">
          <AccordionTrigger>Bagian A</AccordionTrigger>
          <AccordionContent>Isi A</AccordionContent>
        </AccordionItem>
      </Accordion>
    );
    const trigger = screen.getByRole('button', { name: 'Bagian A' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Isi A')).toBeInTheDocument();
  });
});

describe('Breadcrumb', () => {
  it('renders a labelled nav with a current page', () => {
    render(
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">Beranda</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Detail</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    );
    expect(screen.getByRole('navigation', { name: 'Navigasi breadcrumb' })).toBeInTheDocument();
    expect(screen.getByText('Beranda')).toHaveAttribute('href', '/');
    expect(screen.getByText('Detail')).toHaveAttribute('aria-current', 'page');
  });
});

describe('Avatar', () => {
  it('renders initials when no image is provided', () => {
    render(<Avatar name="Budi Santoso" />);
    expect(screen.getByText('BS')).toBeInTheDocument();
  });
  it('renders the image when src is set', () => {
    render(<Avatar name="Budi" src="https://example.com/a.png" alt="Budi" />);
    expect(screen.getByRole('img', { name: 'Budi' })).toBeInTheDocument();
  });
  it('collapses overflow into a +N chip', () => {
    render(
      <AvatarGroup max={2}>
        <Avatar name="A A" />
        <Avatar name="B B" />
        <Avatar name="C C" />
        <Avatar name="D D" />
      </AvatarGroup>
    );
    expect(screen.getByText('+2')).toBeInTheDocument();
  });
});

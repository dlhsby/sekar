import React from 'react';
import { render } from '@testing-library/react-native';
import { Text } from 'react-native';
import { Card } from '../Card';

describe('Card Component', () => {
  it('should render children correctly', () => {
    const { getByText } = render(
      <Card>
        <Text>Card Content</Text>
      </Card>
    );
    expect(getByText('Card Content')).toBeTruthy();
  });

  it('should render multiple children', () => {
    const { getByText } = render(
      <Card>
        <Text>Title</Text>
        <Text>Description</Text>
      </Card>
    );
    expect(getByText('Title')).toBeTruthy();
    expect(getByText('Description')).toBeTruthy();
  });

  it('should apply custom styles', () => {
    const customStyle = { marginTop: 20 };
    const { getByTestId } = render(
      <Card style={customStyle} testID="card">
        <Text>Content</Text>
      </Card>
    );
    const card = getByTestId('card');
    expect(card.props.style).toContainEqual(customStyle);
  });

  it('should render empty card', () => {
    const { getByTestId } = render(<Card testID="empty-card" />);
    expect(getByTestId('empty-card')).toBeTruthy();
  });
});

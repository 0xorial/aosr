import React from 'react';
import '@testing-library/jest-dom/extend-expect';
import { Hello } from '../src/test-view';
import { render } from '@testing-library/react';

test('<view/>', () => {
  const wrapper = render(<Hello />);
  expect(wrapper.container).toHaveTextContent('Hello world');
});

test('should load items', () => {
  const wrapper = render(<Hello />);
  expect(wrapper.container).toHaveTextContent('Hello world');
});

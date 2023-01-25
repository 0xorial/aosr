import { mount } from 'enzyme';
import { Hello } from '../src/view';
import React from 'react';

test('<view/>', (cb) => {
  const wrapper = mount(<Hello />);
  console.log(wrapper.childAt(0));
});

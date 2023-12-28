import { describe, it, expect } from 'vitest';

import { mount } from '@vue/test-utils';
import HomeView from '../HomeView.vue';

describe('HomeView', () => {
  it('renders properly', () => {
    const wrapper = mount(HomeView, { props: {} });
    expect(wrapper.text()).toContain('Epicstory');
    expect(wrapper.text()).toContain('Create epic stories with us.');
    expect(wrapper.text()).toContain('Discover a better communication tool for Scrum teams.');
  });
});

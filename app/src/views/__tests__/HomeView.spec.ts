import { describe, it, expect } from 'vitest';
import { setupServer } from 'msw/node';
import { HttpResponse, http } from 'msw';
import { mount } from '@vue/test-utils';
import HomeView from '../HomeView.vue';

const server = setupServer(
  http.post('http://localhost:3000/auth/signup', async ({ request, params }) => {
    return HttpResponse.json({ token: '' }, { status: 200 });
  })
);

describe('HomeView', () => {
  it('renders properly', () => {
    const wrapper = mount(HomeView, { props: {} });
    expect(wrapper.text()).toContain('Epicstory');
    expect(wrapper.text()).toContain('Create epic stories with us.');
    expect(wrapper.text()).toContain('Discover a better communication tool for Scrum teams.');
  });
});

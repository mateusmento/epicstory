import { HttpHandler, HttpResponse, http } from 'msw';

const inboxRoutes: HttpHandler[] = [
  http.get(`${import.meta.env.VITE_API_URL}/inbox`, () => {
    return HttpResponse.json({
      messages: [
        {
          id: 1,
          text: 'I need to talk to you right now',
          author: {
            id: 1,
            name: 'Director',
          },
        },
        {
          id: 2,
          text: 'Hey man can you help me out?',
          author: {
            id: 2,
            name: 'Friend',
          },
        },
        {
          id: 3,
          text: 'Hey when are we going to see each other?',
          author: {
            id: 2,
            name: 'Daiana',
          },
        },
      ],
    });
  }),
];

export default inboxRoutes;

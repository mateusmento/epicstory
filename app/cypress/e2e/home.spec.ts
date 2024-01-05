describe('Home page', () => {
  it('visits the app root url', () => {
    cy.visit('/');
    cy.contains('h1', 'Create epic stories with us.');
  });
});

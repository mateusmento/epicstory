import * as signin from './page-objects/signin';

describe('Sign in user', () => {
  it('should successfully sign user in', () => {
    cy.visit('/signin');
    cy.contains('Sign in');
    cy.contains('Make stories with us.');
    const SIGNIN_EMAIL = 'user@email.com';
    const SIGNIN_PASSWORD = '123';
    signin.signinUser(SIGNIN_EMAIL, SIGNIN_PASSWORD);
  });
});

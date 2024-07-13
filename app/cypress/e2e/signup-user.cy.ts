import * as signin from './page-objects/signin';
import { signupUser } from './page-objects/signup';
import { enableMocking, mocks } from './mocks';

describe('Sign up a new user', () => {
  enableMocking(mocks);

  it('should sign up a new user', () => {
    cy.visit('/signup/');

    cy.contains('Sign up');
    cy.contains('Start your journey with Epicstory.');

    const email = 'mateus@email.com';
    signupUser('Mateus Sarmento', email, 'kjg123jkh12g3');

    cy.contains('Sign in');

    signin.emailInput().should('have.value', email);
  });
});

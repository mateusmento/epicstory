export const signupNameInput = () => cy.get('[data-testid="signup-name-input"]');
export const signupEmailInput = () => cy.get('[data-testid="signup-email-input"]');
export const signupPasswordInput = () => cy.get('[data-testid="signup-password-input"]');
export const signupButton = () => cy.get('[data-testid="signup-button"]');

export function signupUser(name: string, email: string, password: string) {
  signupNameInput().type(name);
  signupEmailInput().type(email);
  signupPasswordInput().type(password);
  signupButton().click();
}

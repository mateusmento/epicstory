export const emailInput = () => cy.get('[data-testid="signin-email-input"]');
export const passwordInput = () => cy.get('[data-testid="signin-password-input"]');
export const submitButton = () => cy.get('[data-testid="signin-submit-button"]');

export function signinUser(email: string, password: string) {
  emailInput().type(email);
  passwordInput().type(password);
  submitButton().click();
}

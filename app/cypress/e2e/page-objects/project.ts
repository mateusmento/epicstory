export const issueNameInput = () => cy.get('[data-testid="issue-name-input"');
export const createIssueButton = () => cy.get('[data-testid="create-issue-button"');
export const issueList = () => cy.get('[data-testid="issue-list"]');

export function createIssue(name: string) {
  issueNameInput().type(name);
  createIssueButton().click();
}

export function expectIssueCreated(name: string) {
  issueList().contains(name);
  issueNameInput().should('have.value', '');
}

export const projectNameInput = () => cy.get('[data-testid="project-name-input"');
export const createProjectButton = () => cy.get('[data-testid="create-project-button"');
export const projectList = () => cy.get('[data-testid="project-list"]');

export function createProject(name: string) {
  projectNameInput().type(name);
  createProjectButton().click();
}

export function expectProjectCreated(name: string) {
  projectList().contains(name);
  projectNameInput().should('have.value', '');
}

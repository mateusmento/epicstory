export const workspaceNameInput = () => cy.get('[data-testid="workspace-name-input"]');
export const createWorkspaceButton = () => cy.get('[data-testid="create-workspace-button"');
export const workspaceList = () => cy.get('[data-testid="workspace-list"]');

export function createWorkspace(name: string) {
  workspaceNameInput().type(name);
  createWorkspaceButton().click();
}

export function expectWorkspaceCreated(name: string) {
  workspaceList().contains(name);
  workspaceNameInput().should('have.value', '');
}

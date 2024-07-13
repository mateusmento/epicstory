import { enableMocking, mocks } from './mocks';
import { createWorkspace, expectWorkspaceCreated } from './page-objects/home';

describe('Create workspace', () => {
  enableMocking(mocks);

  it('should create an workspace', () => {
    cy.visit('/');
    cy.contains('Workspaces');

    const workspaceName1 = 'Epicstory';
    createWorkspace(workspaceName1);
    expectWorkspaceCreated(workspaceName1);

    const workspaceName2 = 'Derbel';
    createWorkspace(workspaceName2);
    expectWorkspaceCreated(workspaceName2);
  });
});

import { enableMocking, mocks } from './mocks';
import { createWorkspace, workspaceList } from './page-objects/home';
import { createProject, expectProjectCreated } from './page-objects/workspace';

describe('Create project in workspace', () => {
  enableMocking(mocks);

  it('should create a project in workspace', () => {
    cy.visit('/');

    const workspaceName = 'Epicstory';
    createWorkspace(workspaceName);
    workspaceList().contains(workspaceName).click();

    cy.contains('Workspace 1');

    const projectName1 = 'Epicstory Api';
    createProject(projectName1);
    expectProjectCreated(projectName1);

    const projectName2 = 'Epicstory App';
    createProject(projectName2);
    expectProjectCreated(projectName2);
  });
});

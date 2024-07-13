import { enableMocking, mocks } from './mocks';
import { createWorkspace, workspaceList } from './page-objects/home';
import { createIssue, expectIssueCreated } from './page-objects/project';
import { createProject, projectList } from './page-objects/workspace';

describe('Create issue in project', () => {
  enableMocking(mocks);

  it('should create issue in project', () => {
    cy.visit('/');

    const workspaceName = 'Epicstory';
    createWorkspace(workspaceName);
    workspaceList().contains(workspaceName).click();

    const projectName = 'Epicstory Api';
    createProject(projectName);
    projectList().contains(projectName).click();

    const issueTitle1 = 'Create workspace';
    createIssue(issueTitle1);
    expectIssueCreated(issueTitle1);

    const issueTitle2 = 'Create project in workspace';
    createIssue(issueTitle2);
    expectIssueCreated(issueTitle2);
  });
});

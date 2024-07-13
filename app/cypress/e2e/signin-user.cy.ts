import { enableMocking, mocks } from "./mocks";
import * as signin from "./page-objects/signin";

describe("Sign in user", () => {
  enableMocking(mocks);

  it("should successfully sign user in", () => {
    cy.visit("/signin");
    cy.contains("Sign in");
    cy.contains("Continue your journey with Epicstory.");
    const SIGNIN_EMAIL = "user@email.com";
    const SIGNIN_PASSWORD = "123";
    signin.signinUser(SIGNIN_EMAIL, SIGNIN_PASSWORD);
  });
});

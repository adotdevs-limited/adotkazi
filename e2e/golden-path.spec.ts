import { readFileSync } from "node:fs";
import { test, expect } from "@playwright/test";

/**
 * Exercises the Milestone 1 golden path end-to-end against a real browser:
 * sign up -> verify email -> create organization -> dashboard -> invite a
 * teammate -> unauthenticated invite link renders correctly.
 *
 * Email delivery isn't wired up yet (see src/lib/email/send-email.ts), so
 * this test recovers the verification/invite links from the dev server's
 * console log instead of an inbox.
 */

const DEV_LOG_PATH = process.env.ADOTKAZI_DEV_LOG ?? "/tmp/adotkazi-dev.log";

/**
 * The dev-only email stub (src/lib/email/send-email.ts) logs two lines per
 * message: `[email:dev-stub] to=<email> subject="..."` followed by the body
 * containing the link. Finds the last message sent to `email` and returns
 * the URL from its body line.
 */
function extractLinkForRecipient(email: string): string {
  const lines = readFileSync(DEV_LOG_PATH, "utf-8").split("\n");
  const headerIndex = lines.findLastIndex((line) => line.includes(`to=${email} `));
  if (headerIndex === -1) {
    throw new Error(`No email logged for ${email} in ${DEV_LOG_PATH}`);
  }
  const bodyLine = lines[headerIndex + 1] ?? "";
  const match = bodyLine.match(/(https?:\/\/\S+)/);
  if (!match) {
    throw new Error(`No URL found in email body for ${email}: ${bodyLine}`);
  }
  return match[1]!;
}

test("sign up, verify, create an organization, and invite a teammate", async ({
  page,
  context,
}) => {
  const unique = Date.now();
  const email = `owner-${unique}@example.com`;
  const password = "correct horse battery staple";

  await page.goto("/sign-up");
  await page.getByLabel("Full name").fill("Ada Owner");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page.getByText("Check your email")).toBeVisible();

  const verifyUrl = extractLinkForRecipient(email);
  await page.goto(verifyUrl);

  // Verifying signs the user in and redirects into onboarding (no org yet).
  await page.waitForURL(/\/onboarding\/organization|\/dashboard/);
  if (page.url().includes("/onboarding")) {
    await page.getByLabel("Organization name").fill("Test Org " + unique);
    await page.getByLabel("Country").fill("Tanzania");
    await page.getByRole("button", { name: "Create organization" }).click();
  }

  await page.waitForURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: `Test Org ${unique}` })).toBeVisible();

  await page.goto("/dashboard/members");
  await expect(page.getByRole("main").getByText("Ada Owner")).toBeVisible();

  const inviteeEmail = `teammate-${unique}@example.com`;
  await page.getByRole("button", { name: "Invite member" }).click();
  await page.getByLabel("Email").fill(inviteeEmail);
  await page.getByRole("button", { name: "Send invitation" }).click();

  const inviteLinkLocator = page.locator("text=/\\/invitations\\//");
  await expect(inviteLinkLocator).toBeVisible();
  const inviteLink = (await inviteLinkLocator.textContent())!.trim();

  // Visiting the invite link signed out (fresh context, no cookies) should
  // prompt sign-in/sign-up rather than accepting it silently.
  const guestContext = await context.browser()!.newContext();
  const guestPage = await guestContext.newPage();
  await guestPage.goto(inviteLink);
  await expect(guestPage.getByText(`Join Test Org ${unique}`)).toBeVisible();
  await expect(guestPage.getByRole("link", { name: "Sign in" })).toBeVisible();
  await guestContext.close();
});

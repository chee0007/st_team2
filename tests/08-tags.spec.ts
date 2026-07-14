import { test, expect } from '@playwright/test';
import { setupVirtualAuthenticator, register, openManageTags } from './helpers';

function uniqueUser() {
  return `tagtest_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
}

test.describe('Tag System', () => {
  test.beforeEach(async ({ page }) => {
    await setupVirtualAuthenticator(page);
    await register(page, uniqueUser());
    await page.waitForURL('/');
  });

  test('create a tag via Manage Tags modal and verify it appears in pill selector', async ({ page }) => {
    await openManageTags(page);
    const modal = page.getByRole('dialog');

    await modal.getByPlaceholder('Tag name').fill('Work');
    await modal.getByRole('button', { name: /^Create$/ }).click();

    // Tag appears in the list inside the modal
    await expect(modal.locator('ul').getByText('Work')).toBeVisible();

    await modal.getByRole('button', { name: 'Close' }).click();

    // Tag pill appears below the form
    await expect(page.getByRole('button', { name: 'Work' }).first()).toBeVisible();
  });

  test('edit a tag name/color and verify propagation to todo', async ({ page }) => {
    // Create tag and a todo with it
    await openManageTags(page);
    let modal = page.getByRole('dialog');
    await modal.getByPlaceholder('Tag name').fill('OldName');
    await modal.getByRole('button', { name: /^Create$/ }).click();
    await modal.getByRole('button', { name: 'Close' }).click();

    // Select the tag on the form and add a todo
    await page.getByRole('button', { name: 'OldName' }).first().click();
    await page.getByPlaceholder('Add a new todo…').fill('Tagged Todo');
    await page.getByRole('button', { name: 'Add' }).click();
    await page.waitForSelector('text=Tagged Todo');

    // Now edit the tag name
    await openManageTags(page);
    modal = page.getByRole('dialog');
    await modal.getByRole('button', { name: 'Edit' }).first().click();
    const nameInput = modal.getByPlaceholder('Tag name').first();
    await nameInput.fill('NewName');
    await modal.getByRole('button', { name: /^Save$/ }).click();
    await modal.getByRole('button', { name: 'Close' }).click();

    // The todo card now shows the new tag name
    await expect(page.getByText('NewName').first()).toBeVisible();
    await expect(page.getByText('OldName')).toHaveCount(0);
  });

  test('delete a tag and verify it disappears from todos', async ({ page }) => {
    await openManageTags(page);
    let modal = page.getByRole('dialog');
    await modal.getByPlaceholder('Tag name').fill('ToDelete');
    await modal.getByRole('button', { name: /^Create$/ }).click();
    await modal.getByRole('button', { name: 'Close' }).click();

    // Attach to a todo
    await page.getByRole('button', { name: 'ToDelete' }).first().click();
    await page.getByPlaceholder('Add a new todo…').fill('Todo with tag');
    await page.getByRole('button', { name: 'Add' }).click();
    await page.waitForSelector('text=Todo with tag');

    // Delete the tag
    await openManageTags(page);
    modal = page.getByRole('dialog');
    page.on('dialog', (d) => d.accept());
    await modal.getByRole('button', { name: /^Delete$/ }).first().click();
    await modal.getByRole('button', { name: 'Close' }).click();

    // Tag no longer appears on the todo card
    const todoCard = page.getByRole('article').filter({ hasText: 'Todo with tag' }).first();
    await expect(todoCard.getByRole('button', { name: 'ToDelete' })).toHaveCount(0);
  });

  test('duplicate tag name for same user shows error', async ({ page }) => {
    await openManageTags(page);
    const modal = page.getByRole('dialog');
    await modal.getByPlaceholder('Tag name').fill('DupTag');
    await modal.getByRole('button', { name: /^Create$/ }).click();

    // Try creating again with same name
    await modal.getByPlaceholder('Tag name').fill('DupTag');
    await modal.getByRole('button', { name: /^Create$/ }).click();

    await expect(modal.getByText('A tag with this name already exists')).toBeVisible();
  });

  test('assign two tags to one todo and verify both render', async ({ page }) => {
    // Create two tags
    await openManageTags(page);
    const modal = page.getByRole('dialog');
    await modal.getByPlaceholder('Tag name').fill('Alpha');
    await modal.getByRole('button', { name: /^Create$/ }).click();
    await modal.getByPlaceholder('Tag name').fill('Beta');
    await modal.getByRole('button', { name: /^Create$/ }).click();
    await modal.getByRole('button', { name: 'Close' }).click();

    // Select both tags
    const tagPills = page.locator('form').locator('button', { hasText: /Alpha|Beta/ });
    await tagPills.first().click();
    await tagPills.last().click();

    // Create the todo
    await page.getByPlaceholder('Add a new todo…').fill('Multi-tagged todo');
    await page.getByRole('button', { name: 'Add' }).click();
    await page.waitForSelector('text=Multi-tagged todo');

    // Both tags appear on the todo card
    const todoCard = page.getByRole('article').filter({ hasText: 'Multi-tagged todo' }).first();
    await expect(todoCard.getByText('Alpha')).toBeVisible();
    await expect(todoCard.getByText('Beta')).toBeVisible();
  });

  test('filter by tag shows only matching todos, clear via All Tags', async ({ page }) => {
    // Create two tags and two todos
    await openManageTags(page);
    const modal = page.getByRole('dialog');
    await modal.getByPlaceholder('Tag name').fill('FilterTag');
    await modal.getByRole('button', { name: /^Create$/ }).click();
    await modal.getByRole('button', { name: 'Close' }).click();

    // Todo 1: with FilterTag
    await page.getByRole('button', { name: 'FilterTag' }).first().click();
    await page.getByPlaceholder('Add a new todo…').fill('Todo A - tagged');
    await page.getByRole('button', { name: 'Add' }).click();
    await page.waitForSelector('text=Todo A - tagged');

    // Todo 2: without tag
    await page.getByPlaceholder('Add a new todo…').fill('Todo B - untagged');
    await page.getByRole('button', { name: 'Add' }).click();
    await page.waitForSelector('text=Todo B - untagged');

    // Filter by FilterTag
    await page.getByRole('button', { name: 'FilterTag' }).nth(1).click();

    await expect(page.getByText('Todo A - tagged')).toBeVisible();
    await expect(page.getByText('Todo B - untagged')).toBeHidden();

    // Clear filter via All Tags
    await page.getByRole('button', { name: 'All Tags' }).click();
    await expect(page.getByText('Todo B - untagged')).toBeVisible();
  });
});
